import '@kida-ui/styles/kida.css'
import { Collapse, Reveal } from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { showcase } from './showcase.js'

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
    await render(
      defineComponent({
        setup: () => () =>
          h('main', { style: { color: '#241f22', background: '#fff', padding: '20px' } }, [
            h('h1', 'Vue components'),
            h(Reveal, {}, () => h('h2', 'Revealed content')),
            h(Collapse, { open: true }, () => h('button', { type: 'button' }, 'Available action')),
          ]),
      }),
    )
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    )
    const button = document.querySelector('button')
    button?.focus()
    expect(document.activeElement).toBe(button)
    expect((await axe.run(document.body)).violations).toEqual([])
  },
)
