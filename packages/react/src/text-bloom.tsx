'use client'

import { type TextBloomOptions, textBloom, textBloomInitialStyle } from '@kida-ui/motion'
import type { CSSProperties, ElementType, HTMLAttributes } from 'react'
import { forwardRef, useRef } from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface TextBloomProps
  extends TextBloomOptions,
    Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children: string
  /** Segment by words or Unicode characters. @default 'word' */
  by?: 'word' | 'character'
  /** Element to render. @default 'span' */
  as?: ElementType
}

function splitText(text: string, by: 'word' | 'character') {
  return by === 'character' ? Array.from(text) : text.split(/(\s+)/)
}

export const TextBloom = forwardRef<HTMLElement, TextBloomProps>(function TextBloom(
  {
    as: Tag = 'span',
    by = 'word',
    voice = 'gentle',
    stagger,
    delay,
    duration,
    once,
    amount,
    children,
    ...props
  },
  forwardedRef,
) {
  const ref = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    return textBloom(element, { voice, stagger, delay, duration, once, amount })
  }, [Tag, amount, by, children, delay, duration, once, stagger, voice])

  let cursor = 0
  return (
    <Tag
      {...props}
      ref={composeRefs(ref, forwardedRef)}
      data-kida-text-bloom=""
      data-state="idle"
      aria-label={props['aria-label'] ?? children}
    >
      <span aria-hidden="true">
        {splitText(children, by).map((segment) => {
          const key = `${cursor}-${segment}`
          cursor += segment.length
          if (/^\s+$/.test(segment)) return segment
          return (
            <span
              key={key}
              data-kida-text-bloom-segment=""
              style={textBloomInitialStyle(voice) as CSSProperties}
            >
              {segment}
            </span>
          )
        })}
      </span>
    </Tag>
  )
})
