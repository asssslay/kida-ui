'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * Motion has to be applied before paint or the user sees an unstyled frame, but React
 * warns when `useLayoutEffect` runs during SSR — where it does nothing anyway.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
