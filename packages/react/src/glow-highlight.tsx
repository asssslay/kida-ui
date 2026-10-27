'use client'

import {
  type GlowHighlightControls,
  type GlowHighlightOptions,
  glowHighlight,
} from '@kida-ui/motion'
import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useEffect, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface GlowHighlightProps
  extends GlowHighlightOptions,
    Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode
}

/**
 * The traced copy behind the text is `aria-hidden`, and the engine makes it `inert`, so the
 * content is read and focused exactly once.
 */
export const GlowHighlight = forwardRef<HTMLSpanElement, GlowHighlightProps>(function GlowHighlight(
  {
    children,
    finish = 'glow',
    spread = 1,
    duration = 600,
    trigger = 'view',
    once = true,
    amount = 0.6,
    active = false,
    ...props
  },
  forwardedRef,
) {
  const ref = useRef<HTMLSpanElement>(null)
  const controls = useRef<GlowHighlightControls | null>(null)
  // Read when the controller is created; later changes go through update() and setActive().
  const latest = useRef({ finish, spread, duration, active })
  latest.current = { finish, spread, duration, active }

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const created = glowHighlight(element, { ...latest.current, trigger, once, amount })
    controls.current = created
    return () => {
      created.destroy()
      controls.current = null
    }
  }, [trigger, once, amount])

  useIsomorphicLayoutEffect(() => {
    controls.current?.update({ finish, spread, duration })
  }, [finish, spread, duration])

  useEffect(() => {
    if (trigger === 'manual') controls.current?.setActive(active)
  }, [active, trigger])

  return (
    <span
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      data-kida-glow=""
      data-finish={finish}
      data-state="off"
    >
      <span data-kida-glow-layer="" aria-hidden="true">
        {children}
      </span>
      <span data-kida-glow-content="">{children}</span>
      <svg data-kida-glow-defs="" aria-hidden="true" focusable="false" />
    </span>
  )
})
