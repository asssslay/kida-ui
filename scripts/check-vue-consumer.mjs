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
const demos = [
  'reveal-basic',
  'reveal-options',
  'text-bloom-characters',
  'scribble-highlight-circle',
  'collapse-basic',
  'text-bloom-basic',
  'magnetic-basic',
  'photo-pile-basic',
  'scribble-highlight-basic',
  'sticker-burst-basic',
  'image-text-basic',
  'space-type-basic',
  'space-type-playground',
  'glow-highlight-playground',
  'glow-highlight-finishes',
  'glow-highlight-after-dark',
  'dual-wave-playground',
]

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

  // The exact files displayed as Vue documentation are compiled against packed declarations,
  // with the local styles, data, and fonts they import.
  const copied = new Set()
  async function copyDemoFile(file) {
    if (copied.has(file)) return
    copied.add(file)
    const source = await readFile(join(root, 'apps/docs/src/demos', file), 'utf8')
    await write(file, source)
    for (const [, specifier] of source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
      if (specifier.startsWith('./'))
        await copyDemoFile(
          /\.\w+$/.test(specifier) ? specifier.slice(2) : `${specifier.slice(2)}.ts`,
        )
      else if (!/^(?:vue|@kida-ui\/)/.test(specifier) && !copied.has(specifier)) {
        copied.add(specifier)
        await linkDependency(specifier)
      }
    }
  }
  for (const name of demos) await copyDemoFile(`${name}.vue`)
  for (const name of ['flower', 'sunset', 'pool']) {
    await write(
      `public/demo/photo-pile-${name}.svg`,
      await readFile(join(root, 'apps/docs/public/demo', `photo-pile-${name}.svg`), 'utf8'),
    )
  }
  await write(
    'main.ts',
    `import '@kida-ui/styles/kida.css'
import { createApp, h } from 'vue'
${demos.map((name, index) => `import Demo${index} from './${name}.vue'`).join('\n')}
createApp({ render: () => h('main', [${demos.map((_, index) => `h(Demo${index})`).join(', ')}]) }).mount('#app')
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
    `import { Reveal, Collapse, TextBloom, Magnetic, PhotoPile, ScribbleHighlight, StickerBurst, ImageText, SpaceType, GlowHighlight, DualWave, type RevealProps, type TextBloomProps, type PhotoPilePhoto, type KidaElement, type DualWaveItem, type GlowHighlightPalette, type SpaceTypeGeometry } from '@kida-ui/vue'
const options: RevealProps = { once: false, x: 0 }
const bloom: TextBloomProps = { text: 'Typed text', by: 'character', once: false }
const photo: PhotoPilePhoto = { id: 'photo', src: '/photo.png', alt: 'Sample', imageProps: { loading: 'lazy', width: 80 } }
const element: KidaElement = { element: null }
const item: DualWaveItem = { id: 'item', title: 'Title', subtitle: 'Credit', src: '/photo.png', alt: 'Sample', imageProps: { loading: 'lazy' } }
const palette: GlowHighlightPalette = 'after-dark'
const geometry: SpaceTypeGeometry | null = null
// @ts-expect-error ImageText requires plain text.
const invalidImageText: InstanceType<typeof ImageText>['$props'] = { image: '/photo.png', text: 12 }
// @ts-expect-error GlowHighlight palettes are named color sets.
const invalidPalette: InstanceType<typeof GlowHighlight>['$props'] = { palette: 'neon' }
// @ts-expect-error DualWave items require titles, credits, and alt text.
const invalidItems: InstanceType<typeof DualWave>['$props'] = { items: [{ id: 'item', src: '/photo.png' }] }
// @ts-expect-error SpaceType rows are numeric.
const invalidRows: InstanceType<typeof SpaceType>['$props'] = { text: 'Orbit', rows: 'two' }
// @ts-expect-error Published component declarations must reject invalid motion options.
const invalid: InstanceType<typeof Reveal>['$props'] = { duration: 'slow' }
// @ts-expect-error TextBloom requires plain text.
const invalidText: InstanceType<typeof TextBloom>['$props'] = { text: 12 }
// @ts-expect-error PhotoPile requires stable photo identifiers and alt text.
const invalidPhoto: InstanceType<typeof PhotoPile>['$props'] = { photos: [{ src: '/photo.png' }] }
// @ts-expect-error StickerBurst seeds are numeric.
const invalidSeed: InstanceType<typeof StickerBurst>['$props'] = { seed: 'random' }
void [Reveal, Collapse, TextBloom, Magnetic, PhotoPile, ScribbleHighlight, StickerBurst, ImageText, SpaceType, GlowHighlight, DualWave, options, bloom, photo, element, item, palette, geometry]
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
  await access(join(fixture, 'dist/demo/photo-pile-flower.svg'))
  await write(
    'server.mjs',
    `import assert from 'node:assert/strict'
import * as Kida from '@kida-ui/vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
assert.equal(typeof window, 'undefined')
assert.deepEqual(Object.keys(Kida).sort(), ['Reveal', 'Collapse', 'TextBloom', 'Magnetic', 'PhotoPile', 'ScribbleHighlight', 'StickerBurst', 'ImageText', 'SpaceType', 'GlowHighlight', 'DualWave'].sort())
const render = () => h('main', [
  h(Kida.Reveal, {}, () => 'Reveal content'),
  h(Kida.Collapse, { open: true }, () => 'Collapse content'),
  h(Kida.TextBloom, { text: 'Bloom content' }),
  h(Kida.Magnetic, {}, () => h('button', 'Magnetic action')),
  h(Kida.PhotoPile, { photos: [{ id: 'photo', src: '/photo.png', alt: 'Sample' }] }),
  h(Kida.ScribbleHighlight, {}, () => 'Highlight content'),
  h(Kida.StickerBurst, {}, () => h('button', 'Celebrate')),
  h(Kida.ImageText, { image: '/photo.png', text: 'Image content' }),
  h(Kida.SpaceType, { text: 'Orbit content' }),
  h(Kida.GlowHighlight, {}, () => 'Glow content'),
  h(Kida.DualWave, { items: [{ id: 'item', title: 'Wave title', subtitle: 'Wave credit', src: '/photo.png', alt: 'Sample' }] }),
])
const first = await renderToString(createSSRApp({ render }))
assert.equal(await renderToString(createSSRApp({ render })), first)
assert.ok(first.includes('translate3d(0px, 8px, 0) scale(1)'))
assert.ok(first.includes('Collapse content'))
for (const marker of ['text-bloom', 'magnetic', 'photo-pile', 'scribble', 'sticker-burst', 'image-text', 'space-type', 'glow', 'dual-wave']) assert.ok(first.includes('data-kida-' + marker))
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
