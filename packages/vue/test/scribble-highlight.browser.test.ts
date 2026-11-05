import '@kida-ui/styles/kida.css'
import { ScribbleHighlight } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { node } from './fixtures.js'

const root = () => node('[data-kida-scribble]')
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
const dashAndWidth = () => ({
  dash: Number.parseFloat(getComputedStyle(path()).strokeDasharray),
  width: root().querySelector('svg')?.getBoundingClientRect().width ?? 0,
})

async function offscreen(props = {}) {
  const spacer = document.createElement('div')
  spacer.dataset.scribbleSpacer = ''
  spacer.style.height = '150vh'
  document.body.append(spacer)
  return render(ScribbleHighlight, { props, slots: { default: () => 'Worth highlighting' } })
}

afterEach(async () => {
  document.querySelector('[data-scribble-spacer]')?.remove()
  window.scrollTo(0, 0)
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('keeps readable content and hides decorative SVG from assistive technology', async () => {
  await offscreen()
  expect(root().textContent).toBe('Worth highlighting')
  expect(root().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  expect(root().dataset.variant).toBe('underline')
})

test('draws on entry and defaults to a single viewport pass', async () => {
  await offscreen()
  expect(root().dataset.state).toBe('idle')
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')
  expect(root().querySelector('path')?.getAnimations().length).toBeGreaterThan(0)
  window.scrollTo(0, 0)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(root().dataset.state).toBe('active')
})

test('once=false re-arms on exit and variant updates replace the path', async () => {
  const view = await offscreen({ once: false })
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')
  window.scrollTo(0, 0)
  await expect.poll(() => root().dataset.state).toBe('idle')
  const path = root().querySelector('path')?.getAttribute('d')
  await view.rerender({ variant: 'circle', amount: 'all' })
  expect(root().dataset.variant).toBe('circle')
  expect(root().querySelector('path')?.getAttribute('d')).not.toBe(path)
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')
})

test('unrelated attributes do not re-arm a completed decoration', async () => {
  const view = await render(ScribbleHighlight, { slots: { default: () => 'Keep it drawn' } })
  await expect.poll(() => root().dataset.state).toBe('active')
  const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  await view.rerender({ class: 'updated' })
  expect(root().dataset.state).toBe('active')
  expect(disconnect).not.toHaveBeenCalled()
})

test('reduced motion draws offscreen without a CSS animation', async () => {
  await commands.setReducedMotion(true)
  await offscreen()
  expect(root().dataset.state).toBe('settled')
  const path = root().querySelector('path')
  if (!path) throw new Error('Path is missing')
  expect(getComputedStyle(path).strokeDashoffset).toBe('0px')
  expect(path.getAnimations()).toHaveLength(0)
})

test('draws a wide underline as one stroke and remeasures when it resizes', async () => {
  await offscreen({ style: { width: '600px' } })
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
  await render(ScribbleHighlight, {
    props: { variant: 'circle', style: { width: '600px' } },
    slots: { default: () => 'Worth circling twice' },
  })
  await expect.poll(() => root().dataset.state).toBe('active')
  await drawn()
  const { dash, width } = dashAndWidth()
  // Top and bottom arcs each cross most of the width.
  expect(dash).toBeGreaterThan(width * 1.8)
  expect(getComputedStyle(path()).strokeDashoffset).toBe('0px')
})

test('unmount removes measured lengths and stops observing size', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await offscreen()
  const element = path()
  expect(element.style.getPropertyValue('--kida-draw-length')).toMatch(/^\d+px$/)
  view.unmount()
  expect(disconnect).toHaveBeenCalled()
  expect(element.style.getPropertyValue('--kida-draw-length')).toBe('')
})

test('unmount disconnects the viewport observer', async () => {
  const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await offscreen({ once: false })
  await view.unmount()
  expect(disconnect).toHaveBeenCalled()
})
