#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { buildRegistry } from './build-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'kida-vue-copy-'))
const run = promisify(execFile)
const { build } = await import(
  pathToFileURL(join(root, 'packages/vue/node_modules/vite/dist/node/index.js')).href
)
const { default: vue } = await import(
  pathToFileURL(join(root, 'packages/vue/node_modules/@vitejs/plugin-vue/dist/index.mjs')).href
)
const { items, registry } = await buildRegistry('vue')
const expectedNames = items.map((item) => item.name).sort()
for (const [directory, suffix] of [
  ['apps/docs/src/examples/quick-start', '.vue'],
  ['apps/docs/src/content/vue-components', '.mdx'],
]) {
  const names = (await readdir(join(root, directory)))
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length).replace(/-example$/, ''))
    .sort()
  assert.deepEqual(names, expectedNames, `${directory}: catalog coverage differs`)
}
for (const item of items) {
  const doc = await readFile(
    join(root, `apps/docs/src/content/vue-components/${item.name}.mdx`),
    'utf8',
  )
  for (const component of ['Distribution', 'QuickStart'])
    assert(
      doc.includes(`<${component} name="${item.name}" framework="vue" />`),
      `${item.name}: Vue docs must render the Vue ${component}`,
    )
  for (const heading of [
    'Quick start',
    'Customization',
    'API',
    'Accessibility and input behavior',
    'Troubleshooting',
  ])
    assert(doc.includes(`## ${heading}`), `${item.name}: missing ${heading}`)
}
const examples = new Map(
  await Promise.all(
    items.map(async (item) => [
      item.name,
      await readFile(
        join(root, `apps/docs/src/examples/quick-start/${item.name}-example.vue`),
        'utf8',
      ),
    ]),
  ),
)
const installedManifest = async (base, name) =>
  JSON.parse(await readFile(join(root, base, 'node_modules', name, 'package.json'), 'utf8'))
const vueVersion = (await installedManifest('packages/vue', 'vue')).version
const overrides = Object.fromEntries(
  await Promise.all(
    ['motion', '@zag-js/presence', '@zag-js/vue'].map(async (name) => [
      name,
      (await installedManifest(name === 'motion' ? 'packages/motion' : 'packages/vue', name))
        .version,
    ]),
  ),
)
const unexpectedRequests = []
const server = createServer((request, response) => {
  const name = /^\/r\/vue\/([^/]+)\.json$/.exec(request.url ?? '')?.[1]
  const item = name === 'registry' ? registry : items.find((candidate) => candidate.name === name)
  // The upstream CLI requests its icon catalog even when a component has no icons.
  const value = request.url === '/r/icons/index.json' ? {} : item
  if (!value) unexpectedRequests.push(request.url)
  response.writeHead(value ? 200 : 404, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(value ?? { error: 'Not found' }))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

async function write(directory, path, content) {
  const destination = join(directory, path)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, content)
}

async function consumer(selected, uiPath) {
  const directory = join(temporary, selected.length === 1 ? selected[0].name : 'combined')
  await write(
    directory,
    'package.json',
    JSON.stringify({
      name: 'kida-vue-copy-consumer',
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.25.0',
      dependencies: { vue: vueVersion },
      devDependencies: { typescript: '6.0.3' },
      pnpm: { overrides },
    }),
  )
  // A configured Vue project, with no workspace aliases or Kida packages.
  await write(
    directory,
    'components.json',
    JSON.stringify({
      style: 'new-york',
      typescript: true,
      tailwind: { css: 'src/style.css', baseColor: '', cssVariables: true },
      aliases: {
        components: '@/components',
        ui: `@/${uiPath}`,
        utils: '@/lib/utils',
        lib: '@/lib',
        composables: '@/composables',
      },
    }),
  )
  await write(directory, 'src/style.css', '')
  await write(
    directory,
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src/**/*.ts', 'src/**/*.vue'],
    }),
  )
  await write(directory, 'vite.config.ts', 'export default {}\n')
  await write(directory, 'src/env.d.ts', "declare module '*.css'\n")
  await write(
    directory,
    'index.html',
    '<div id="app"></div><script type="module" src="/src/main.ts"></script>',
  )
  try {
    await run(
      process.execPath,
      [
        join(root, 'node_modules/shadcn-vue/dist/index.js'),
        'add',
        ...selected.map((item) => `${origin}/r/vue/${item.name}.json`),
        '--yes',
        '--overwrite',
        '--silent',
        '--cwd',
        directory,
      ],
      {
        cwd: directory,
        timeout: 120_000,
        env: {
          ...process.env,
          CI: 'true',
          REGISTRY_URL: `${origin}/r`,
          npm_config_user_agent: 'pnpm/10.25.0',
        },
        maxBuffer: 1024 * 1024,
      },
    )
  } catch (error) {
    throw new Error(
      `Vue CLI installation failed (${selected.map((item) => item.name).join(', ')}):\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      { cause: error },
    )
  }
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  assert(!Object.keys(manifest.dependencies).some((name) => name.startsWith('@kida-ui/')))
  const expected = new Map()
  for (const item of selected) {
    for (const file of item.files) {
      const relative = file.path.replace('registry/vue/', '')
      const prior = expected.get(relative)
      assert(
        prior === undefined || prior === file.content,
        `${item.name}: conflicting copied target ${relative}`,
      )
      expected.set(relative, file.content)
      const content = await readFile(join(directory, 'src', uiPath, relative), 'utf8')
      assert(
        !/(?:from\s*|import\s*\(?\s*)['"]@kida-ui\//.test(content),
        `${relative}: unpublished dependency survived installation`,
      )
    }
    for (const specifier of item.dependencies) {
      const name = specifier.slice(0, specifier.lastIndexOf('@'))
      assert(manifest.dependencies[name], `${item.name}: CLI did not install ${name}`)
    }
    let source = examples.get(item.name)
    assert(
      source.includes(`@/components/ui/kida/${item.name}.vue`),
      `${item.name}: incorrect quick-start import`,
    )
    source = source.replaceAll('@/components/ui/', `@/${uiPath}/`)
    await write(directory, `src/examples/${item.name}.vue`, source)
  }
  const actual = (await readdir(join(directory, 'src', uiPath, 'kida'), { recursive: true }))
    .filter((path) => /\.(vue|ts|css)$/.test(path))
    .map((path) => `kida/${path}`)
  assert.deepEqual(actual.sort(), [...expected.keys()].sort())
  const imports = selected
    .map((item, index) => `import Demo${index} from './examples/${item.name}.vue'`)
    .join('\n')
  const content = `h('main', [${selected.map((_, index) => `h(Demo${index})`).join(', ')}])`
  await write(
    directory,
    'src/main.ts',
    `import { createApp, h } from 'vue'\n${imports}\ncreateApp({ render: () => ${content} }).mount('#app')\n`,
  )
  const hasCollapse = selected.some((item) => item.name === 'collapse')
  await write(
    directory,
    'src/server.ts',
    `import { createSSRApp, h } from 'vue'\nimport { renderToString } from 'vue/server-renderer'\n${imports}\n${hasCollapse ? `import CollapseProbe from '@/${uiPath}/kida/collapse.vue'\nexport const renderOpenCollapse = () => renderToString(createSSRApp({ render: () => h(CollapseProbe, { open: true }, () => h('p', 'Copied Collapse content')) }))\n` : ''}export const render = () => renderToString(createSSRApp({ render: () => ${content} }))\n`,
  )
  if (selected.length === items.length) {
    await write(
      directory,
      'src/types-check.ts',
      `import TextBloom from '@/${uiPath}/kida/text-bloom.vue'
import PhotoPile from '@/${uiPath}/kida/photo-pile.vue'
import type { TextBloomVoice } from '@/${uiPath}/kida/text-bloom.types'
const voice: TextBloomVoice = 'pop'
// @ts-expect-error Copied TextBloom requires plain text.
const invalidText: InstanceType<typeof TextBloom>['$props'] = { text: 12 }
// @ts-expect-error Copied PhotoPile requires stable photo IDs and alt text.
const invalidPhoto: InstanceType<typeof PhotoPile>['$props'] = { photos: [{ src: '/photo.png' }] }
void voice
`,
    )
  }
  await run(
    join(root, 'packages/vue/node_modules/.bin/vue-tsc'),
    ['--noEmit', '-p', join(directory, 'tsconfig.json')],
    { cwd: directory },
  )
  const config = {
    root: directory,
    configFile: false,
    logLevel: 'silent',
    plugins: [vue()],
    resolve: { alias: { '@': join(directory, 'src') } },
  }
  await build(config)
  await build({
    ...config,
    build: {
      ssr: join(directory, 'src/server.ts'),
      outDir: 'server',
      rollupOptions: { output: { entryFileNames: 'entry.mjs' } },
    },
  })
  await write(
    directory,
    'check-server.mjs',
    `import assert from 'node:assert/strict'\nimport * as server from './server/entry.mjs'\nconst { render } = server\nassert.equal(typeof window, 'undefined')\nconst first = await render()\nassert.equal(first, await render())\nfor(const marker of ${JSON.stringify(selected.filter((item) => item.name !== 'collapse').map((item) => ({ 'scribble-highlight': 'scribble' })[item.name] ?? item.name))}) assert(first.includes('data-kida-' + marker), marker)\n${hasCollapse ? `assert(first.includes('aria-expanded="false"'))\nassert(!first.includes('data-kida-collapse'))\nconst opened = await server.renderOpenCollapse()\nassert.equal(opened, await server.renderOpenCollapse())\nassert(opened.includes('data-kida-collapse'))\nassert(opened.includes('Copied Collapse content'))\n` : ''}`,
  )
  await run(process.execPath, [join(directory, 'check-server.mjs')], { cwd: directory })
  console.log(
    `✓ Vue CLI installs, typechecks, bundles, and server-renders ${selected.map((item) => item.name).join(', ')} (${uiPath})`,
  )
}

try {
  if (!process.argv.includes('--combined-only'))
    for (const item of items) await consumer([item], 'components/ui')
  await consumer(items, 'elements')
  assert.deepEqual(unexpectedRequests, [], 'CLI requested an unexpected registry resource')
} finally {
  await new Promise((resolve) => server.close(resolve))
  await rm(temporary, { recursive: true, force: true })
}
