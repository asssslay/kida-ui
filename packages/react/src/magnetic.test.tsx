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
  await expect.poll(() => getComputedStyle(target).transform).toBe('none')
  expect(target.style.willChange).toBe('auto')
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
