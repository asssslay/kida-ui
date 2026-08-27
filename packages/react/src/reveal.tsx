'use client'

import { type RevealOptions, reveal, revealInitialStyle } from '@kida-ui/motion'
import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useRef } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface RevealProps extends RevealOptions {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** Element to render. @default 'div' */
  as?: ElementType
}

/**
 * Animates its children in when scrolled into view.
 *
 * The pre-animation state is rendered inline on the very first paint — including during
 * SSR — so the content never flashes at full opacity before the effect runs.
 *
 * Options are read once, on mount. A reveal that restarts because a parent re-rendered
 * with a new inline `ease` array would be a visible glitch, not a feature.
 */
export function Reveal({ as: Tag = 'div', children, className, style, ...options }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    return reveal(element, optionsRef.current)
  }, [])

  return (
    <Tag
      ref={ref}
      className={className}
      data-kida-reveal=""
      style={{ ...revealInitialStyle(options), ...style }}
    >
      {children}
    </Tag>
  )
}
