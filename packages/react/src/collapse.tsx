'use client'

import {
  type CollapseSizeObserver,
  observeCollapseSize,
  prefersReducedMotion,
} from '@kida-ui/motion'
import * as presence from '@zag-js/presence'
import { normalizeProps, useMachine } from '@zag-js/react'
import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface CollapseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Whether the content is shown. */
  open: boolean
  children?: ReactNode
  /** Fires after the exit animation has finished and the node has been removed. */
  onExitComplete?: () => void
}

/**
 * Height collapse with a real exit animation.
 *
 * This is the CSS-driven half of ADR D5: `@zag-js/presence` keeps the node mounted until
 * the `kida-collapse-close` keyframes finish, and the keyframes themselves live in
 * `@kida-ui/styles`. No JS animation engine is involved — which is exactly why the same
 * stylesheet will drive this component in Svelte or Vue without changes.
 *
 * The natural height is measured into `--kida-collapse-height`, because CSS cannot
 * animate to `height: auto`.
 */
export const Collapse = forwardRef<HTMLDivElement, CollapseProps>(function Collapse(
  { open, children, onExitComplete, ...props },
  forwardedRef,
) {
  const service = useMachine(presence.machine, { present: open, onExitComplete })
  const api = presence.connect(service, normalizeProps)

  const nodeRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef<CollapseSizeObserver | null>(null)

  useIsomorphicLayoutEffect(() => {
    // A reduced-motion exit has no CSS animation to produce the animationend event that
    // presence normally waits for. Complete the lifecycle synchronously instead of leaving
    // an invisible closed node mounted indefinitely.
    if (!open && prefersReducedMotion()) api.unmount()
  }, [open])

  useIsomorphicLayoutEffect(() => {
    const node = nodeRef.current
    const content = contentRef.current
    if (!node || !content) return

    const size = observeCollapseSize(node, content)
    sizeRef.current = size
    return () => {
      size.disconnect()
      sizeRef.current = null
    }
  }, [api.present])

  useIsomorphicLayoutEffect(() => {
    sizeRef.current?.measure()
  })

  if (!api.present) return null

  return (
    <div
      {...props}
      ref={composeRefs(nodeRef, api.setNode, forwardedRef)}
      data-kida-collapse=""
      data-state={open ? 'open' : 'closed'}
      // Set on the very first paint when the content starts open: there is nothing to
      // animate from, and playing the enter keyframes would be a spurious flash.
      data-skip-animation={api.skip ? '' : undefined}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
})
