'use client'

import { type PhotoPileOptions, photoPile } from '@kida-ui/motion'
import type { CSSProperties, HTMLAttributes, ImgHTMLAttributes } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface PhotoPilePhoto {
  /** Stable key for this photo. */
  id: string
  src: string
  alt: string
  /** Horizontal offset from the center, in CSS pixels. */
  x?: number
  /** Vertical offset from the center, in CSS pixels. */
  y?: number
  /** Resting rotation in degrees. */
  rotation?: number
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'draggable'>
}

export interface PhotoPileProps
  extends PhotoPileOptions,
    Omit<HTMLAttributes<HTMLFieldSetElement>, 'children'> {
  photos: readonly PhotoPilePhoto[]
  /** Multiplies the default and authored x/y offsets. @default 1 */
  spread?: number
}

const POSITIONS = [
  { x: -54, y: -10, rotation: -7 },
  { x: 52, y: -18, rotation: 6 },
  { x: 2, y: 30, rotation: -1.5 },
  { x: -24, y: -38, rotation: 4 },
  { x: 38, y: 24, rotation: -5 },
] as const

type ItemStyle = CSSProperties & {
  '--kida-photo-x': string
  '--kida-photo-y': string
  '--kida-photo-rotation': string
}

export const PhotoPile = forwardRef<HTMLFieldSetElement, PhotoPileProps>(function PhotoPile(
  { photos, spread = 1, dragScale, tilt, 'aria-label': ariaLabel, ...props },
  forwardedRef,
) {
  const ref = useRef<HTMLFieldSetElement>(null)
  const photoKey = photos.map((photo) => photo.id).join('\u0000')

  useIsomorphicLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    return photoPile(root, { dragScale, tilt })
  }, [photoKey, dragScale, tilt])

  return (
    <fieldset
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      aria-label={ariaLabel ?? 'Draggable photo pile'}
      data-kida-photo-pile=""
    >
      {photos.map((photo, index) => {
        const fallback = POSITIONS[index % POSITIONS.length] ?? POSITIONS[0]
        const label = photo.alt || `Photo ${index + 1}`
        const style: ItemStyle = {
          '--kida-photo-x': `${(photo.x ?? fallback.x) * spread}px`,
          '--kida-photo-y': `${(photo.y ?? fallback.y) * spread}px`,
          '--kida-photo-rotation': `${photo.rotation ?? fallback.rotation}deg`,
          zIndex: index + 1,
        }

        return (
          <button
            key={photo.id}
            type="button"
            aria-label={`Bring ${label} to front and drag`}
            data-kida-photo-item=""
            style={style}
          >
            <span data-kida-photo-card="">
              <img {...photo.imageProps} src={photo.src} alt={photo.alt} draggable={false} />
            </span>
          </button>
        )
      })}
    </fieldset>
  )
})
