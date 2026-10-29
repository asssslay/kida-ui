import '@kida-ui/styles/kida.css'
import { Collapse } from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { showcase } from './showcase.js'

// Nodes that must survive hydration unchanged, across every adapter in the showcase.
const HYDRATED = [
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
  await page.viewport(1280, 720)
  vi.restoreAllMocks()
})

test.each([false, true])(
  'Node-rendered markup respects reduced motion before hydration (%s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    // The command runs the server renderer in Node, not in this browser's DOM environment.
    const markup = await commands.serverMarkup(true)
    const container = document.createElement('div')
    container.innerHTML = markup
    document.body.append(container)
    const reveal = container.querySelector<HTMLElement>('[data-kida-reveal]')
    if (!reveal) throw new Error('Server Reveal is missing')
    expect(getComputedStyle(reveal).opacity).toBe(reduced ? '1' : '0')
    expect(getComputedStyle(reveal).transform).toBe(reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, 8)')
    const bloom = container.querySelector<HTMLElement>('[data-kida-text-bloom-segment]')
    if (!bloom) throw new Error('Server TextBloom is missing')
    expect(getComputedStyle(bloom).opacity).toBe(reduced ? '1' : '0')
    expect(getComputedStyle(bloom).transform).toBe(
      reduced ? 'none' : 'matrix(0.98, 0, 0, 0.98, 0, 10)',
    )
    const existing = [...container.querySelectorAll(HYDRATED)]
    const collapse = container.querySelector('[data-kida-collapse]')
    const warnings: string[] = []
    const errors = vi.spyOn(console, 'error')
    const app = createSSRApp({ render: () => showcase(true) })
    app.config.warnHandler = (warning) => warnings.push(warning)
    try {
      app.mount(container)
      await nextTick()
      expect(container.querySelector('[data-kida-reveal]')).toBe(reveal)
      expect(container.querySelector('[data-kida-collapse]')).toBe(collapse)
      expect(warnings).toEqual([])
      expect(errors).not.toHaveBeenCalled()
      expect(collapse?.textContent).toBe('Collapse content')
      expect([...container.querySelectorAll(HYDRATED)]).toEqual(existing)
      expect(container.querySelectorAll('[data-kida-photo-item]')).toHaveLength(3)
      expect(container.querySelectorAll('[data-kida-sticker-layer] > span')).toHaveLength(8)
      expect(
        container.querySelector('[data-kida-dual-wave-column="title"] [aria-current="true"]')
          ?.textContent,
      ).toBe('Project 2')
      expect(container.querySelectorAll('[data-kida-glow-content]')).toHaveLength(1)
      await expect.poll(() => container.querySelector('filter[id^="kida-glow-"]')).not.toBe(null)
      if (reduced) expect(getComputedStyle(reveal).willChange).toBe('auto')
    } finally {
      app.unmount()
      container.remove()
    }
  },
)

test('initially closed Node-rendered Collapse hydrates without inserting content', async () => {
  const container = document.createElement('div')
  container.innerHTML = await commands.serverMarkup(false)
  document.body.append(container)
  const warnings: string[] = []
  const app = createSSRApp({ render: () => showcase(false) })
  app.config.warnHandler = (warning) => warnings.push(warning)
  try {
    app.mount(container)
    await nextTick()
    expect(container.querySelector('[data-kida-collapse]')).toBe(null)
    expect(warnings).toEqual([])
  } finally {
    app.unmount()
    container.remove()
  }
})

test('Collapse remeasures wrapped content after a container narrows', async () => {
  const Host = defineComponent({
    props: { width: { default: 360 } },
    setup: (props) => () =>
      h('div', { style: { width: `${props.width}px` } }, [
        h(Collapse, { open: true }, () =>
          h(
            'p',
            { style: { margin: 0, lineHeight: '20px' } },
            'Responsive content grows taller when the available inline space becomes substantially narrower.',
          ),
        ),
      ]),
  })
  const view = await render(Host)
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
    await render(defineComponent({ setup: () => () => showcase(true) }))
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    )
    const button = document.querySelector('button')
    button?.focus()
    expect(document.activeElement).toBe(button)
    // DualWave dims inactive rows by design, as in the React suite; every other rule still
    // applies to them, and every rule applies to the rest of the page.
    expect(
      (await axe.run({ include: [document.body], exclude: [['[data-kida-dual-wave-column]']] }))
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
  },
)
