import { afterEach, expect, test, vi } from 'vitest'
import { prefersReducedMotion, watchReducedMotion } from './reduced-motion.js'

type Listener = (event: MediaQueryListEvent) => void

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>()
  const list = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', () => list)
  return {
    emit(next: boolean) {
      for (const fn of listeners) fn({ matches: next } as MediaQueryListEvent)
    },
    get listenerCount() {
      return listeners.size
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

test('reads the current preference', () => {
  stubMatchMedia(true)
  expect(prefersReducedMotion()).toBe(true)

  stubMatchMedia(false)
  expect(prefersReducedMotion()).toBe(false)
})

test('notifies on change and unsubscribes cleanly', () => {
  const mq = stubMatchMedia(false)
  const seen: boolean[] = []

  const stop = watchReducedMotion((reduced) => seen.push(reduced))
  mq.emit(true)
  expect(seen).toEqual([true])

  stop()
  expect(mq.listenerCount).toBe(0)
  mq.emit(false)
  expect(seen).toEqual([true])
})
