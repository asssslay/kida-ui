import { inView } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

export interface DrawInViewOptions {
  /** Animate only on the first viewport entry. @default true */
  once?: boolean
  /** How much of the element must be visible. @default 0.4 */
  amount?: 'some' | 'all' | number
}

export function drawInView(element: HTMLElement, options: DrawInViewOptions = {}): () => void {
  if (prefersReducedMotion()) {
    element.dataset.state = 'settled'
    return () => {}
  }

  const { once = true, amount = 0.4 } = options
  element.dataset.state = 'idle'

  const stop = inView(
    element,
    () => {
      element.dataset.state = 'active'
      if (once) stop()
      return once
        ? undefined
        : () => {
            element.dataset.state = 'idle'
          }
    },
    { amount },
  )

  return stop
}
