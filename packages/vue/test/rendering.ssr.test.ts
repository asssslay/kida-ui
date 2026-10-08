import { Collapse, Reveal } from '@kida-ui/vue'
import { renderToString } from '@vue/server-renderer'
import { expect, test } from 'vitest'
import { createSSRApp, h } from 'vue'
import { serverMarkup } from './server-fixture.js'

test('built package imports and renders in Node without browser globals', async () => {
  expect(typeof window).toBe('undefined')
  const first = await serverMarkup(true)
  expect(await serverMarkup(true)).toBe(first)
  expect(first).toContain('translate3d(0px, 8px, 0) scale(1)')
  expect(first).not.toContain('undefined')
  expect(first).toContain('Reveal content')
  expect(first).toContain('Collapse content')
  expect(first).toContain('data-skip-animation')
  expect(await serverMarkup(false)).not.toContain('Collapse content')
})

test('server output preserves explicit zero and false Reveal options', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () => h(Reveal, { x: 0, y: 0, scale: 1, once: false, duration: 0 }, () => 'Content'),
    }),
  )
  expect(html).toContain('translate3d(0px, 0px, 0) scale(1)')
})

test('initially closed Collapse does not emit an exit callback during SSR', async () => {
  let exits = 0
  await renderToString(
    createSSRApp({
      render: () => h(Collapse, { open: false, onExitComplete: () => exits++ }, () => 'Hidden'),
    }),
  )
  expect(exits).toBe(0)
})
