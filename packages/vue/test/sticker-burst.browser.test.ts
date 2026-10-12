import '@kida-ui/styles/kida.css'
import { StickerBurst } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import { node } from './fixtures.js'

const root = () => node('[data-kida-sticker-burst]')
const trigger = () => h('button', { type: 'button' }, 'Celebrate')
const pieces = () => root().querySelectorAll<HTMLElement>('[data-kida-sticker-layer] > span')

afterEach(async () => {
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('keeps all decorative pieces hidden from assistive technology', async () => {
  await render(StickerBurst, {
    props: { count: 6, stickers: ['✦', '♥'] },
    slots: { default: trigger },
  })
  expect(root().querySelector('[data-kida-sticker-layer]')?.getAttribute('aria-hidden')).toBe(
    'true',
  )
  expect(pieces()).toHaveLength(6)
  expect(pieces()[1]?.textContent).toBe('♥')
  expect(root().querySelector('button')?.textContent).toBe('Celebrate')
})

test('native and keyboard clicks replay without swallowing authored events', async () => {
  const click = vi.fn()
  await render(StickerBurst, { props: { onClick: click }, slots: { default: trigger } })
  root().querySelector('button')?.click()
  expect(root().dataset.state).toBe('active')
  await expect.poll(() => pieces()[0]?.getAnimations().length).toBeGreaterThan(0)
  await expect
    .poll(() => pieces()[0]?.getAnimations()[0]?.playState, { timeout: 2000 })
    .toBe('finished')
  const button = page.getByRole('button', { name: 'Celebrate' })
  await button.click()
  await button.element().focus()
  await userEvent.keyboard('{Enter}')
  expect(click).toHaveBeenCalledTimes(3)
  await expect.poll(() => pieces()[0]?.getAnimations()[0]?.playState).toBe('running')
})

test('layout and symbol updates preserve click behavior and use the new seed', async () => {
  const view = await render(StickerBurst, {
    props: { count: 3, seed: 1, stickers: ['A'] } as InstanceType<typeof StickerBurst>['$props'],
    slots: { default: trigger },
  })
  const previous = pieces()[0]?.style.cssText
  root().querySelector('button')?.click()
  await view.rerender({ count: 5, seed: 2, distance: 80, stickers: ['B'] })
  expect(pieces()).toHaveLength(5)
  expect(pieces()[0]?.textContent).toBe('B')
  expect(pieces()[0]?.style.cssText).not.toBe(previous)
  expect(root().dataset.state).toBe('active')
  root().querySelector('button')?.click()
  await expect.poll(() => pieces()[0]?.getAnimations().length).toBeGreaterThan(0)
})

test('empty symbols fall back to defaults and count is bounded', async () => {
  const view = await render(StickerBurst, {
    props: { count: 0, stickers: [] },
    slots: { default: trigger },
  })
  expect(pieces()).toHaveLength(1)
  expect(pieces()[0]?.textContent).toBe('✦')
  await view.rerender({ count: 100 })
  expect(pieces()).toHaveLength(16)
})

test('reduced motion retains the native action without a burst', async () => {
  await commands.setReducedMotion(true)
  const click = vi.fn()
  await render(StickerBurst, { props: { onClick: click }, slots: { default: trigger } })
  root().querySelector('button')?.click()
  expect(click).toHaveBeenCalledOnce()
  expect(root().dataset.state).toBe('idle')
  expect(pieces()[0]?.getAnimations()).toHaveLength(0)
})

test('unmount removes the native burst listener', async () => {
  const view = await render(StickerBurst, { slots: { default: trigger } })
  const element = root()
  element.click()
  expect(element.dataset.state).toBe('active')
  await view.unmount()
  element.click()
  expect(element.dataset.state).toBe('idle')
})
