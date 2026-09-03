'use client'

import { type MagneticOptions, magnetic } from '@kida-ui/motion'
import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface MagneticProps extends MagneticOptions, HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode
  targetClassName?: string
}

export const Magnetic = forwardRef<HTMLSpanElement, MagneticProps>(function Magnetic(
  { strength, maxDistance, children, targetClassName, ...props },
  forwardedRef,
) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const targetRef = useRef<HTMLSpanElement>(null)
  const optionsRef = useRef({ strength, maxDistance })

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    const target = targetRef.current
    if (!root || !target) return
    return magnetic(root, target, optionsRef.current)
  }, [])

  return (
    <span {...props} ref={composeRefs(rootRef, forwardedRef)} data-kida-magnetic="">
      <span ref={targetRef} className={targetClassName} data-kida-magnetic-target="">
        {children}
      </span>
    </span>
  )
})
