import '@kida-ui/styles/kida.css'
import { PhotoPile } from '@kida-ui/svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import CollapseToggleHost from './fixtures/CollapseToggleHost.svelte'
import MagneticTouchHost from './fixtures/MagneticTouchHost.svelte'
import StickerBurstHost from './fixtures/StickerBurstHost.svelte'
import { node, photos } from './fixtures.js'

afterEach(async () => {
  await commands.setReducedMotion(false)
})

test.each([false, true])(
  'touch activates a Magnetic child without hover travel (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    await page.viewport(390, 844)
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    const onclick = vi.fn<(event: MouseEvent) => void>()
    const onpointerdown = vi.fn<(event: PointerEvent) => void>()
    await render(MagneticTouchHost, { onclick, onpointerdown })
    await commands.touchTap('[data-kida-magnetic] button')
    expect(onclick).toHaveBeenCalledOnce()
    expect(onclick.mock.calls[0]?.[0].isTrusted).toBe(true)
    expect(onpointerdown.mock.calls[0]?.[0].pointerType).toBe('touch')
    const target = node('[data-kida-magnetic-target]')
    expect(getComputedStyle(target).transform).toBe('none')
    expect(target.getAnimations()).toHaveLength(0)
  },
)

test.each([false, true])(
  'touch repeatedly opens and closes authored Collapse controls (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const onExitComplete = vi.fn()
    await render(CollapseToggleHost, { onExitComplete })
    for (let cycle = 0; cycle < 3; cycle++) {
      await commands.touchTap('#toggle')
      await expect.poll(() => node('#toggle').getAttribute('aria-expanded')).toBe('true')
      expect(node('#details').textContent).toBe('Readable touch content')
      await expect.poll(() => node('#details').getAnimations().length).toBe(0)
      await commands.touchTap('#toggle')
      await expect.poll(() => document.querySelector('#details')).toBe(null)
      expect(node('#toggle').getAttribute('aria-expanded')).toBe('false')
    }
    expect(onExitComplete).toHaveBeenCalledTimes(3)
  },
)

test.each([false, true])(
  'touch raises a PhotoPile card and releases its drag state (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const onpointerdown = vi.fn<(event: PointerEvent) => void>()
    await render(PhotoPile, { photos, onpointerdown })
    const photo = node('[data-kida-photo-item]:last-child')
    const card = photo.querySelector<HTMLElement>('[data-kida-photo-card]')
    if (!card) throw new Error('Photo card is missing')
    const layer = Number(photo.style.zIndex)
    await commands.touchTap('[data-kida-photo-item]:last-child')
    expect(onpointerdown.mock.calls[0]?.[0].isTrusted).toBe(true)
    expect(onpointerdown.mock.calls[0]?.[0].pointerType).toBe('touch')
    expect(Number(photo.style.zIndex)).toBeGreaterThan(layer)
    await expect.poll(() => card.style.willChange, { timeout: 3000 }).toBe('auto')
    expect(photo.dataset.dragging).toBeUndefined()
    expect(card.style.transform).toBe('none')
    expect(card.getAnimations()).toHaveLength(0)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    )
  },
)

test.each([false, true])(
  'touch replays StickerBurst and preserves the action (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const onclick = vi.fn<(event: MouseEvent) => void>()
    await render(StickerBurstHost, { onclick })
    const root = node('[data-kida-sticker-burst]')
    const piece = node('[data-kida-sticker-layer] > span')
    for (let replay = 0; replay < 2; replay++) {
      await commands.touchTap('[data-kida-sticker-burst] button')
      expect(root.dataset.state).toBe(reduced ? 'idle' : 'active')
      if (reduced) expect(piece.getAnimations()).toHaveLength(0)
      else {
        await expect.poll(() => piece.getAnimations()[0]?.playState).toBe('running')
        await expect
          .poll(() => piece.getAnimations()[0]?.playState, { timeout: 2000 })
          .toBe('finished')
      }
    }
    expect(onclick).toHaveBeenCalledTimes(2)
    expect(onclick.mock.calls.every(([event]) => event.isTrusted)).toBe(true)
  },
)
