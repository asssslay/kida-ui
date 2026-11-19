import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { hydrate, mount, tick, unmount } from 'svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import CollapseWidth from './fixtures/CollapseWidth.svelte'
import Showcase from './fixtures/Showcase.svelte'

const HYDRATED = [
  '[data-kida-reveal]',
  '[data-kida-collapse]',
  '[data-kida-magnetic]',
  '[data-kida-text-bloom-segment]',
  '[data-kida-photo-item]',
  '[data-kida-sticker-layer] > span',
  '[data-kida-scribble]',
  '[data-kida-image-text]',
  '[data-kida-space-type-letter]',
  '[data-kida-glow-layer]',
  '[data-kida-dual-wave-item]',
  '[data-kida-dual-wave-tile]',
].join(', ')

afterEach(async () => {
  await commands.setReducedMotion(false)
  await page.viewport(1440, 1000)
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

test.each([false, true])(
  'Node-rendered markup respects reduced motion and hydrates in place (reduced: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const target = document.createElement('div')
    target.innerHTML = await commands.serverMarkup(true)
    document.body.append(target)
    const reveal = target.querySelector<HTMLElement>('[data-kida-reveal]')
    if (!reveal) throw new Error('Server Reveal is missing')
    expect(getComputedStyle(reveal).opacity).toBe(reduced ? '1' : '0')
    expect(getComputedStyle(reveal).transform).toBe(reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, 8)')
    const bloom = target.querySelector<HTMLElement>('[data-kida-text-bloom-segment]')
    if (!bloom) throw new Error('Server TextBloom is missing')
    expect(getComputedStyle(bloom).opacity).toBe(reduced ? '1' : '0')
    expect(getComputedStyle(bloom).transform).toBe(
      reduced ? 'none' : 'matrix(0.98, 0, 0, 0.98, 0, 10)',
    )
    const existing = [...target.querySelectorAll(HYDRATED)]
    const errors = vi.spyOn(console, 'error')
    const warnings = vi.spyOn(console, 'warn')
    const app = hydrate(Showcase, { target, props: { open: true } })
    try {
      await tick()
      expect([...target.querySelectorAll(HYDRATED)]).toEqual(existing)
      expect(errors).not.toHaveBeenCalled()
      expect(warnings).not.toHaveBeenCalled()
      expect(target.querySelector('[data-kida-collapse]')?.textContent).toBe('Collapse content')
      expect(target.querySelectorAll('[data-kida-photo-item]')).toHaveLength(3)
      expect(target.querySelectorAll('[data-kida-sticker-layer] > span')).toHaveLength(8)
      expect(
        target.querySelector('[data-kida-dual-wave-column="title"] [aria-current="true"]')
          ?.textContent,
      ).toBe('Project 2')
      expect(target.querySelectorAll('[data-kida-glow-content]')).toHaveLength(1)
      await expect.poll(() => target.querySelector('filter[id^="kida-glow-"]')).not.toBe(null)
      await expect.poll(() => reveal.style.willChange).toBe(reduced ? 'auto' : 'transform, opacity')
    } finally {
      await unmount(app)
    }
  },
)

test('initially closed Node-rendered Collapse hydrates without inserting content', async () => {
  const target = document.createElement('div')
  target.innerHTML = await commands.serverMarkup(false)
  document.body.append(target)
  const errors = vi.spyOn(console, 'error')
  const warnings = vi.spyOn(console, 'warn')
  const app = hydrate(Showcase, { target, props: { open: false } })
  try {
    await tick()
    expect(target.querySelector('[data-kida-collapse]')).toBe(null)
    expect(errors).not.toHaveBeenCalled()
    expect(warnings).not.toHaveBeenCalled()
  } finally {
    await unmount(app)
  }
})

test('Collapse remeasures wrapped content after a container narrows', async () => {
  const view = await render(CollapseWidth)
  const element = document.querySelector<HTMLElement>('[data-kida-collapse]')
  if (!element) throw new Error('Collapse is missing')
  const wide = element.getBoundingClientRect().height
  await view.rerender({ width: 150 })
  await expect
    .poll(() => Number.parseFloat(element.style.getPropertyValue('--kida-collapse-height')))
    .toBeGreaterThan(wide)
  expect(Number.parseFloat(element.style.getPropertyValue('--kida-collapse-height'))).toBeCloseTo(
    element.getBoundingClientRect().height,
    1,
  )
})

test.each([390, 1280])(
  'shared CSS preserves content and accessibility at viewport width %s',
  async (width) => {
    await page.viewport(width, 844)
    await commands.setReducedMotion(true)
    const target = document.createElement('div')
    document.body.append(target)
    const app = mount(Showcase, { target })
    try {
      await tick()
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      )
      const button = document.querySelector('button')
      button?.focus()
      expect(document.activeElement).toBe(button)
      expect(
        (await axe.run({ include: [target], exclude: [['[data-kida-dual-wave-column]']] }))
          .violations,
      ).toEqual([])
      expect(
        (
          await axe.run(
            { include: [['[data-kida-dual-wave-column]']] },
            { rules: { 'color-contrast': { enabled: false } } },
          )
        ).violations,
      ).toEqual([])
    } finally {
      await unmount(app)
    }
  },
)
