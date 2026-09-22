import { animate, inView } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

/** Derived from `motion` itself, so it can't drift from the engine's own accepted values. */
type InViewMargin = NonNullable<Parameters<typeof inView>[2]>['margin']

/** The easings we expose. Deliberately narrower than what `motion` accepts. */
export type RevealEase =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | [number, number, number, number]
  | ((t: number) => number)

export interface RevealOptions {
  /** Vertical travel in px. Positive = starts below and rises. @default 8 */
  y?: number
  /** Horizontal travel in px. @default 0 */
  x?: number
  /** Starting scale. @default 1 */
  scale?: number
  /** Seconds. @default 0.5 */
  duration?: number
  /** Seconds. @default 0 */
  delay?: number
  /** @default [0.16, 1, 0.3, 1] — the same curve as `--kida-ease-out` */
  ease?: RevealEase
  /** Animate only the first time it enters the viewport. @default true */
  once?: boolean
  /** How much must be visible before firing. @default 0.3 */
  amount?: 'some' | 'all' | number
  /** Margin around the viewport, CSS-style. e.g. '0px 0px -10% 0px' */
  margin?: InViewMargin
}

const DEFAULTS = {
  y: 8,
  x: 0,
  scale: 1,
  duration: 0.5,
  delay: 0,
  ease: [0.16, 1, 0.3, 1],
  once: true,
  amount: 0.3,
} as const

/**
 * The identity of {@link revealInitialStyle}'s transform, written in the same shape.
 *
 * Animating to the keyword `none` looks right but is not: the engine has no numbers to
 * interpolate towards and commits `matrix(0, 0, 0, 0, 0, 0)`, which collapses the element
 * to 0x0. Ending on the same function list we started from keeps the interpolation
 * componentwise and the final matrix an actual identity.
 */
const IDENTITY_TRANSFORM = 'translate3d(0px, 0px, 0) scale(1)'

/** The pre-animation state. Exported so adapters can render it on the very first paint. */
export function revealInitialStyle(options: RevealOptions = {}) {
  const { y, x, scale } = { ...DEFAULTS, ...options }
  return {
    opacity: 0,
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
    willChange: 'transform, opacity',
  } as const
}

/**
 * Animate an element into view when it is scrolled to.
 *
 * Framework-agnostic: takes an element, returns a cleanup function. Every adapter
 * (React today, Svelte later) is a ~20-line wrapper around this.
 *
 * Under `prefers-reduced-motion: reduce` the element is put into its final state
 * immediately — visible, unanimated. It is never left hidden.
 */
export function reveal(element: HTMLElement, options: RevealOptions = {}): () => void {
  const { duration, delay, ease, once, amount, margin } = { ...DEFAULTS, ...options }

  // `transform: none` rather than an identity matrix: any transform value other than
  // `none` makes the element a containing block for fixed-position descendants, which
  // would silently reposition a popover rendered inside a revealed card.
  const settle = () => {
    element.style.opacity = '1'
    element.style.transform = 'none'
    element.style.willChange = 'auto'
  }

  // Own the pre-animation state, so the engine works even when the adapter didn't set it.
  const hide = () => {
    Object.assign(element.style, revealInitialStyle(options))
  }

  if (prefersReducedMotion()) {
    settle()
    return () => {}
  }

  hide()

  // Bumped on every entry and every exit, so a settle scheduled by a pass that has since
  // been superseded — or re-hidden — is dropped instead of flashing the element visible.
  let pass = 0
  let animation: ReturnType<typeof animate> | undefined
  let settleFrame = 0

  const cancelSettle = () => {
    if (!settleFrame) return
    cancelAnimationFrame(settleFrame)
    settleFrame = 0
  }

  const stop = inView(
    element,
    () => {
      cancelSettle()
      animation?.cancel()
      const generation = ++pass
      const from = revealInitialStyle(options)
      const currentAnimation = animate(
        element,
        // Both ends spelled out. The engine caches what it last animated an element to, so
        // after a completed reveal it believes opacity is already 1 — and `hide()` writing
        // the style directly is invisible to that cache. Left to infer its own start, a
        // re-entry would resolve instantly and never animate.
        { opacity: [from.opacity, 1], transform: [from.transform, IDENTITY_TRANSFORM] },
        // The engine commits its own final keyframe as an inline style, one `onComplete`
        // per animated property, and settling from inside that callback loses the race
        // against whichever property finishes last. A frame later nothing is left to
        // overwrite us. `onComplete` also never fires on cancel, which is what we want:
        // an interrupted reveal must not jump to visible.
        {
          duration,
          delay,
          ease,
          onComplete: () => {
            cancelSettle()
            settleFrame = requestAnimationFrame(() => {
              settleFrame = 0
              if (generation === pass) settle()
            })
          },
        },
      )
      animation = currentAnimation

      if (once) {
        stop()
        return
      }

      // `inView` runs this when the element leaves again. Without re-arming, `once: false`
      // would replay an animation from visible to visible, which is no animation at all.
      return () => {
        pass++
        cancelSettle()
        currentAnimation.cancel()
        if (animation === currentAnimation) animation = undefined
        hide()
      }
    },
    { amount, ...(margin ? { margin } : {}) },
  )

  return () => {
    pass++
    stop()
    cancelSettle()
    animation?.cancel()
    animation = undefined
  }
}
