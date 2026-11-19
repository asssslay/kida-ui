import '@kida-ui/styles/kida.css'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import MagneticHost from './fixtures/MagneticHost.svelte'
import { node, pointer } from './fixtures.js'

const root = () => node('[data-kida-magnetic]')
const target = () => node('[data-kida-magnetic-target]')

function move() {
  const bounds = root().getBoundingClientRect()
  pointer(root(), 'pointerenter')
  pointer(root(), 'pointermove', { clientX: bounds.right + 100, clientY: bounds.bottom + 100 })
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('follows a fine pointer and springs back on leave', async () => {
  await render(MagneticHost)
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  pointer(root(), 'pointerleave')
  await expect.poll(() => target().style.willChange, { timeout: 3000 }).toBe('auto')
  expect(getComputedStyle(target()).transform).toBe('none')
})

test('stationary activation area preserves child hit testing', async () => {
  await render(MagneticHost, { style: 'margin: 80px' })
  const bounds = root().getBoundingClientRect()
  expect(document.elementFromPoint(bounds.left - 12, bounds.top + bounds.height / 2)).toBe(root())
  expect(
    document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
  ).toBe(root().querySelector('button'))
})

test('updated options replace the previous controller and clamp travel', async () => {
  const view = await render(MagneticHost, { strength: 1, maxDistance: 20 })
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  await view.rerender({ maxDistance: 4 })
  await new Promise(requestAnimationFrame)
  move()
  await expect.poll(() => new DOMMatrix(getComputedStyle(target()).transform).m41).toBeCloseTo(4, 1)
  expect(Math.abs(new DOMMatrix(getComputedStyle(target()).transform).m42)).toBeLessThan(4.5)
})

test('content and target-class updates preserve the current spring and native events', async () => {
  const sink: { current: HTMLElement | null } = { current: null }
  const onclick = vi.fn()
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(MagneticHost, {
    sink,
    label: 'Original',
    targetClass: 'first',
    onclick,
  })
  const old = target()
  expect(sink.current).toBe(root())
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  await view.rerender({ label: 'Updated', targetClass: 'second' })
  await expect.poll(() => target().className).toBe('second')
  expect(target()).toBe(old)
  expect(disconnect).not.toHaveBeenCalled()
  const child = root().querySelector('button')
  child?.focus()
  expect(document.activeElement).toBe(child)
  child?.click()
  expect(onclick).toHaveBeenCalledOnce()
})

test.each([false, true])('touch stays usable with reduced motion %s', async (reduced) => {
  await commands.setReducedMotion(reduced)
  await render(MagneticHost)
  pointer(root(), 'pointerenter', { pointerType: 'touch' })
  pointer(root(), 'pointermove', { pointerType: 'touch', clientX: 200 })
  if (reduced) move()
  await new Promise(requestAnimationFrame)
  expect(getComputedStyle(target()).transform).toBe('none')
})

test('unmount disconnects observers and removes pointer behavior', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(MagneticHost)
  const oldRoot = root()
  const oldTarget = target()
  move()
  await expect.poll(() => getComputedStyle(oldTarget).transform).not.toBe('none')
  await view.unmount()
  expect(disconnect).toHaveBeenCalled()
  pointer(oldRoot, 'pointerenter')
  pointer(oldRoot, 'pointermove', { clientX: 300 })
  await new Promise(requestAnimationFrame)
  expect(oldTarget.style.transform).toBe('none')
  expect(oldTarget.style.willChange).toBe('auto')
})
