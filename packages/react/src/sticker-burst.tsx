'use client'

import { type StickerBurstOptions, stickerBurst, stickerBurstLayout } from '@kida-ui/motion'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface StickerBurstProps
  extends StickerBurstOptions,
    Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode
  /** Decorative symbols repeated through the burst. */
  stickers?: readonly string[]
}

const DEFAULT_STICKERS = ['✦', '●', '♥', '★'] as const

type PieceStyle = CSSProperties & {
  '--kida-sticker-x': string
  '--kida-sticker-y': string
  '--kida-sticker-rotation': string
  '--kida-sticker-delay': string
  '--kida-sticker-scale': number
}

export const StickerBurst = forwardRef<HTMLSpanElement, StickerBurstProps>(function StickerBurst(
  { children, stickers = DEFAULT_STICKERS, count, distance, seed, ...props },
  forwardedRef,
) {
  const ref = useRef<HTMLSpanElement>(null)
  const points = stickerBurstLayout({ count, distance, seed })
  const symbols = stickers.length > 0 ? stickers : DEFAULT_STICKERS

  useIsomorphicLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    return stickerBurst(root)
  }, [])

  return (
    <span
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      data-kida-sticker-burst=""
      data-state="idle"
    >
      <span data-kida-sticker-content="">{children}</span>
      <span aria-hidden="true" data-kida-sticker-layer="">
        {points.map((point, index) => {
          const style: PieceStyle = {
            '--kida-sticker-x': `${point.x}px`,
            '--kida-sticker-y': `${point.y}px`,
            '--kida-sticker-rotation': `${point.rotation}deg`,
            '--kida-sticker-delay': `${point.delay}ms`,
            '--kida-sticker-scale': point.scale,
          }
          return (
            <span key={`${point.x}-${point.y}-${point.delay}`} style={style}>
              {symbols[index % symbols.length]}
            </span>
          )
        })}
      </span>
    </span>
  )
})
