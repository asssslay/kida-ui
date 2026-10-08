#!/usr/bin/env node

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))
const vueDirectory = join(root, 'packages/vue')
const fixture = await mkdtemp(join(tmpdir(), 'kida-vue-consumer-'))

async function write(relative, content) {
  const path = join(fixture, relative)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

async function linkDependency(name) {
  for (const base of [vueDirectory, join(root, 'packages/motion'), join(root, 'apps/docs')]) {
    const source = join(base, 'node_modules', name)
    try {
      await access(source)
    } catch {
      continue
    }
    const target = join(fixture, 'node_modules', name)
    await mkdir(dirname(target), { recursive: true })
    await symlink(await realpath(source), target, 'dir')
    return
  }
  throw new Error(`Vue consumer fixture cannot find ${name}`)
}

try {
  const archives = join(fixture, 'archives')
  await mkdir(archives)
  for (const name of ['motion', 'styles', 'vue']) {
    const directory = join(root, 'packages', name)
    const { version } = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    await run('pnpm', ['pack', '--pack-destination', archives], {
      cwd: directory,
    })
    const destination = join(fixture, 'node_modules/@kida-ui', name)
    await mkdir(destination, { recursive: true })
    await run('tar', [
      '-xzf',
      join(archives, `kida-ui-${name}-${version}.tgz`),
      '--strip-components=1',
      '-C',
      destination,
    ])
    const manifest = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'))
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      assert(!version.startsWith('workspace:'), `${dependency} leaked a workspace version`)
      if (!dependency.startsWith('@kida-ui/')) await linkDependency(dependency)
    }
  }
  await linkDependency('vue')
  await linkDependency('@vue/server-renderer')
  await write('package.json', JSON.stringify({ private: true, type: 'module' }))
  await write('env.d.ts', "declare module '*.css'\n")

  // The exact files displayed as Vue documentation are compiled against packed declarations.
  for (const name of ['reveal-basic', 'collapse-basic']) {
    await write(
      `${name}.vue`,
      await readFile(join(root, 'apps/docs/src/demos', `${name}.vue`), 'utf8'),
    )
  }
  await write(
    'main.ts',
    `import '@kida-ui/styles/kida.css'
import { createApp, h } from 'vue'
import RevealDemo from './reveal-basic.vue'
import CollapseDemo from './collapse-basic.vue'
createApp({ render: () => h('main', [h(RevealDemo), h(CollapseDemo)]) }).mount('#app')
`,
  )
  await write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
      },
      include: ['*.ts', '*.vue'],
    }),
  )
  await run(
    join(vueDirectory, 'node_modules/.bin/vue-tsc'),
    ['--noEmit', '-p', join(fixture, 'tsconfig.json')],
    { cwd: fixture },
  )

  // Also resolve emitted declarations with NodeNext; Vite-specific source aliases are absent.
  await write(
    'types.mts',
    `import { Reveal, Collapse, type RevealProps, type KidaElement } from '@kida-ui/vue'
const options: RevealProps = { once: false, x: 0 }
const element: KidaElement = { element: null }
// @ts-expect-error Published component declarations must reject invalid motion options.
const invalid: InstanceType<typeof Reveal>['$props'] = { duration: 'slow' }
void [Reveal, Collapse, options, element]
`,
  )
  await write(
    'tsconfig.nodenext.json',
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2022',
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
      },
      files: ['types.mts'],
    }),
  )
  await run(
    join(vueDirectory, 'node_modules/.bin/tsc'),
    ['-p', join(fixture, 'tsconfig.nodenext.json')],
    { cwd: fixture },
  )

  const { build } = await import(
    pathToFileURL(join(vueDirectory, 'node_modules/vite/dist/node/index.js')).href
  )
  const { default: vue } = await import(
    pathToFileURL(join(vueDirectory, 'node_modules/@vitejs/plugin-vue/dist/index.mjs')).href
  )
  await build({
    root: fixture,
    configFile: false,
    logLevel: 'silent',
    plugins: [vue()],
    build: { lib: { entry: join(fixture, 'main.ts'), formats: ['es'], fileName: 'consumer' } },
  })
  await write(
    'server.mjs',
    `import assert from 'node:assert/strict'
import { Reveal, Collapse } from '@kida-ui/vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
assert.equal(typeof window, 'undefined')
const render = () => h('main', [h(Reveal, {}, () => 'Reveal content'), h(Collapse, { open: true }, () => 'Collapse content')])
const first = await renderToString(createSSRApp({ render }))
assert.equal(await renderToString(createSSRApp({ render })), first)
assert.ok(first.includes('translate3d(0px, 8px, 0) scale(1)'))
assert.ok(first.includes('Collapse content'))
assert.ok(!first.includes('undefined'))
`,
  )
  await run(process.execPath, [join(fixture, 'server.mjs')], { cwd: fixture })
  console.log(
    '✓ packed Vue adapter, motion, and styles pass isolated consumer typechecks, production bundling, and Node SSR; checked demos match displayed source',
  )
} finally {
  await rm(fixture, { recursive: true, force: true })
}
