import '@kida-ui/styles/kida.css'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ScribbleHighlight } from './scribble-highlight.js'

function path() {
  const element = root().querySelector('path')
  if (!element) throw new Error('Path is missing')
  return element
}

/** Resolves when the stroke's draw animation finishes. */
async function drawn() {
  const animations = path().getAnimations()
  await Promise.all(animations.map(({ finished }) => finished))
}

/** The stroke's dash and the stretched SVG's width, in pixels. */
function dashAndWidth() {
  return {
    dash: Number.parseFloat(getComputedStyle(path()).strokeDasharray),
    width: root().querySelector('svg')?.getBoundingClientRect().width ?? 0,
  }
}

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-scribble]')
  if (!element) throw new Error('ScribbleHighlight is not mounted')
  return element
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('reduced motion renders a complete path without an active CSS animation', async () => {
  await commands.setReducedMotion(true)
  await render(<ScribbleHighlight>Visible immediately</ScribbleHighlight>)
  const path = root().querySelector('path')
  if (!path) throw new Error('Path is missing')
  expect(root().dataset.state).toBe('settled')
  expect(getComputedStyle(path).strokeDashoffset).toBe('0px')
  expect(path.getAnimations()).toHaveLength(0)
})

test('keeps readable content and exposes no decorative SVG to assistive technology', async () => {
  await render(<ScribbleHighlight variant="circle">Worth circling</ScribbleHighlight>)

  expect(root().textContent).toBe('Worth circling')
  expect(root().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
})

test('draws when scrolled into view', async () => {
  await render(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight>Drawn in</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )

  const element = root()
  expect(element.dataset.state).toBe('idle')
  element.scrollIntoView()
  await expect.poll(() => element.dataset.state).toBe('active')
  expect(element.querySelector('path')?.getAnimations().length).toBeGreaterThan(0)
})

test('re-arms viewport behavior when its motion options change', async () => {
  const view = await render(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight once>Drawn again</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )

  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')

  await view.rerender(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight once={false}>Drawn again</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )
  await expect.poll(() => root().dataset.state).toBe('active')

  window.scrollTo(0, 0)
  await expect.poll(() => root().dataset.state).toBe('idle')
})

test('draws a wide underline as one stroke and remeasures when it resizes', async () => {
  await render(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight style={{ width: 600 }}>A long highlighted phrase</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )
  // Hidden until drawn, at any width.
  expect(getComputedStyle(path()).visibility).toBe('hidden')
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')
  await drawn()
  expect(getComputedStyle(path()).visibility).toBe('visible')
  expect(getComputedStyle(path()).strokeDashoffset).toBe('0px')
  // The underline spans 96% of the SVG; one dash must cover all of it, not about 100px.
  let { dash, width } = dashAndWidth()
  expect(dash).toBeGreaterThan(width * 0.96)
  expect(dash).toBeLessThan(width * 1.1)

  root().style.width = '200px'
  await expect.poll(() => dashAndWidth().width).toBeLessThan(300)
  await expect.poll(() => dashAndWidth().dash).toBeLessThan(dashAndWidth().width * 1.1)
  ;({ dash, width } = dashAndWidth())
  expect(dash).toBeGreaterThan(width * 0.96)
})

test('draws a wide circle as one stroke around its whole outline', async () => {
  await render(
    <ScribbleHighlight variant="circle" style={{ width: 600 }}>
      Worth circling twice
    </ScribbleHighlight>,
  )
  await expect.poll(() => root().dataset.state).toBe('active')
  await drawn()
  const { dash, width } = dashAndWidth()
  // Top and bottom arcs each cross most of the width.
  expect(dash).toBeGreaterThan(width * 1.8)
  expect(getComputedStyle(path()).strokeDashoffset).toBe('0px')
})

test('unmount removes measured lengths and stops observing size', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(<ScribbleHighlight>Measured</ScribbleHighlight>)
  const element = path()
  expect(element.style.getPropertyValue('--kida-draw-length')).toMatch(/^\d+px$/)
  view.unmount()
  expect(disconnect).toHaveBeenCalled()
  expect(element.style.getPropertyValue('--kida-draw-length')).toBe('')
})
