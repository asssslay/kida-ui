import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const motion = vi.hoisted(() => ({
  animate: vi.fn(),
  inView: vi.fn(),
}))

vi.mock('motion', () => motion)
vi.mock('./reduced-motion.js', () => ({ prefersReducedMotion: () => false }))

import { reveal, revealInitialStyle } from './reveal.js'

beforeEach(() => {
  motion.animate.mockReset()
  motion.inView.mockReset()
})

afterEach(() => vi.unstubAllGlobals())

test.each([{}, { x: undefined, y: undefined, scale: undefined }])(
  'renders the default initial transform when position options are omitted or undefined: %j',
  (options) => {
    expect(revealInitialStyle(options).transform).toBe('translate3d(0px, 8px, 0) scale(1)')
  },
)

test.each([
  {},
  { duration: undefined, delay: undefined, ease: undefined, once: undefined, amount: undefined },
])('uses default timing and observes only the first entry: %j', (options) => {
  const stop = vi.fn()
  let enter: (() => undefined | (() => void)) | undefined
  motion.inView.mockImplementation((_element, onStart) => {
    enter = onStart
    return stop
  })
  motion.animate.mockReturnValue({ cancel: vi.fn() })

  const cleanup = reveal(document.createElement('div'), options)
  expect(motion.inView.mock.calls[0]?.[2]).toEqual({ amount: 0.3 })
  expect(enter?.()).toBeUndefined()
  expect(stop).toHaveBeenCalledOnce()
  expect(motion.animate.mock.calls[0]?.[2]).toMatchObject({
    duration: 0.5,
    delay: 0,
    ease: [0.16, 1, 0.3, 1],
  })
  cleanup()
})

test('preserves explicit zero values and repeat behavior', () => {
  expect(revealInitialStyle({ x: 0, y: 0, scale: 0 }).transform).toBe(
    'translate3d(0px, 0px, 0) scale(0)',
  )
  const stop = vi.fn()
  let enter: (() => undefined | (() => void)) | undefined
  motion.inView.mockImplementation((_element, onStart) => {
    enter = onStart
    return stop
  })
  motion.animate.mockReturnValue({ cancel: vi.fn() })

  const cleanup = reveal(document.createElement('div'), {
    duration: 0,
    delay: 0,
    ease: 'linear',
    once: false,
    amount: 0,
  })
  expect(motion.inView.mock.calls[0]?.[2]).toEqual({ amount: 0 })
  expect(enter?.()).toBeTypeOf('function')
  expect(stop).not.toHaveBeenCalled()
  expect(motion.animate.mock.calls[0]?.[2]).toMatchObject({ duration: 0, delay: 0, ease: 'linear' })
  cleanup()
})

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
