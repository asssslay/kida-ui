import '@kida-ui/styles/kida.css'
import { GLOW_PALETTES, type GlowHighlightPalette } from '@kida-ui/motion'
import { GlowHighlight, type GlowHighlightProps, type KidaElement } from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'

// Typed initial props; later rerenders may add any option or native attribute.
const props = (value: GlowHighlightProps & Record<string, unknown>) => value
const roots = () => [...document.querySelectorAll<HTMLElement>('[data-kida-glow]')]

function root() {
  const element = roots()[0]
  if (!element) throw new Error('GlowHighlight is not mounted')
  return element
}

function layer(element = root()) {
  const node = element.querySelector<HTMLElement>('[data-kida-glow-layer]')
  if (!node) throw new Error('The traced layer is missing')
  return node
}

/** Core ring: its horizontal dilate radius and flood opacity. */
function core(element = root()) {
  const morph = element.querySelector('feMorphology[operator="dilate"]')
  const flood = element.querySelector('feFlood')
  const [x = 0] = (morph?.getAttribute('radius') ?? '0').split(' ').map(Number)
  return { radius: x, opacity: Number(flood?.getAttribute('flood-opacity')) }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

afterEach(async () => {
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('exposes the slot once and forwards native attributes, styles, events, and refs', async () => {
  const exposed = ref<KidaElement | null>(null)
  const click = vi.fn()
  await render(
    defineComponent({
      setup: () => () =>
        h('p', [
          'Make it ',
          h(
            GlowHighlight,
            {
              ref: exposed,
              id: 'sweet',
              trigger: 'manual',
              active: true,
              class: 'custom-glow',
              style: { fontSize: '32px' },
              onClick: click,
            },
            () => h('a', { href: '#sweet' }, 'sweet'),
          ),
        ]),
    }),
  )
  expect(exposed.value?.element).toBe(root())
  expect(root().id).toBe('sweet')
  expect(root().className).toBe('custom-glow')
  expect(root().style.fontSize).toBe('32px')
  expect(root().dataset.finish).toBe('glow')
  expect(root().dataset.palette).toBe('candy')
  expect(root().dataset.state).toBe('on')
  expect(layer().getAttribute('aria-hidden')).toBe('true')
  expect(layer().inert).toBe(true)
  expect(root().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  expect(root().querySelector('[data-kida-glow-content]')?.textContent).toBe('sweet')
  // The copied link is inert, so keyboard users reach the real one only.
  const links = root().querySelectorAll('a')
  expect(links).toHaveLength(2)
  links[1]?.focus()
  expect(document.activeElement).toBe(links[1])
  links[0]?.focus()
  expect(document.activeElement).not.toBe(links[0])
  root().click()
  expect(click).toHaveBeenCalledOnce()
  const result = await axe.run(root(), { rules: { 'color-contrast': { enabled: false } } })
  expect(result.violations).toEqual([])
})

test('manual activation grows, reverses from the current frame, and settles off', async () => {
  const view = await render(GlowHighlight, {
    props: props({ trigger: 'manual', duration: 800, style: { fontSize: '40px' } }),
    slots: { default: () => 'turn' },
  })
  expect(root().dataset.state).toBe('off')
  expect(getComputedStyle(layer()).visibility).toBe('hidden')
  await view.rerender({ active: true })
  expect(root().dataset.state).toBe('entering')
  await wait(250)
  const before = core().radius
  expect(before).toBeGreaterThan(0)
  await view.rerender({ active: false })
  expect(root().dataset.state).toBe('leaving')
  await wait(32)
  expect(Math.abs(core().radius - before)).toBeLessThan(before * 0.5)
  await expect.poll(() => root().dataset.state, { timeout: 2000 }).toBe('off')
  expect(getComputedStyle(layer()).visibility).toBe('hidden')
})

test('Vue re-renders keep the engine-owned state, layer, and filter', async () => {
  const view = await render(GlowHighlight, {
    props: props({ trigger: 'manual', active: true }),
    slots: { default: () => 'steady' },
  })
  const filter = root().querySelector('filter')
  expect(root().dataset.state).toBe('on')
  await view.rerender({ class: 'updated', title: 'Still lit' })
  expect(root().className).toBe('updated')
  expect(root().dataset.state).toBe('on')
  expect(getComputedStyle(layer()).visibility).toBe('visible')
  expect(layer().style.filter).toContain(filter?.id ?? 'missing')
  expect(root().querySelector('filter')).toBe(filter)
})

test('finish, spread, and duration update without restarting; trigger changes restart', async () => {
  await commands.setReducedMotion(true)
  const view = await render(GlowHighlight, {
    props: props({ trigger: 'manual', active: true, style: { fontSize: '40px' } }),
    slots: { default: () => 'swap' },
  })
  const filter = root().querySelector('filter')
  expect(root().querySelector('feOffset')).toBeNull()
  await view.rerender({ finish: 'sticker' })
  expect(root().dataset.finish).toBe('sticker')
  expect(root().dataset.state).toBe('on')
  expect(root().querySelector('feOffset')).not.toBeNull()
  expect(root().querySelector('filter')).toBe(filter)
  const base = core().radius
  await view.rerender({ spread: 2, duration: 300 })
  expect(core().radius).toBeCloseTo(base + 0.07 * 40, 1)
  expect(root().querySelector('filter')).toBe(filter)

  await view.rerender({ trigger: 'hover' })
  expect(root().querySelector('filter')).not.toBe(filter)
  expect(document.querySelectorAll('filter[id^="kida-glow-"]')).toHaveLength(1)
  expect(root().dataset.state).toBe('off')
  await view.rerender({ trigger: 'manual' })
  expect(root().dataset.state).toBe('on')
})

test('named palettes apply exported colors, and inline variables still override them', async () => {
  const names = Object.keys(GLOW_PALETTES) as GlowHighlightPalette[]
  await render(
    defineComponent({
      setup: () => () =>
        h('p', [
          h(GlowHighlight, {}, () => 'default'),
          ...names.map((name) => h(GlowHighlight, { key: name, palette: name }, () => name)),
          h(
            GlowHighlight,
            { palette: 'berry', style: { '--kida-glow-core': '#123456' } },
            () => 'custom',
          ),
        ]),
    }),
  )
  const colors = (element: HTMLElement) => {
    const style = getComputedStyle(element)
    const read = (name: string) => style.getPropertyValue(`--kida-glow-${name}`).trim()
    return { core: read('core'), rim: read('rim'), band: read('band'), fringe: read('fringe') }
  }
  const [fallback, ...named] = roots()
  const custom = named.pop()
  if (!fallback || !custom) throw new Error('Palette fixtures are missing')
  expect(colors(fallback)).toEqual(GLOW_PALETTES.candy)
  named.forEach((element, index) => {
    const name = names[index] as GlowHighlightPalette
    expect(element.dataset.palette).toBe(name)
    expect(colors(element)).toEqual(GLOW_PALETTES[name])
  })
  expect(colors(custom)).toEqual({ ...GLOW_PALETTES.berry, core: '#123456' })
})

test('hover trigger follows the enclosing link for pointer and keyboard focus', async () => {
  await userEvent.hover(document.body, { position: { x: 1, y: 1 } })
  await render(
    defineComponent({
      setup: () => () =>
        h('p', { style: { margin: '240px 0 0 240px' } }, [
          h('a', { href: '#notes' }, [
            'Read the ',
            h(GlowHighlight, { trigger: 'hover' }, () => 'notes'),
          ]),
        ]),
    }),
  )
  const link = document.querySelector('a')
  if (!link) throw new Error('Link is missing')
  link.dispatchEvent(new PointerEvent('pointerenter'))
  await expect.poll(() => root().dataset.state).not.toBe('off')
  link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  link.dispatchEvent(new PointerEvent('pointerleave'))
  await expect.poll(() => root().dataset.state, { timeout: 2000 }).toBe('on')
  link.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  await expect.poll(() => root().dataset.state, { timeout: 2000 }).toBe('off')
})

test('view trigger lights once scrolled into view, and repeats when once is false', async () => {
  await render(
    defineComponent({
      setup: () => () => [
        h('div', { style: { height: '150vh' } }),
        h(GlowHighlight, { id: 'once', duration: 150 }, () => 'scrolled'),
        ' ',
        h(GlowHighlight, { id: 'again', duration: 150, once: false }, () => 'again'),
        h('div', { style: { height: '150vh' } }),
      ],
    }),
  )
  const lit = document.getElementById('once')
  const repeat = document.getElementById('again')
  if (!lit || !repeat) throw new Error('Highlights are missing')
  expect(lit.dataset.state).toBe('off')
  lit.scrollIntoView({ block: 'center' })
  await expect.poll(() => lit.dataset.state, { timeout: 2000 }).toBe('on')
  await expect.poll(() => repeat.dataset.state, { timeout: 2000 }).toBe('on')
  window.scrollTo(0, 0)
  await expect.poll(() => repeat.dataset.state, { timeout: 2000 }).toBe('off')
  expect(lit.dataset.state).toBe('on')
})

test('instances get unique filters; unmount removes them and stops the loop', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const active = ref(true)
  const view = await render(
    defineComponent({
      setup: () => () => [
        h(GlowHighlight, { trigger: 'manual', duration: 2000, active: active.value }, () => 'one'),
        h(GlowHighlight, { trigger: 'manual', duration: 2000, active: active.value }, () => 'two'),
      ],
    }),
  )
  const ids = roots().map((element) => element.querySelector('filter')?.id)
  expect(new Set(ids).size).toBe(2)
  active.value = false
  await expect.poll(() => roots()[0]?.dataset.state).toBe('leaving')
  const frame = vi.spyOn(window, 'requestAnimationFrame')
  view.unmount()
  expect(document.querySelectorAll('filter[id^="kida-glow-"]')).toHaveLength(0)
  expect(disconnectResize.mock.calls.length).toBeGreaterThanOrEqual(2)
  const after = frame.mock.calls.length
  await wait(100)
  expect(frame.mock.calls.length).toBe(after)
})
