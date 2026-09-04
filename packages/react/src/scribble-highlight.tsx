'use client'

import { type DrawInViewOptions, drawInView } from '@kida-ui/motion'
import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface ScribbleHighlightProps
  extends DrawInViewOptions,
    Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode
  /** Shape drawn around the content. @default 'underline' */
  variant?: 'underline' | 'circle'
}

const paths = {
  underline: 'M2 12.5 C18 8.5 34 15.5 50 11 C66 6.5 82 14 98 9.5',
  circle: 'M6 10 C16 1 78 0 94 8 C104 15 88 20 50 19 C14 19 -3 15 6 10',
} as const

export const ScribbleHighlight = forwardRef<HTMLSpanElement, ScribbleHighlightProps>(
  function ScribbleHighlight(
    { children, variant = 'underline', once, amount, ...props },
    forwardedRef,
  ) {
    const ref = useRef<HTMLSpanElement>(null)
    const optionsRef = useRef({ once, amount })

    useIsomorphicLayoutEffect(() => {
      const element = ref.current
      if (!element) return
      return drawInView(element, optionsRef.current)
    }, [])

    return (
      <span
        {...props}
        ref={composeRefs(ref, forwardedRef)}
        data-kida-scribble=""
        data-variant={variant}
        data-state="idle"
      >
        <span data-kida-scribble-content="">{children}</span>
        <svg aria-hidden="true" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d={paths[variant]} pathLength="1" />
        </svg>
      </span>
    )
  },
)
