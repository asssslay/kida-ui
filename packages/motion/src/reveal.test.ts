import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const motion = vi.hoisted(() => ({
  animate: vi.fn(),
  inView: vi.fn(),
}))

vi.mock('motion', () => motion)
vi.mock('./reduced-motion.js', () => ({ prefersReducedMotion: () => false }))

import { reveal } from './reveal.js'

beforeEach(() => {
  motion.animate.mockReset()
  motion.inView.mockReset()
})

afterEach(() => vi.unstubAllGlobals())

test('cleanup stops observation, the active animation, and a pending settle frame', () => {
  const stop = vi.fn()
  const cancel = vi.fn()
  let enter: (() => void) | undefined

  motion.inView.mockImplementation((_element, onStart) => {
    enter = onStart
    return stop
  })
  motion.animate.mockReturnValue({ cancel })

  const requestFrame = vi.fn(() => 42)
  const cancelFrame = vi.fn()
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)

  const element = document.createElement('div')
  const cleanup = reveal(element, { once: false })
  expect(enter).toBeTypeOf('function')
  enter?.()

  const animationOptions = motion.animate.mock.calls[0]?.[2]
  expect(animationOptions?.onComplete).toBeTypeOf('function')
  animationOptions?.onComplete()
  expect(requestFrame).toHaveBeenCalledOnce()

  cleanup()

  expect(stop).toHaveBeenCalledOnce()
  expect(cancel).toHaveBeenCalledOnce()
  expect(cancelFrame).toHaveBeenCalledWith(42)
})
