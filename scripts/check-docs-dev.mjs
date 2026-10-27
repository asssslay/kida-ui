#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const vueComponents = [
  'reveal',
  'collapse',
  'text-bloom',
  'magnetic',
  'photo-pile',
  'scribble-highlight',
  'sticker-burst',
]
const components = [...vueComponents, 'space-type', 'image-text']
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
    ...components.map((name) => `/docs/${name}`),
    ...vueComponents.map((name) => `/docs/vue/${name}`),
    '/',
  ]) {
    const response = await fetch(`${origin}${path}`)
    const html = await response.text()
    assert.equal(response.status, 200, `${path}: development SSR failed`)
    if (path === '/' || path === '/docs') {
      assert(html.includes('href="/docs/space-type"'), `${path}: SpaceType catalog link is missing`)
      assert(html.includes('data-component="space-type"'), `${path}: SpaceType preview is missing`)
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
      assert(html.includes('React only'), 'SpaceType framework availability is missing')
      assert(
        !html.includes('href="/docs/vue/space-type"'),
        'SpaceType links to an unavailable adapter',
      )
    }
    if (path === '/docs/image-text') {
      assert(html.includes('data-kida-image-text'), 'React ImageText did not render on the server')
      assert(html.includes('/r/image-text.json'), 'ImageText installation link is missing')
      assert(html.includes('React only'), 'ImageText framework availability is missing')
      assert(
        !html.includes('href="/docs/vue/image-text"'),
        'ImageText links to an unavailable adapter',
      )
      const stage = html.match(/<figure[^>]*data-demo="image-text-basic"[\s\S]*?<\/figure>/)?.[0]
      assert(stage, 'ImageText preview is missing')
      assert(
        !/<(?:span|button)\b/.test(stage),
        'ImageText preview must contain only the white text variant',
      )
    }
    if (path.startsWith('/docs/vue/')) {
      assert(
        !html.includes('href="/docs/vue/space-type"'),
        `${path}: unavailable Vue component in navigation`,
      )
    }
    if (path.startsWith('/docs/vue/') && path !== '/docs/vue/installation') {
      const name = path.split('/').at(-1)
      assert(html.includes(`data-framework="vue"`), `${path}: Vue distribution is missing`)
      assert(html.includes(`/r/vue/${name}.json`), `${path}: incorrect registry command`)
      const marker = name === 'scribble-highlight' ? 'scribble' : name
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
        !html.includes('npx shadcn@latest add'),
        `${path}: React installation leaked into Vue documentation`,
      )
    }
    assert(!html.includes('Vue (experimental)'), `${path}: the removed overview is still linked`)
  }
  for (const name of ['registry', ...vueComponents]) {
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
  for (const name of vueComponents) {
    const response = await fetch(`${origin}/src/demos/${name}-basic.vue`)
    const source = await response.text()
    assert.equal(response.status, 200, `Vue ${name} client module failed to compile`)
    assert(
      !source.includes('$RefreshSig$'),
      `React Refresh leaked into the Vue ${name} client module`,
    )
  }
  console.log(
    '✓ development SSR renders Vue and React docs and the home page; Vue client modules compile without React Refresh',
  )
} finally {
  await server.stop()
}
