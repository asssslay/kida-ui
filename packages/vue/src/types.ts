import type { RevealOptions } from '@kida-ui/motion'

export type RevealEase = NonNullable<RevealOptions['ease']>

export interface RevealProps extends RevealOptions {
  /** Semantic HTML root. @default 'div' */
  as?: keyof HTMLElementTagNameMap
}

export interface CollapseProps {
  /** Controlled visibility; the node remains mounted until its exit finishes. */
  open: boolean
}

/** Vue component refs expose the root DOM element, null when presence removes it. */
export interface KidaElement {
  element: HTMLElement | null
}
