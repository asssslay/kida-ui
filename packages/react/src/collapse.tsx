'use client'

import * as presence from '@zag-js/presence'
import { normalizeProps, useMachine } from '@zag-js/react'
import type { CSSProperties, ReactNode } from 'react'
import { useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface CollapseProps {
  /** Whether the content is shown. */
  open: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
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
export function Collapse({ open, children, className, style, onExitComplete }: CollapseProps) {
  const service = useMachine(presence.machine, { present: open, onExitComplete })
  const api = presence.connect(service, normalizeProps)

  const nodeRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const node = nodeRef.current
    const content = contentRef.current
    if (!node || !content) return

    const measure = () => {
      // The keyframes animate `height` on the root, so the value has to be expressed in
      // whatever box the root's own `box-sizing` measures. Under the near-universal
      // `border-box`, a root with a border or padding of its own would otherwise clip the
      // content by exactly that much and then snap to its natural height when the
      // animation ends. Measuring the content and adding the root's frame keeps the two in
      // step whatever the consumer styles the root with.
      const rootStyle = getComputedStyle(node)
      let height = content.getBoundingClientRect().height
      if (rootStyle.boxSizing === 'border-box') {
        height +=
          Number.parseFloat(rootStyle.paddingTop) +
          Number.parseFloat(rootStyle.paddingBottom) +
          Number.parseFloat(rootStyle.borderTopWidth) +
          Number.parseFloat(rootStyle.borderBottomWidth)
      }
      node.style.setProperty('--kida-collapse-height', `${height}px`)
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  })

  if (!api.present) return null

  return (
    <div
      ref={composeRefs(nodeRef, api.setNode)}
      data-kida-collapse=""
      data-state={open ? 'open' : 'closed'}
      // Set on the very first paint when the content starts open: there is nothing to
      // animate from, and playing the enter keyframes would be a spurious flash.
      data-skip-animation={api.skip ? '' : undefined}
      className={className}
      style={style}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  )
}
