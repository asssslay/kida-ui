'use client'

import { type RevealOptions, reveal, revealInitialStyle } from '@kida-ui/motion'
import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface RevealProps extends RevealOptions, Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children?: ReactNode
  /** Element to render. @default 'div' */
  as?: ElementType
}

/**
 * Animates its children in when scrolled into view.
 *
 * The pre-animation state is rendered inline on the very first paint — including during
 * SSR — so the content never flashes at full opacity before the effect runs.
 *
 * Changing a motion option re-arms the controller with the new behavior. Cubic-bezier arrays
 * are compared by value, so an equivalent inline tuple does not restart the reveal.
 */
export const Reveal = forwardRef<HTMLElement, RevealProps>(function Reveal(
  {
    as: Tag = 'div',
    children,
    y,
    x,
    scale,
    duration,
    delay,
    ease,
    once,
    amount,
    margin,
    style,
    ...props
  },
  forwardedRef,
) {
  const ref = useRef<HTMLElement>(null)
  const options = { y, x, scale, duration, delay, ease, once, amount, margin }
  const easeDependency = Array.isArray(ease) ? ease.join(',') : ease

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    return reveal(element, options)
  }, [Tag, amount, delay, duration, easeDependency, margin, once, scale, x, y])

  return (
    <Tag
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      data-kida-reveal=""
      style={{ ...revealInitialStyle(options), ...style }}
    >
      {children}
    </Tag>
  )
})
