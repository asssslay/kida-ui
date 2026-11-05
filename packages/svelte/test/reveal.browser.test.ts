import '@kida-ui/styles/kida.css'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import RevealHost from './fixtures/RevealHost.svelte'
import { node as find } from './fixtures.js'

const node = () => find('[data-kida-reveal]')

async function offscreen(props = {}) {
  const spacer = document.createElement('div')
  spacer.style.height = '150vh'
  document.body.append(spacer)
  return render(RevealHost, props)
}

afterEach(async () => {
  document.querySelectorAll('body > div[style="height: 150vh;"]').forEach((el) => {
    el.remove()
  })
  window.scrollTo(0, 0)
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('default Reveal starts hidden, animates on entry, and stays visible after exit', async () => {
  await offscreen()
  const element = node()
  expect(getComputedStyle(element).opacity).toBe('0')
  expect(getComputedStyle(element).transform).toBe('matrix(1, 0, 0, 1, 0, 8)')
  element.scrollIntoView()
  await expect.poll(() => element.style.willChange).toBe('auto')
  expect(getComputedStyle(element).transform).toBe('none')
  window.scrollTo(0, 0)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(getComputedStyle(element).opacity).toBe('1')
})

test('reactive options reset the controller using new geometry', async () => {
  const view = await offscreen({ x: -32, y: 0, scale: 0.9 })
  expect(getComputedStyle(node()).transform).toBe('matrix(0.9, 0, 0, 0.9, -32, 0)')
  await view.rerender({ x: 24 })
  await expect.poll(() => getComputedStyle(node()).transform).toBe('matrix(0.9, 0, 0, 0.9, 24, 0)')
})

test('once=false re-hides and runs an animation on re-entry', async () => {
  await offscreen({ once: false, duration: 0.4 })
  const element = node()
  element.scrollIntoView()
  await expect.poll(() => element.style.willChange).toBe('auto')
  window.scrollTo(0, 0)
  await expect.poll(() => getComputedStyle(element).opacity).toBe('0')
  element.scrollIntoView()
  await expect.poll(() => element.getAnimations().length, { interval: 10 }).toBeGreaterThan(0)
  await expect.poll(() => element.style.willChange).toBe('auto')
})

test('content, class, style, and equivalent easing updates preserve the settled state', async () => {
  const view = await render(RevealHost, {
    label: 'Original',
    class: 'first',
    duration: 0.01,
    ease: [0.16, 1, 0.3, 1],
  })
  await expect.poll(() => node().style.willChange).toBe('auto')
  const observe = vi.spyOn(IntersectionObserver.prototype, 'observe')
  await view.rerender({
    label: 'Updated',
    class: 'second',
    style: 'color: rgb(1, 2, 3)',
    ease: [0.16, 1, 0.3, 1],
  })
  await expect.poll(() => node().textContent).toBe('Updated')
  expect(node().className).toBe('second')
  expect(getComputedStyle(node()).color).toBe('rgb(1, 2, 3)')
  expect(observe).not.toHaveBeenCalled()
  expect(getComputedStyle(node()).opacity).toBe('1')
  expect(getComputedStyle(node()).transform).toBe('none')
  expect(node().getAnimations()).toHaveLength(0)
})

test('binds the DOM root and forwards native attributes and authored events', async () => {
  const sink: { current: HTMLElement | null } = { current: null }
  const onclick = vi.fn()
  const view = await render(RevealHost, {
    sink,
    as: 'section',
    id: 'featured',
    'aria-label': 'Featured content',
    onclick,
  })
  expect(sink.current).toBe(node())
  expect(node().tagName).toBe('SECTION')
  expect(node().id).toBe('featured')
  expect(node().getAttribute('aria-label')).toBe('Featured content')
  node().click()
  expect(onclick).toHaveBeenCalledOnce()
  await view.unmount()
  await expect.poll(() => sink.current).toBe(null)
})

test('changing the semantic root cleans up the old controller and observes the new node', async () => {
  const view = await offscreen({ as: 'div', y: 18 })
  const original = node()
  await view.rerender({ as: 'section' })
  await expect.poll(() => node().tagName).toBe('SECTION')
  expect(node()).not.toBe(original)
  expect(original.isConnected).toBe(false)
  expect(getComputedStyle(node()).opacity).toBe('0')
  node().scrollIntoView()
  await expect.poll(() => node().style.willChange).toBe('auto')
})

test('a settled reveal replaced by a new root hides again until it enters', async () => {
  const view = await render(RevealHost, { duration: 0.01 })
  await expect.poll(() => node().style.willChange).toBe('auto')
  const spacer = document.createElement('div')
  spacer.style.height = '150vh'
  document.body.prepend(spacer)
  await view.rerender({ as: 'section' })
  await expect.poll(() => node().tagName).toBe('SECTION')
  await expect.poll(() => getComputedStyle(node()).opacity).toBe('0')
})

test('unmount cancels active animations and viewport observation', async () => {
  const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(RevealHost, { duration: 2 })
  const element = node()
  await expect.poll(() => element.getAnimations().length).toBeGreaterThan(0)
  await view.unmount()
  expect(element.getAnimations()).toHaveLength(0)
  expect(disconnect).toHaveBeenCalled()
})

test('reduced motion keeps offscreen content visible without animation', async () => {
  await commands.setReducedMotion(true)
  await offscreen()
  await expect.poll(() => getComputedStyle(node()).opacity).toBe('1')
  expect(getComputedStyle(node()).transform).toBe('none')
  expect(node().getAnimations()).toHaveLength(0)
})
