'use client'

/*
 * AI agent notes: GlowHighlight
 *
 * Change the look with props only; the component has no runtime controls. Do not edit the
 * motion engine or glow-highlight.css to restyle one usage: they apply to every instance.
 *
 * Settings and defaults:
 *   finish    'glow' | 'sticker' | 'halo'                    default 'glow'
 *   palette   'candy' | 'sorbet' | 'berry' | 'after-dark'    default 'candy'
 *   spread    ring size multiplier, clamped 0–3              default 1
 *   duration  ms to grow or fold away                        default 600
 *   trigger   'view' | 'hover' | 'manual'                    default 'view'
 *   once      view: stay lit after the first entry           default true
 *   amount    view: visible fraction (0–1) needed to start   default 0.6
 *   active    manual: whether the glow is on                 default false
 *
 * To reproduce a docs look exactly, copy finish, palette, spread, duration, and trigger.
 * Any setting left out falls back to its default.
 *   Playful     <GlowHighlight>Playful</GlowHighlight>
 *   Sticker     <GlowHighlight finish="sticker" spread={0.8}>Sticker</GlowHighlight>
 *   Halo        <GlowHighlight finish="halo" spread={1.2} duration={900}>Halo</GlowHighlight>
 *   After dark  <GlowHighlight finish="sticker" palette="after-dark">after dark</GlowHighlight>
 *               Use on a dark surface with light text.
 *
 * Colors beyond the palettes: set --kida-glow-core, --kida-glow-rim, --kida-glow-band, and
 * --kida-glow-fringe in `style` on the component. A class loaded before this component's
 * CSS does not override them.
 *
 * `hover` follows the nearest link, button, label, summary, or [tabindex] element, including
 * the highlight itself, so keyboard focus lights it too. Keep it to a word or short phrase:
 * every growing instance redraws its filter each frame. Reduced motion is handled inside;
 * do not add your own checks.
 */

import {
  type GlowHighlightControls,
  type GlowHighlightOptions,
  type GlowHighlightPalette,
  glowHighlight,
} from '@kida-ui/motion'
import type { HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useEffect, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface GlowHighlightProps
  extends GlowHighlightOptions,
    Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Named color set. Inline --kida-glow-* values override it. @default 'candy' */
  palette?: GlowHighlightPalette
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
    palette = 'candy',
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
      data-palette={palette}
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
