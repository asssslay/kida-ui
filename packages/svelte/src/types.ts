import type { MagneticOptions, RevealOptions } from '@kida-ui/motion'
import type { HTMLAttributes } from 'svelte/elements'

export type RevealEase = NonNullable<RevealOptions['ease']>

export interface RevealProps extends RevealOptions, HTMLAttributes<HTMLElement> {
  /** Semantic HTML root. @default 'div' */
  as?: keyof HTMLElementTagNameMap
  /** Bind to read the root DOM element; null after unmount. */
  element?: HTMLElement | null
}

export interface MagneticProps extends MagneticOptions, HTMLAttributes<HTMLSpanElement> {
  /** Class applied to the moving inner span. */
  targetClass?: string
  /** Bind to read the root DOM element; null after unmount. */
  element?: HTMLSpanElement | null
}
