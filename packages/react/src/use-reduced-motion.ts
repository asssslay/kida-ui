'use client'

import { prefersReducedMotion, watchReducedMotion } from '@kida-ui/motion'
import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void): () => void {
  return watchReducedMotion(onStoreChange)
}

/**
 * Reactive `prefers-reduced-motion`, for the JS-driven paths only.
 * CSS-driven motion is already guarded by the media query in `@kida-ui/styles`.
 *
 * Server snapshot is `false`, matching the CSS default and avoiding a hydration mismatch.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}
