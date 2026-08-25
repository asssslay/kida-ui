const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Whether the user has asked for reduced motion.
 *
 * SSR-safe: returns `false` when there is no `window`, matching the CSS default
 * (the `prefers-reduced-motion` media query in `@kida-ui/styles` is the real guard;
 * this is for the JS-driven paths that CSS cannot express).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(QUERY).matches
}

/**
 * Subscribe to changes of the reduced-motion preference.
 * Returns an unsubscribe function. No-op (and immediately unsubscribable) on the server.
 */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}

  const list = window.matchMedia(QUERY)
  const handler = (event: MediaQueryListEvent) => onChange(event.matches)
  list.addEventListener('change', handler)
  return () => list.removeEventListener('change', handler)
}
