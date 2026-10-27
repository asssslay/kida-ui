import '@kida-ui/styles/kida.css'
import { PhotoPile } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { node, photos } from './fixtures.js'

afterEach(async () => {
  await commands.setReducedMotion(false)
})

// CDP sends a complete trusted gesture through Chromium's input pipeline, including capture.
// WebKit has trusted tap coverage; drag arbitration on real iOS/Android remains a manual gate.
test.each([
  { reduced: false, cancel: false },
  { reduced: false, cancel: true },
  { reduced: true, cancel: false },
  { reduced: true, cancel: true },
])('PhotoPile touch drag releases cleanly with %j', async ({ reduced, cancel }) => {
  await commands.setReducedMotion(reduced)
  const pointer = vi.fn()
  const move = vi.fn()
  await render(PhotoPile, { props: { photos, onPointerdown: pointer, onPointermove: move } })
  const moving = await commands.touchDrag('[data-kida-photo-item]:last-child', cancel)
  expect(pointer.mock.calls[0]?.[0].isTrusted).toBe(true)
  expect(pointer.mock.calls[0]?.[0].pointerType).toBe('touch')
  expect(moving.dragging).toBe(true)
  // Vitest scales its iframe; compare travel in the component's client coordinates.
  const start = pointer.mock.calls[0]?.[0] as PointerEvent
  const end = move.mock.calls.at(-1)?.[0] as PointerEvent
  expect(end.isTrusted).toBe(true)
  expect(end.clientX - start.clientX).toBeGreaterThan(0)
  expect(moving.x).toBeCloseTo(reduced ? 0 : end.clientX - start.clientX, 1)
  expect(moving.y).toBeCloseTo(reduced ? 0 : end.clientY - start.clientY, 1)
  const photo = node('[data-kida-photo-item]:last-child')
  const card = node('[data-kida-photo-item]:last-child [data-kida-photo-card]')
  await expect.poll(() => card.style.willChange, { timeout: 3000 }).toBe('auto')
  expect(photo.dataset.dragging).toBeUndefined()
  expect(card.style.transform).toBe('none')
  expect(card.getAnimations()).toHaveLength(0)
})
