import '@kida-ui/styles/kida.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { Magnetic } from './magnetic.js'

function parts() {
  const root = document.querySelector<HTMLElement>('[data-kida-magnetic]')
  const target = document.querySelector<HTMLElement>('[data-kida-magnetic-target]')
  if (!root || !target) throw new Error('Magnetic is not mounted')
  return { root, target }
}

test('moves toward a fine pointer and settles on leave', async () => {
  await render(
    <Magnetic maxDistance={20}>
      <button type="button" style={{ width: 120, height: 48 }}>
        Pull me
      </button>
    </Magnetic>,
  )

  const { root, target } = parts()
  expect(getComputedStyle(target).transform).toBe('none')
  const bounds = root.getBoundingClientRect()
  root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  root.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerType: 'mouse',
      clientX: bounds.right,
      clientY: bounds.bottom,
    }),
  )

  await expect.poll(() => getComputedStyle(target).transform).not.toBe('none')

  root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
  // The renderer can write the identity transform one tick before both spring-completion
  // callbacks have run. `will-change: auto` is the controller's complete settled-state signal.
  await expect.poll(() => target.style.willChange, { timeout: 3000 }).toBe('auto')
  expect(getComputedStyle(target).transform).toBe('none')
})

test('keeps a stable activation area around the moving target', async () => {
  await render(
    <div style={{ padding: 80 }}>
      <Magnetic maxDistance={20}>
        <button type="button" style={{ width: 120, height: 48 }}>
          Pull me
        </button>
      </Magnetic>
    </div>,
  )

  const { root, target } = parts()
  const bounds = root.getBoundingClientRect()
  const x = bounds.left - 12
  const y = bounds.top + bounds.height / 2

  // A real pointer can hit the generated activation surface before it reaches the
  // button. `elementFromPoint` exercises browser hit testing rather than faking the
  // event directly on the root.
  expect(document.elementFromPoint(x, y)).toBe(root)
  expect(document.elementFromPoint(bounds.left + bounds.width / 2, y)).toBe(
    target.querySelector('button'),
  )
})

test('ignores touch movement', async () => {
  await render(
    <Magnetic>
      <button type="button">Touch-safe</button>
    </Magnetic>,
  )

  const { root, target } = parts()
  root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
  root.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 200 }))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(getComputedStyle(target).transform).toBe('none')
})

test('uses updated motion options without retaining the previous controller', async () => {
  const view = await render(
    <Magnetic strength={1} maxDistance={20}>
      <button type="button" style={{ width: 120, height: 48 }}>
        Pull me
      </button>
    </Magnetic>,
  )

  await view.rerender(
    <Magnetic strength={1} maxDistance={4}>
      <button type="button" style={{ width: 120, height: 48 }}>
        Pull me
      </button>
    </Magnetic>,
  )

  const { root, target } = parts()
  const bounds = root.getBoundingClientRect()
  root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  root.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerType: 'mouse',
      clientX: bounds.right + 100,
      clientY: bounds.bottom + 100,
    }),
  )

  await expect.poll(() => getComputedStyle(target).transform).not.toBe('none')
  const transform = new DOMMatrix(getComputedStyle(target).transform)
  expect(Math.abs(transform.m41)).toBeLessThanOrEqual(4)
  expect(Math.abs(transform.m42)).toBeLessThanOrEqual(4)
})
