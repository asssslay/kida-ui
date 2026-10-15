import '@kida-ui/styles/kida.css'
import { Collapse, Magnetic, PhotoPile, StickerBurst } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import { node, photos } from './fixtures.js'

// Playwright's touchscreen input exercises trusted pointer/touch/click events and hit testing.
// This is emulation; real-device drag/scroll arbitration remains a manual release check.
afterEach(async () => {
  await commands.setReducedMotion(false)
})

test.each([false, true])(
  'touch activates a Magnetic child without hover travel (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    await page.viewport(390, 844)
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    const click = vi.fn()
    const pointer = vi.fn()
    await render(Magnetic, {
      slots: {
        default: () =>
          h('button', { type: 'button', onClick: click, onPointerdown: pointer }, 'Touch action'),
      },
    })
    await commands.touchTap('[data-kida-magnetic] button')
    expect(click).toHaveBeenCalledOnce()
    expect(click.mock.calls[0]?.[0].isTrusted).toBe(true)
    expect(pointer.mock.calls[0]?.[0].pointerType).toBe('touch')
    const target = node('[data-kida-magnetic-target]')
    expect(getComputedStyle(target).transform).toBe('none')
    expect(target.getAnimations()).toHaveLength(0)
  },
)

test.each([false, true])(
  'touch repeatedly opens and closes authored Collapse controls (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const exit = vi.fn()
    await render(
      defineComponent({
        setup() {
          const open = ref(false)
          return () =>
            h('div', [
              h(
                'button',
                {
                  id: 'toggle',
                  type: 'button',
                  'aria-expanded': open.value,
                  'aria-controls': 'details',
                  onClick: () => {
                    open.value = !open.value
                  },
                },
                'Details',
              ),
              h(Collapse, { open: open.value, id: 'details', onExitComplete: exit }, () =>
                h('p', 'Readable touch content'),
              ),
            ])
        },
      }),
    )
    for (let cycle = 0; cycle < 3; cycle++) {
      await commands.touchTap('#toggle')
      await expect.poll(() => node('#toggle').getAttribute('aria-expanded')).toBe('true')
      expect(node('#details').textContent).toBe('Readable touch content')
      await expect.poll(() => node('#details').getAnimations().length).toBe(0)
      await commands.touchTap('#toggle')
      await expect.poll(() => document.querySelector('#details')).toBe(null)
      expect(node('#toggle').getAttribute('aria-expanded')).toBe('false')
    }
    expect(exit).toHaveBeenCalledTimes(3)
  },
)

test.each([false, true])(
  'touch raises a PhotoPile card and releases its drag state (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const pointer = vi.fn()
    await render(PhotoPile, { props: { photos, onPointerdown: pointer } })
    const photo = node('[data-kida-photo-item]:last-child')
    const card = photo.querySelector<HTMLElement>('[data-kida-photo-card]')
    if (!card) throw new Error('Photo card is missing')
    const layer = Number(photo.style.zIndex)
    await commands.touchTap('[data-kida-photo-item]:last-child')
    expect(pointer.mock.calls[0]?.[0].isTrusted).toBe(true)
    expect(pointer.mock.calls[0]?.[0].pointerType).toBe('touch')
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
    const click = vi.fn()
    await render(StickerBurst, {
      slots: { default: () => h('button', { type: 'button', onClick: click }, 'Celebrate') },
    })
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
    expect(click).toHaveBeenCalledTimes(2)
    expect(click.mock.calls.every(([event]) => event.isTrusted)).toBe(true)
  },
)
