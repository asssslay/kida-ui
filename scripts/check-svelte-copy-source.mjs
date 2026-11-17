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
const temporary = await mkdtemp(join(tmpdir(), 'kida-svelte-copy-'))
const run = promisify(execFile)
const svelteModules = join(root, 'packages/svelte/node_modules')
const { build } = await import(pathToFileURL(join(svelteModules, 'vite/dist/node/index.js')).href)
const { svelte } = await import(
  pathToFileURL(join(svelteModules, '@sveltejs/vite-plugin-svelte/src/index.js')).href
)
const { items, registry } = await buildRegistry('svelte')
const expectedNames = items.map((item) => item.name).sort()
for (const [directory, suffix] of [
  ['apps/docs/src/examples/quick-start', '-example.svelte'],
  ['apps/docs/src/content/svelte-components', '.mdx'],
]) {
  const names = (await readdir(join(root, directory)))
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length))
    .sort()
  assert.deepEqual(names, expectedNames, `${directory}: catalog coverage differs`)
}
for (const item of items) {
  const doc = await readFile(
    join(root, `apps/docs/src/content/svelte-components/${item.name}.mdx`),
    'utf8',
  )
  for (const component of ['Distribution', 'QuickStart'])
    assert(
      doc.includes(`<${component} name="${item.name}" framework="svelte" />`),
      `${item.name}: Svelte docs must render the Svelte ${component}`,
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
        join(root, `apps/docs/src/examples/quick-start/${item.name}-example.svelte`),
        'utf8',
      ),
    ]),
  ),
)
const installedManifest = async (base, name) =>
  JSON.parse(await readFile(join(root, base, 'node_modules', name, 'package.json'), 'utf8'))
const svelteVersion = (await installedManifest('packages/svelte', 'svelte')).version
const overrides = Object.fromEntries(
  await Promise.all(
    ['motion', '@zag-js/presence', '@zag-js/svelte'].map(async (name) => [
      name,
      (await installedManifest(name === 'motion' ? 'packages/motion' : 'packages/svelte', name))
        .version,
    ]),
  ),
)
const unexpectedRequests = []
const server = createServer((request, response) => {
  const name = /^\/r\/svelte\/([^/]+)\.json$/.exec(request.url ?? '')?.[1]
  const value = /^\/r\/svelte\/styles\/[^/]+\/index\.json$/.test(request.url ?? '')
    ? []
    : name === 'registry'
      ? registry
      : items.find((candidate) => candidate.name === name)
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

async function consumer(selected, { lib, uiPath }) {
  const label = selected.length === 1 ? selected[0].name : `combined-${lib.slice(0, 1)}`
  const directory = join(temporary, label.replace('#', 'hash').replace('$', 'dollar'))
  const usesImports = lib === '#lib'
  await write(
    directory,
    'package.json',
    JSON.stringify({
      name: 'kida-svelte-copy-consumer',
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.25.0',
      ...(usesImports ? { imports: { '#lib/*': './src/lib/*' } } : {}),
      dependencies: { svelte: svelteVersion },
      devDependencies: { tailwindcss: '4.3.3', typescript: '6.0.3' },
      pnpm: { overrides },
    }),
  )
  await write(
    directory,
    'components.json',
    JSON.stringify({
      $schema: 'https://shadcn-svelte.com/schema.json',
      tailwind: { css: 'src/app.css', baseColor: 'neutral' },
      aliases: {
        lib,
        components: `${lib}/components`,
        utils: `${lib}/utils`,
        ui: `${lib}/${uiPath}`,
        hooks: `${lib}/hooks`,
      },
      typescript: true,
      registry: `${origin}/r/svelte`,
    }),
  )
  await write(directory, 'src/app.css', '')
  await write(
    directory,
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        verbatimModuleSyntax: true,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        types: ['svelte'],
        ...(usesImports ? {} : { paths: { $lib: ['./src/lib'], '$lib/*': ['./src/lib/*'] } }),
      },
      include: ['src/**/*.ts', 'src/**/*.svelte'],
    }),
  )
  await write(directory, 'src/env.d.ts', "declare module '*.css'\n")
  await write(
    directory,
    'index.html',
    '<div id="app"></div><script type="module" src="/src/main.ts"></script>',
  )
  await run('pnpm', ['install', '--prefer-offline'], { cwd: directory, timeout: 120_000 })
  try {
    await run(
      process.execPath,
      [
        join(root, 'node_modules/shadcn-svelte/dist/index.mjs'),
        'add',
        ...selected.map((item) => `${origin}/r/svelte/${item.name}.json`),
        '--yes',
        '--overwrite',
        '--cwd',
        directory,
      ],
      {
        cwd: directory,
        timeout: 120_000,
        env: { ...process.env, CI: 'true', npm_config_user_agent: 'pnpm/10.25.0' },
        maxBuffer: 1024 * 1024,
      },
    )
  } catch (error) {
    throw new Error(
      `Svelte CLI installation failed (${selected.map((item) => item.name).join(', ')}):\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      { cause: error },
    )
  }
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  assert(!Object.keys(manifest.dependencies).some((name) => name.startsWith('@kida-ui/')))
  const uiDirectory = join(directory, 'src/lib', uiPath)
  const expected = new Map()
  for (const item of selected) {
    for (const file of item.files) {
      const relative = file.target
      const prior = expected.get(relative)
      assert(
        prior === undefined || prior === file.content,
        `${item.name}: conflicting copied target ${relative}`,
      )
      expected.set(relative, file.content)
      const content = await readFile(join(uiDirectory, relative), 'utf8')
      assert.equal(content, file.content, `${relative}: the CLI changed copied source`)
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
      source.includes(`$lib/components/ui/kida/${item.name}.svelte`),
      `${item.name}: incorrect quick-start import`,
    )
    source = source.replaceAll('$lib/components/ui/', `${lib}/${uiPath}/`)
    await write(directory, `src/examples/${item.name}.svelte`, source)
  }
  const actual = (await readdir(join(uiDirectory, 'kida'), { recursive: true }))
    .filter((path) => /\.(svelte|ts|css)$/.test(path))
    .map((path) => `kida/${path}`)
  assert.deepEqual(actual.sort(), [...expected.keys()].sort())
  await write(
    directory,
    'src/App.svelte',
    `<script lang="ts">\n${selected
      .map((item, index) => `import Demo${index} from './examples/${item.name}.svelte'`)
      .join(
        '\n',
      )}\n</script>\n\n<main>${selected.map((_, index) => `<Demo${index} />`).join('')}</main>\n`,
  )
  await write(
    directory,
    'src/main.ts',
    "import { mount } from 'svelte'\nimport App from './App.svelte'\n\nmount(App, { target: document.getElementById('app') as HTMLElement })\n",
  )
  const hasCollapse = selected.some((item) => item.name === 'collapse')
  if (hasCollapse)
    await write(
      directory,
      'src/CollapseProbe.svelte',
      `<script lang="ts">\nimport Collapse from '${lib}/${uiPath}/kida/collapse.svelte'\n</script>\n\n<Collapse open={true}><p>Copied Collapse content</p></Collapse>\n`,
    )
  await write(
    directory,
    'src/server.ts',
    `import { render as renderComponent } from 'svelte/server'\nimport App from './App.svelte'\n${hasCollapse ? "import CollapseProbe from './CollapseProbe.svelte'\nexport const renderOpenCollapse = () => renderComponent(CollapseProbe).body\n" : ''}export const render = () => renderComponent(App).body\n`,
  )
  if (selected.length === items.length) {
    await write(
      directory,
      'src/types-check.ts',
      `import type { ComponentProps } from 'svelte'
import type TextBloom from '${lib}/${uiPath}/kida/text-bloom.svelte'
import type PhotoPile from '${lib}/${uiPath}/kida/photo-pile.svelte'
import type { TextBloomVoice } from '${lib}/${uiPath}/kida/text-bloom.types.js'
const voice: TextBloomVoice = 'pop'
// @ts-expect-error Copied TextBloom requires plain text.
const invalidText: ComponentProps<typeof TextBloom> = { text: 12 }
// @ts-expect-error Copied PhotoPile requires stable photo IDs and alt text.
const invalidPhoto: ComponentProps<typeof PhotoPile> = { photos: [{ src: '/photo.png' }] }
void [voice, invalidText, invalidPhoto]
`,
    )
  }
  try {
    await run(
      join(svelteModules, '.bin/svelte-check'),
      ['--workspace', directory, '--tsconfig', './tsconfig.json', '--fail-on-warnings'],
      { cwd: directory, maxBuffer: 4 * 1024 * 1024 },
    )
  } catch (error) {
    throw new Error(
      `svelte-check failed (${label}):\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      {
        cause: error,
      },
    )
  }
  const config = {
    root: directory,
    configFile: false,
    logLevel: 'silent',
    plugins: [svelte({ configFile: false })],
    resolve: usesImports ? {} : { alias: { $lib: join(directory, 'src/lib') } },
  }
  await build(config)
  await build({
    ...config,
    build: {
      ssr: join(directory, 'src/server.ts'),
      outDir: 'server',
      rollupOptions: { output: { entryFileNames: 'entry.mjs' } },
    },
    ssr: { noExternal: true },
  })
  const markers = selected
    .filter((item) => item.name !== 'collapse')
    .map(
      (item) =>
        ({ 'scribble-highlight': 'scribble', 'glow-highlight': 'glow' })[item.name] ?? item.name,
    )
  await write(
    directory,
    'check-server.mjs',
    `import assert from 'node:assert/strict'\nimport * as server from './server/entry.mjs'\nconst { render } = server\nassert.equal(typeof window, 'undefined')\nconst first = await render()\nassert.equal(first, await render())\nfor (const marker of ${JSON.stringify(markers)}) assert(first.includes('data-kida-' + marker), marker)\n${hasCollapse ? `assert(first.includes('aria-expanded="false"'))\nassert(!first.includes('data-kida-collapse'))\nconst opened = await server.renderOpenCollapse()\nassert.equal(opened, await server.renderOpenCollapse())\nassert(opened.includes('data-kida-collapse'))\nassert(opened.includes('Copied Collapse content'))\n` : ''}`,
  )
  await run(process.execPath, [join(directory, 'check-server.mjs')], { cwd: directory })
  console.log(
    `✓ Svelte CLI installs, checks, bundles, and server-renders ${selected.map((item) => item.name).join(', ')} (${lib}/${uiPath})`,
  )
}

try {
  if (!process.argv.includes('--combined-only'))
    for (const item of items) await consumer([item], { lib: '$lib', uiPath: 'components/ui' })
  await consumer(items, { lib: '$lib', uiPath: 'elements' })
  await consumer(items, { lib: '#lib', uiPath: 'components/ui' })
  assert.deepEqual(unexpectedRequests, [], 'CLI requested an unexpected registry resource')
} finally {
  await new Promise((resolve) => server.close(resolve))
  await rm(temporary, { recursive: true, force: true })
}
