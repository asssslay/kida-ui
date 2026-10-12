import '@kida-ui/styles/kida.css'
import { type KidaElement, Magnetic } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import { node, pointer } from './fixtures.js'

const root = () => node('[data-kida-magnetic]')
const target = () => node('[data-kida-magnetic-target]')
const button = () =>
  h('button', { type: 'button', style: { width: '120px', height: '48px' } }, 'Pull me')

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
  await render(Magnetic, { slots: { default: button } })
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  pointer(root(), 'pointerleave')
  await expect.poll(() => target().style.willChange, { timeout: 3000 }).toBe('auto')
  expect(getComputedStyle(target()).transform).toBe('none')
})

test('stationary activation area preserves child hit testing', async () => {
  await render(Magnetic, { props: { style: { margin: '80px' } }, slots: { default: button } })
  const bounds = root().getBoundingClientRect()
  expect(document.elementFromPoint(bounds.left - 12, bounds.top + bounds.height / 2)).toBe(root())
  expect(
    document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
  ).toBe(root().querySelector('button'))
})

test('updated options replace the previous controller and clamp travel', async () => {
  const view = await render(Magnetic, {
    props: { strength: 1, maxDistance: 20 },
    slots: { default: button },
  })
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  await view.rerender({ maxDistance: 4 })
  move()
  await expect.poll(() => new DOMMatrix(getComputedStyle(target()).transform).m41).toBeCloseTo(4, 1)
  expect(Math.abs(new DOMMatrix(getComputedStyle(target()).transform).m42)).toBeLessThan(4.5)
})

test('slot and target-class updates preserve the current spring and native events', async () => {
  const exposed = ref<KidaElement | null>(null)
  const click = vi.fn()
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const Host = defineComponent({
    props: { label: { default: 'Original' }, targetClass: { default: 'first' } },
    setup: (props) => () =>
      h(Magnetic, { ref: exposed, targetClass: props.targetClass, onClick: click }, () =>
        h('button', { type: 'button' }, props.label),
      ),
  })
  const view = await render(Host)
  const old = target()
  expect(exposed.value?.element).toBe(root())
  move()
  await expect.poll(() => getComputedStyle(target()).transform).not.toBe('none')
  await view.rerender({ label: 'Updated', targetClass: 'second' })
  expect(target()).toBe(old)
  expect(target().className).toBe('second')
  expect(disconnect).not.toHaveBeenCalled()
  const child = root().querySelector('button')
  child?.focus()
  expect(document.activeElement).toBe(child)
  child?.click()
  expect(click).toHaveBeenCalledOnce()
})

test.each([false, true])('touch stays usable with reduced motion %s', async (reduced) => {
  await commands.setReducedMotion(reduced)
  await render(Magnetic, { slots: { default: button } })
  pointer(root(), 'pointerenter', { pointerType: 'touch' })
  pointer(root(), 'pointermove', { pointerType: 'touch', clientX: 200 })
  if (reduced) move()
  await new Promise(requestAnimationFrame)
  expect(getComputedStyle(target()).transform).toBe('none')
})

test('unmount disconnects observers and removes pointer behavior', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(Magnetic, { slots: { default: button } })
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
