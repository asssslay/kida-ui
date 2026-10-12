import type {
  DrawInViewOptions,
  MagneticOptions,
  PhotoPileOptions,
  RevealOptions,
  StickerBurstOptions,
  TextBloomOptions,
} from '@kida-ui/motion'
import type { ImgHTMLAttributes } from 'vue'

export type { TextBloomVoice } from '@kida-ui/motion'

export type RevealEase = NonNullable<RevealOptions['ease']>

export interface RevealProps extends RevealOptions {
  /** Semantic HTML root. @default 'div' */
  as?: keyof HTMLElementTagNameMap
}

export interface CollapseProps {
  /** Controlled visibility; the node remains mounted until its exit finishes. */
  open: boolean
}

export interface TextBloomProps extends TextBloomOptions {
  /** Plain text, kept readable once while its segments animate. */
  text: string
  /** Segment by words or Unicode code points. @default 'word' */
  by?: 'word' | 'character'
  /** Semantic HTML root. @default 'span' */
  as?: keyof HTMLElementTagNameMap
}

export interface MagneticProps extends MagneticOptions {
  /** Class applied to the moving inner span. */
  targetClass?: string
}

export interface ScribbleHighlightProps extends DrawInViewOptions {
  /** Shape drawn around the default slot. @default 'underline' */
  variant?: 'underline' | 'circle'
}

export interface StickerBurstProps extends StickerBurstOptions {
  /** Decorative symbols repeated through the burst. An empty array uses the defaults. */
  stickers?: readonly string[]
}

export interface PhotoPilePhoto {
  /** Unique, stable key for this photo. */
  id: string
  src: string
  alt: string
  x?: number
  y?: number
  rotation?: number
  imageProps?: Omit<ImgHTMLAttributes, 'src' | 'alt' | 'draggable'>
}

export interface PhotoPileProps extends PhotoPileOptions {
  photos: readonly PhotoPilePhoto[]
  /** Multiplies default and authored x/y offsets. @default 1 */
  spread?: number
}

/** Vue component refs expose the root DOM element, null when presence removes it. */
export interface KidaElement {
  element: HTMLElement | null
}
