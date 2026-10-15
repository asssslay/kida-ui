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
const components = [...vueComponents, 'space-type']
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
  for (const path of ['/docs/vue', ...components.map((name) => `/docs/${name}`), '/']) {
    const response = await fetch(`${origin}${path}`)
    const html = await response.text()
    assert.equal(response.status, 200, `${path}: development SSR failed`)
    if (path === '/docs/vue') {
      assert(html.includes('data-kida-reveal'), 'Vue Reveal did not render on the server')
      assert(html.includes('data-kida-collapse'), 'Vue Collapse did not render on the server')
      assert(html.includes('Room for the details.'), 'Vue slot content is missing')
      for (const marker of ['text-bloom', 'magnetic', 'photo-pile', 'scribble', 'sticker-burst']) {
        assert(html.includes(`data-kida-${marker}`), `Vue ${marker} did not render on the server`)
      }
    }
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
