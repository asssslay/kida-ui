'use client'

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
 * The root's own vertical frame: the border widths and padding the consumer styled it
 * with. `height: 0` is not the same as invisible — a bordered root still renders that
 * much box — so the keyframes collapse these too, and they need real values to do it.
 */
interface Frame {
  paddingTop: number
  paddingBottom: number
  borderTopWidth: number
  borderBottomWidth: number
  borderBox: boolean
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches
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
  const frameRef = useRef<Frame | null>(null)

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

    const readFrame = (): Frame => {
      // `getComputedStyle` reports whatever the keyframes are currently applying, and the
      // frame is exactly what they drive. Read straight, an opening collapse would measure
      // its own first keyframe — a zeroed border — and animate towards that instead of
      // away from it, so the animation is suppressed across the read.
      const restore = node.style.animationName
      node.style.animationName = 'none'
      const rootStyle = getComputedStyle(node)
      const frame = {
        paddingTop: Number.parseFloat(rootStyle.paddingTop),
        paddingBottom: Number.parseFloat(rootStyle.paddingBottom),
        borderTopWidth: Number.parseFloat(rootStyle.borderTopWidth),
        borderBottomWidth: Number.parseFloat(rootStyle.borderBottomWidth),
        borderBox: rootStyle.boxSizing === 'border-box',
      }
      node.style.animationName = restore
      return frame
    }

    const measure = () => {
      // Refreshed only while nothing is in flight: suppressing a running animation to
      // measure would restart it, and the frame cannot meaningfully change mid-collapse.
      if (frameRef.current === null || node.getAnimations().length === 0) {
        frameRef.current = readFrame()
      }
      const frame = frameRef.current

      // The keyframes animate `height` on the root, so the value has to be expressed in
      // whatever box the root's own `box-sizing` measures. Under the near-universal
      // `border-box`, a root with a border or padding of its own would otherwise clip the
      // content by exactly that much and then snap to its natural height when the
      // animation ends. Measuring the content and adding the root's frame keeps the two in
      // step whatever the consumer styles the root with.
      let height = content.getBoundingClientRect().height
      if (frame.borderBox) {
        height +=
          frame.paddingTop + frame.paddingBottom + frame.borderTopWidth + frame.borderBottomWidth
      }

      node.style.setProperty('--kida-collapse-height', `${height}px`)
      // Handed to the keyframes, which cannot read the root's own frame themselves.
      node.style.setProperty('--kida-collapse-padding-top', `${frame.paddingTop}px`)
      node.style.setProperty('--kida-collapse-padding-bottom', `${frame.paddingBottom}px`)
      node.style.setProperty('--kida-collapse-border-top-width', `${frame.borderTopWidth}px`)
      node.style.setProperty('--kida-collapse-border-bottom-width', `${frame.borderBottomWidth}px`)
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
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
