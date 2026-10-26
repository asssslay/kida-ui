'use client'

import {
  getSpaceTypeGeometry,
  type SpaceTypeControls,
  type SpaceTypeGeometry,
  type SpaceTypeOptions,
  spaceType,
} from '@kida-ui/motion'
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface SpaceTypeProps
  extends SpaceTypeOptions,
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'color'> {
  text: string
  /** Number of stacked rings, from 1 to 6. @default 1 */
  rows?: number
  /** Text color; alternatively set --kida-space-type-color. */
  color?: string
  /** Surface color; alternatively set --kida-space-type-background. */
  background?: string
  /** Strength of the pulsing cylinder and tilting letter surface, from 0 to 100. @default 0 */
  longitude?: number
  /** Base radius in pixels, clamped to the available frame. Defaults to auto. */
  radius?: number
  /** Reports fitted geometry and the available radius range after measurement. */
  onGeometryChange?: (geometry: SpaceTypeGeometry | null) => void
}

export const SpaceType = forwardRef<HTMLDivElement, SpaceTypeProps>(function SpaceType(
  {
    text,
    speed = 1,
    paused = false,
    rows = 1,
    color,
    background,
    longitude = 0,
    radius,
    onGeometryChange,
    style,
    ...props
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<SpaceTypeControls | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const rowCount = Number.isFinite(rows) ? Math.max(1, Math.min(6, Math.round(rows))) : 1
  const wave = Number.isFinite(longitude) ? Math.max(0, Math.min(100, longitude)) : 0
  const characters = Array.from(text)
  const geometry = useMemo(
    () => getSpaceTypeGeometry(size.width, size.height, characters.length, rowCount, wave, radius),
    [size.width, size.height, characters.length, rowCount, wave, radius],
  )

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      )
    })
    observer.observe(root)
    const controls = spaceType(root)
    controlsRef.current = controls
    return () => {
      observer.disconnect()
      controls.destroy()
      controlsRef.current = null
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    controlsRef.current?.setPlayback({ speed, paused: paused || characters.length === 0 })
  }, [speed, paused, characters.length])

  useEffect(() => {
    onGeometryChange?.(geometry)
  }, [geometry, onGeometryChange])

  return (
    <div
      {...props}
      ref={composeRefs(rootRef, forwardedRef)}
      data-kida-space-type=""
      style={
        {
          '--kida-space-type-count': Math.max(characters.length, 1),
          '--kida-space-type-rows': rowCount,
          '--kida-space-type-longitude': wave,
          ...(color === undefined ? {} : { '--kida-space-type-color': color }),
          ...(background === undefined ? {} : { '--kida-space-type-background': background }),
          ...(geometry
            ? {
                '--kida-space-type-size': `${geometry.fontSize}px`,
                '--kida-space-type-radius': `${geometry.radius}px`,
                '--kida-space-type-perspective': `${geometry.perspective}px`,
              }
            : {}),
          ...style,
        } as CSSProperties
      }
    >
      <span data-kida-space-type-text="">{text}</span>
      <div data-kida-space-type-space="" aria-hidden="true">
        <div data-kida-space-type-camera="">
          <div data-kida-space-type-ring="">
            {Array.from({ length: rowCount }, (_, row) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: row slots are stable positions without local state
                key={row}
                data-kida-space-type-row=""
                style={{ '--kida-space-type-row': row } as CSSProperties}
              >
                {characters.map((character, index) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: glyph slots preserve rotation while editing text
                    key={index}
                    data-kida-space-type-letter=""
                    style={{ '--kida-space-type-index': index } as CSSProperties}
                  >
                    <span data-kida-space-type-face="front">{character}</span>
                    <span data-kida-space-type-face="back">{character}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
