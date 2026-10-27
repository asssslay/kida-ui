import '@kida-ui/styles/kida.css'
import { GLOW_PALETTES, type GlowHighlightPalette } from '@kida-ui/motion'
import axe from 'axe-core'
import { act, type CSSProperties, createRef, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { GlowHighlight } from './glow-highlight.js'

function roots() {
  return [...document.querySelectorAll<HTMLElement>('[data-kida-glow]')]
}

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

/** Core ring: its horizontal and vertical dilate radius and flood opacity. */
function core(element = root()) {
  const morph = element.querySelector('feMorphology[operator="dilate"]')
  const flood = element.querySelector('feFlood')
  const [x = 0, y = x] = (morph?.getAttribute('radius') ?? '0').split(' ').map(Number)
  return { radius: x, radiusY: y, opacity: Number(flood?.getAttribute('flood-opacity')) }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

afterEach(async () => {
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('exposes the text once and forwards native attributes, styles, events, and refs', async () => {
  const ref = createRef<HTMLSpanElement>()
  const click = vi.fn()
  await render(
    <p>
      Make it{' '}
      <GlowHighlight
        ref={ref}
        id="sweet"
        trigger="manual"
        active
        className="custom-glow"
        style={{ fontSize: 32 }}
        onClick={click}
      >
        <a href="#sweet">sweet</a>
      </GlowHighlight>
    </p>,
  )
  expect(ref.current).toBe(root())
  expect(root().id).toBe('sweet')
  expect(root().className).toBe('custom-glow')
  expect(root().style.fontSize).toBe('32px')
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

test('idle highlights skip filter work entirely', async () => {
  await render(<GlowHighlight trigger="manual">idle</GlowHighlight>)
  expect(root().dataset.state).toBe('off')
  expect(getComputedStyle(layer()).visibility).toBe('hidden')
  expect(layer().style.filter).toMatch(/^url\("?#kida-glow-\d+"?\)$/)
})

test('activating grows the rings out of the glyphs and settles', async () => {
  const props = { trigger: 'manual' as const, duration: 600, style: { fontSize: '40px' } }
  const view = await render(<GlowHighlight {...props}>grow</GlowHighlight>)
  await view.rerender(
    <GlowHighlight {...props} active>
      grow
    </GlowHighlight>,
  )
  // setActive marks the transition synchronously; polling could miss it on a busy machine.
  expect(root().dataset.state).toBe('entering')
  await expect.poll(() => getComputedStyle(layer()).visibility).toBe('visible')
  await expect.poll(() => root().dataset.state, { timeout: 3000 }).toBe('on')
  // Settled core: the 0.075em ring plus the closing, wider vertically to bridge line gaps.
  expect(core().radius).toBeCloseTo((0.075 + 0.14) * 40, 1)
  expect(core().radiusY).toBeCloseTo((0.075 + 0.3) * 40, 1)
  expect(core().opacity).toBe(1)
})

test('reversing mid-flight continues from the current frame instead of jumping', async () => {
  const props = { trigger: 'manual' as const, duration: 800, style: { fontSize: '40px' } }
  const view = await render(<GlowHighlight {...props}>turn</GlowHighlight>)
  await view.rerender(
    <GlowHighlight {...props} active>
      turn
    </GlowHighlight>,
  )
  await wait(250)
  const before = core().radius
  expect(before).toBeGreaterThan(0)
  expect(root().dataset.state).toBe('entering')

  await view.rerender(<GlowHighlight {...props}>turn</GlowHighlight>)
  expect(root().dataset.state).toBe('leaving')
  await wait(32)
  expect(Math.abs(core().radius - before)).toBeLessThan(before * 0.5)

  await expect.poll(() => root().dataset.state, { timeout: 2000 }).toBe('off')
  expect(getComputedStyle(layer()).visibility).toBe('hidden')
})

test('reduced motion switches state immediately, including mid-flight', async () => {
  const props = { trigger: 'manual' as const, duration: 2000 }
  const view = await render(<GlowHighlight {...props}>calm</GlowHighlight>)
  await view.rerender(
    <GlowHighlight {...props} active>
      calm
    </GlowHighlight>,
  )
  await expect.poll(() => root().dataset.state).toBe('entering')
  await commands.setReducedMotion(true)
  await expect.poll(() => root().dataset.state).toBe('on')
  expect(core().opacity).toBe(1)

  await view.rerender(<GlowHighlight {...props}>calm</GlowHighlight>)
  expect(root().dataset.state).toBe('off')
  expect(getComputedStyle(layer()).visibility).toBe('hidden')
  expect(root().querySelector('[data-kida-glow-content]')?.textContent).toBe('calm')
})

test('an initially active manual highlight renders settled, without animating in', async () => {
  await render(
    <GlowHighlight trigger="manual" active>
      ready
    </GlowHighlight>,
  )
  expect(root().dataset.state).toBe('on')
  expect(getComputedStyle(layer()).visibility).toBe('visible')
})

test('ring sizes follow font-size changes', async () => {
  await commands.setReducedMotion(true)
  const view = await render(
    <GlowHighlight trigger="manual" active style={{ fontSize: '20px' }}>
      size
    </GlowHighlight>,
  )
  const small = core().radius
  await view.rerender(
    <GlowHighlight trigger="manual" active style={{ fontSize: '40px' }}>
      size
    </GlowHighlight>,
  )
  await expect.poll(() => core().radius).toBeCloseTo(small * 2, 0)
})

test('finish and spread rebuild the rings without restarting or losing state', async () => {
  await commands.setReducedMotion(true)
  const view = await render(
    <GlowHighlight trigger="manual" active style={{ fontSize: '40px' }}>
      swap
    </GlowHighlight>,
  )
  const filter = root().querySelector('filter')
  expect(root().querySelector('feOffset')).toBeNull()
  await view.rerender(
    <GlowHighlight trigger="manual" active finish="sticker" style={{ fontSize: '40px' }}>
      swap
    </GlowHighlight>,
  )
  expect(root().dataset.finish).toBe('sticker')
  expect(root().dataset.state).toBe('on')
  expect(root().querySelector('feOffset')).not.toBeNull()
  expect(root().querySelector('filter')).toBe(filter)

  const base = core().radius
  await view.rerender(
    <GlowHighlight trigger="manual" active finish="sticker" spread={2} style={{ fontSize: '40px' }}>
      swap
    </GlowHighlight>,
  )
  expect(core().radius).toBeCloseTo(base + 0.07 * 40, 1)
  expect(root().querySelector('filter')).toBe(filter)
})

test('named palettes apply the exported colors, and inline variables still override them', async () => {
  const names = Object.keys(GLOW_PALETTES) as GlowHighlightPalette[]
  await render(
    <p>
      <GlowHighlight>default</GlowHighlight>
      {names.map((name) => (
        <GlowHighlight key={name} palette={name}>
          {name}
        </GlowHighlight>
      ))}
      <GlowHighlight palette="berry" style={{ '--kida-glow-core': '#123456' } as CSSProperties}>
        custom
      </GlowHighlight>
    </p>,
  )
  const colors = (element: HTMLElement) => {
    const style = getComputedStyle(element)
    const read = (name: string) => style.getPropertyValue(`--kida-glow-${name}`).trim()
    return { core: read('core'), rim: read('rim'), band: read('band'), fringe: read('fringe') }
  }
  const [fallback, ...named] = roots()
  const custom = named.pop()
  if (!fallback || !custom) throw new Error('Palette fixtures are missing')

  expect(fallback.dataset.palette).toBe('candy')
  expect(colors(fallback)).toEqual(GLOW_PALETTES.candy)
  named.forEach((element, index) => {
    const name = names[index] as GlowHighlightPalette
    expect(element.dataset.palette).toBe(name)
    expect(colors(element)).toEqual(GLOW_PALETTES[name])
  })
  expect(colors(custom)).toEqual({ ...GLOW_PALETTES.berry, core: '#123456' })
})

test('hover trigger follows the enclosing link for pointer and keyboard focus', async () => {
  await render(
    <a href="#notes">
      Read the <GlowHighlight trigger="hover">notes</GlowHighlight>
    </a>,
  )
  const link = document.querySelector('a')
  if (!link) throw new Error('Link is missing')

  // Dispatch focus events like the pointer ones: headless Linux Chromium may not deliver
  // focusout from blur() when its window lacks system focus, leaving the glow lit.
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
    <>
      <div style={{ height: '150vh' }} />
      <GlowHighlight id="once" duration={150}>
        scrolled
      </GlowHighlight>{' '}
      <GlowHighlight id="again" duration={150} once={false}>
        again
      </GlowHighlight>
      <div style={{ height: '150vh' }} />
    </>,
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

test('instances get unique filters; unmounting removes them and stops the loop', async () => {
  const props = { trigger: 'manual' as const, duration: 2000 }
  const view = await render(
    <>
      <GlowHighlight {...props} active>
        one
      </GlowHighlight>
      <GlowHighlight {...props} active>
        two
      </GlowHighlight>
    </>,
  )
  const ids = roots().map((element) => element.querySelector('filter')?.id)
  expect(new Set(ids).size).toBe(2)

  await view.rerender(
    <>
      <GlowHighlight {...props}>one</GlowHighlight>
      <GlowHighlight {...props}>two</GlowHighlight>
    </>,
  )
  await expect.poll(() => roots()[0]?.dataset.state).toBe('leaving')

  const frame = vi.spyOn(window, 'requestAnimationFrame')
  await view.unmount()
  expect(document.querySelectorAll('filter[id^="kida-glow-"]')).toHaveLength(0)
  const after = frame.mock.calls.length
  await wait(100)
  expect(frame.mock.calls.length).toBe(after)
})

test('releases observers and listeners in Strict Mode', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const disconnectIntersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(
    <StrictMode>
      <GlowHighlight>strict</GlowHighlight>
    </StrictMode>,
  )
  // Strict Mode mounts twice; only the surviving controller owns a filter.
  expect(document.querySelectorAll('filter[id^="kida-glow-"]')).toHaveLength(1)
  await view.unmount()
  expect(disconnectResize.mock.calls.length).toBeGreaterThanOrEqual(2)
  expect(disconnectIntersection.mock.calls.length).toBeGreaterThanOrEqual(2)
})

test.each([false, true])(
  'SSR is deterministic and hydrates without errors (reduce: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const element = (
      <p>
        Calm at rest.{' '}
        <GlowHighlight trigger="manual" active>
          Playful
        </GlowHighlight>
      </p>
    )
    const html = renderToString(element)
    expect(renderToString(element)).toBe(html)
    expect(html).not.toContain('undefined')
    // Filter ids are created on the client, so server markup cannot collide between instances.
    expect(html).not.toContain('<filter')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    expect(getComputedStyle(layer()).visibility).toBe('hidden')
    const errors: unknown[] = []
    let hydrated: ReturnType<typeof hydrateRoot> | undefined
    const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const previousEnvironment = environment.IS_REACT_ACT_ENVIRONMENT
    environment.IS_REACT_ACT_ENVIRONMENT = true
    try {
      await act(async () => {
        hydrated = hydrateRoot(container, element, {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      expect(errors).toEqual([])
      expect(root().dataset.state).toBe('on')
      expect(root().querySelector('[data-kida-glow-content]')?.textContent).toBe('Playful')
    } finally {
      await act(async () => hydrated?.unmount())
      environment.IS_REACT_ACT_ENVIRONMENT = previousEnvironment
      container.remove()
    }
  },
)
