'use client'

import {
  type ImageTextControls,
  type ImageTextOptions,
  imageText,
  imageTextStyle,
} from '@kida-ui/motion'
import { type CSSProperties, forwardRef, type HTMLAttributes, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface ImageTextProps
  extends ImageTextOptions,
    Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export const ImageText = forwardRef<HTMLElement, ImageTextProps>(function ImageText(
  { as: Tag = 'h2', children, image, position, duration, zoom, paused = false, style, ...props },
  forwardedRef,
) {
  const ref = useRef<HTMLElement>(null)
  const controller = useRef<ImageTextControls | null>(null)
  // Playback updates are independent of loading/measurement and preserve the current frame.
  const initialPaused = useRef(paused)

  useIsomorphicLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const next = imageText(root, { image, duration, zoom, paused: initialPaused.current })
    controller.current = next
    return () => {
      next.destroy()
      controller.current = null
    }
  }, [Tag, children, duration, image, zoom])

  useIsomorphicLayoutEffect(() => {
    initialPaused.current = paused
    controller.current?.setPaused(paused)
  }, [paused])

  return (
    <Tag
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      style={{ ...imageTextStyle({ image, position, duration }), ...style } as CSSProperties}
      data-kida-image-text=""
      data-image="loading"
      data-state="pending"
      data-suspended="true"
      data-paused={paused}
    >
      {children}
    </Tag>
  )
})
