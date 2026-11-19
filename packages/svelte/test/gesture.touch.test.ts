import '@kida-ui/styles/kida.css'
import { PhotoPile } from '@kida-ui/svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import { node, photos } from './fixtures.js'

afterEach(async () => {
  await commands.setReducedMotion(false)
})

test.each([
  { reduced: false, cancel: false },
  { reduced: false, cancel: true },
  { reduced: true, cancel: false },
  { reduced: true, cancel: true },
])('PhotoPile touch drag releases cleanly with %j', async ({ reduced, cancel }) => {
  await commands.setReducedMotion(reduced)
  const onpointerdown = vi.fn<(event: PointerEvent) => void>()
  const onpointermove = vi.fn<(event: PointerEvent) => void>()
  await render(PhotoPile, { photos, onpointerdown, onpointermove })
  const moving = await commands.touchDrag('[data-kida-photo-item]:last-child', cancel)
  expect(onpointerdown.mock.calls[0]?.[0].isTrusted).toBe(true)
  expect(onpointerdown.mock.calls[0]?.[0].pointerType).toBe('touch')
  expect(moving.dragging).toBe(true)
  const start = onpointerdown.mock.calls[0]?.[0] as PointerEvent
  const end = onpointermove.mock.calls.at(-1)?.[0] as PointerEvent
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
