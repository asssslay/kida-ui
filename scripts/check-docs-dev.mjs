#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const components = [
  'reveal',
  'collapse',
  'text-bloom',
  'magnetic',
  'photo-pile',
  'scribble-highlight',
  'sticker-burst',
  'space-type',
  'glow-highlight',
  'image-text',
  'dual-wave',
]
const clientDemos = {
  'space-type': 'space-type-playground',
  'glow-highlight': 'glow-highlight-playground',
  'dual-wave': 'dual-wave-playground',
}
const markers = { 'scribble-highlight': 'scribble', 'glow-highlight': 'glow' }
const docs = join(root, 'apps/docs')
const require = createRequire(join(docs, 'package.json'))
const { dev } = await import(pathToFileURL(require.resolve('astro')).href)
const server = await dev({
  root: docs,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
  // Keep the smoke server's optimizer separate from build, typecheck, and interactive dev.
  vite: { cacheDir: join(docs, 'node_modules/.vite-kida-dev-smoke') },
})

try {
  const origin = `http://127.0.0.1:${server.address.port}`
  const legacyVue = await fetch(`${origin}/docs/vue`, { redirect: 'manual' })
  assert.equal(legacyVue.status, 301, 'The removed Vue overview must redirect')
  assert.equal(
    new URL(legacyVue.headers.get('location'), origin).pathname,
    '/docs/vue/installation',
  )
  for (const path of [
    '/docs',
    '/docs/installation',
    '/docs/vue/installation',
    '/docs/svelte/installation',
    ...components.map((name) => `/docs/${name}`),
    ...components.map((name) => `/docs/vue/${name}`),
    ...components.map((name) => `/docs/svelte/${name}`),
    '/',
  ]) {
    const response = await fetch(`${origin}${path}`)
    const html = await response.text()
    const text = html.replace(/<[^>]+>/g, '')
    assert.equal(response.status, 200, `${path}: development SSR failed`)
    if (path === '/' || path === '/docs') {
      for (const name of components) {
        assert(html.includes(`href="/docs/${name}"`), `${path}: ${name} catalog link is missing`)
        assert(html.includes(`data-component="${name}"`), `${path}: ${name} preview is missing`)
      }
    }
    if (path === '/') {
      assert(
        html.includes(`${components.length} components. No filler.`),
        'The homepage component count does not match the catalog',
      )
    }
    if (path === '/docs/space-type') {
      assert(html.includes('data-kida-space-type'), 'React SpaceType did not render on the server')
      assert(html.includes('space-type-panel'), 'SpaceType customization controls are missing')
      assert(html.includes('/r/space-type.json'), 'SpaceType installation link is missing')
    }
    if (path === '/docs/glow-highlight') {
      assert(html.includes('data-kida-glow'), 'React GlowHighlight did not render on the server')
      assert(html.includes('space-type-panel'), 'GlowHighlight customization controls are missing')
      assert(
        html.includes('data-demo="glow-highlight-finishes"'),
        'GlowHighlight code customization example is missing',
      )
      assert(html.includes('/r/glow-highlight.json'), 'GlowHighlight installation link is missing')
    }
    if (path === '/docs/dual-wave') {
      assert(html.includes('data-kida-dual-wave'), 'React DualWave did not render on the server')
      assert(html.includes('dual-wave-settings'), 'DualWave customization controls are missing')
      assert(html.includes('/r/dual-wave.json'), 'DualWave installation link is missing')
    }
    if (path === '/docs/image-text') {
      assert(html.includes('data-kida-image-text'), 'React ImageText did not render on the server')
      assert(html.includes('/r/image-text.json'), 'ImageText installation link is missing')
      const stage = html.match(/<figure[^>]*data-demo="image-text-basic"[\s\S]*?<\/figure>/)?.[0]
      assert(stage, 'ImageText preview is missing')
      assert(
        !/<(?:span|button)\b/.test(stage),
        'ImageText preview must contain only the white text variant',
      )
    }
    assert(!html.includes('React only'), `${path}: a component is still marked React only`)
    if (path.startsWith('/docs/vue/') && path !== '/docs/vue/installation') {
      const name = path.split('/').at(-1)
      assert(html.includes(`data-framework="vue"`), `${path}: Vue distribution is missing`)
      assert(html.includes(`/r/vue/${name}.json`), `${path}: incorrect registry command`)
      const marker = markers[name] ?? name
      if (name === 'collapse') {
        assert(html.includes('aria-expanded="false"'), `${path}: Collapse must start closed`)
      } else {
        assert(
          html.includes(`data-kida-${marker}`),
          `${path}: Vue demo did not render on the server`,
        )
      }
      assert(
        html.includes(`aria-label="Documentation framework"`),
        `${path}: framework switch is missing`,
      )
      assert(
        text.includes('npx shadcn-vue@2.8.2 add') && !text.includes('npx shadcn@latest add'),
        `${path}: React installation leaked into Vue documentation`,
      )
    }
    if (path === '/docs/svelte/installation') {
      assert(
        text.includes('npx shadcn-svelte@1.8.0 add') && html.includes('/r/svelte/text-bloom.json'),
        `${path}: Svelte installation command is missing`,
      )
    }
    if (path.startsWith('/docs/svelte/') && path !== '/docs/svelte/installation') {
      const name = path.split('/').at(-1)
      assert(html.includes(`data-framework="svelte"`), `${path}: Svelte distribution is missing`)
      assert(
        text.includes(`npx shadcn-svelte@1.8.0 add`) && html.includes(`/r/svelte/${name}.json`),
        `${path}: incorrect registry command`,
      )
      const marker = markers[name] ?? name
      if (name === 'collapse') {
        assert(html.includes('aria-expanded="false"'), `${path}: Collapse must start closed`)
      } else {
        assert(
          html.includes(`data-kida-${marker}`),
          `${path}: Svelte demo did not render on the server`,
        )
      }
      assert(
        !text.includes('npx shadcn@latest add') && !text.includes('npx shadcn-vue'),
        `${path}: another framework's installation leaked into Svelte documentation`,
      )
    }
    assert(!html.includes('Vue (experimental)'), `${path}: the removed overview is still linked`)
  }
  for (const name of ['registry', ...components]) {
    const response = await fetch(`${origin}/r/vue/${name}.json`)
    assert.equal(response.status, 200, `Vue ${name} registry is missing`)
    assert(response.headers.get('content-type')?.includes('application/json'))
    const payload = await response.json()
    if (name !== 'registry')
      assert(
        payload.files.some((file) => file.path.endsWith(`${name}.vue`)),
        `${name}: Vue entry is missing`,
      )
  }
  for (const name of ['registry', ...components]) {
    const response = await fetch(`${origin}/r/svelte/${name}.json`)
    assert.equal(response.status, 200, `Svelte ${name} registry is missing`)
    assert(response.headers.get('content-type')?.includes('application/json'))
    const payload = await response.json()
    if (name !== 'registry')
      assert(
        payload.files.some((file) => file.target === `kida/${name}.svelte`),
        `${name}: Svelte entry is missing`,
      )
  }
  for (const name of components) {
    for (const extension of ['vue', 'svelte']) {
      const response = await fetch(
        `${origin}/src/demos/${clientDemos[name] ?? `${name}-basic`}.${extension}`,
      )
      const source = await response.text()
      assert.equal(response.status, 200, `${extension} ${name} client module failed to compile`)
      assert(
        !source.includes('$RefreshSig$'),
        `React Refresh leaked into the ${extension} ${name} client module`,
      )
    }
  }
  console.log(
    '✓ development SSR renders React, Vue, and Svelte docs and the home page; Vue and Svelte client modules compile without React Refresh',
  )
} finally {
  await server.stop()
}
