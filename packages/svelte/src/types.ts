import type {
  DrawInViewOptions,
  DualWaveLayout,
  DualWaveOptions,
  GlowHighlightOptions,
  GlowHighlightPalette,
  ImageTextOptions,
  MagneticOptions,
  PhotoPileOptions,
  RevealOptions,
  SpaceTypeGeometry,
  SpaceTypeOptions,
  StickerBurstOptions,
  TextBloomOptions,
} from '@kida-ui/motion'
import type { HTMLAttributes, HTMLImgAttributes } from 'svelte/elements'

export type {
  DualWaveLayout,
  GlowHighlightFinish,
  GlowHighlightPalette,
  GlowHighlightTrigger,
  SpaceTypeGeometry,
  TextBloomVoice,
} from '@kida-ui/motion'

export type RevealEase = NonNullable<RevealOptions['ease']>

type TextAttributes<T extends EventTarget> = Omit<HTMLAttributes<T>, 'children'>

export interface RevealProps extends RevealOptions, HTMLAttributes<HTMLElement> {
  /** Semantic HTML root. @default 'div' */
  as?: keyof HTMLElementTagNameMap
  /** Bind to read the root DOM element; null after unmount. */
  element?: HTMLElement | null
}

export interface CollapseProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onExitComplete?: () => void
  element?: HTMLDivElement | null
}

export interface TextBloomProps extends TextBloomOptions, TextAttributes<HTMLElement> {
  text: string
  by?: 'word' | 'character'
  as?: keyof HTMLElementTagNameMap
  element?: HTMLElement | null
}

export interface MagneticProps extends MagneticOptions, HTMLAttributes<HTMLSpanElement> {
  /** Class applied to the moving inner span. */
  targetClass?: string
  /** Bind to read the root DOM element; null after unmount. */
  element?: HTMLSpanElement | null
}

export interface ScribbleHighlightProps extends DrawInViewOptions, HTMLAttributes<HTMLSpanElement> {
  variant?: 'underline' | 'circle'
  element?: HTMLSpanElement | null
}

export interface StickerBurstProps extends StickerBurstOptions, HTMLAttributes<HTMLSpanElement> {
  stickers?: readonly string[]
  element?: HTMLSpanElement | null
}

export interface PhotoPilePhoto {
  id: string
  src: string
  alt: string
  x?: number
  y?: number
  rotation?: number
  imageProps?: Omit<HTMLImgAttributes, 'src' | 'alt' | 'draggable'>
}

export interface PhotoPileProps extends PhotoPileOptions, TextAttributes<HTMLFieldSetElement> {
  photos: readonly PhotoPilePhoto[]
  spread?: number
  element?: HTMLFieldSetElement | null
}

export interface GlowHighlightProps extends GlowHighlightOptions, HTMLAttributes<HTMLSpanElement> {
  palette?: GlowHighlightPalette
  element?: HTMLSpanElement | null
}

export interface ImageTextProps extends ImageTextOptions, TextAttributes<HTMLElement> {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  element?: HTMLElement | null
}

export interface SpaceTypeProps extends SpaceTypeOptions, TextAttributes<HTMLDivElement> {
  text: string
  rows?: number
  color?: string
  background?: string
  longitude?: number
  radius?: number
  onGeometryChange?: (geometry: SpaceTypeGeometry | null) => void
  element?: HTMLDivElement | null
}

export interface DualWaveItem {
  id: string
  title: string
  subtitle: string
  src: string
  alt: string
  imageProps?: Omit<HTMLImgAttributes, 'src' | 'alt' | 'draggable'>
}

export interface DualWaveProps extends DualWaveOptions, TextAttributes<HTMLElement> {
  items: readonly DualWaveItem[]
  headings?: readonly [string, string]
  layout?: DualWaveLayout
  columns?: number
  defaultIndex?: number
  index?: number
  onIndexChange?: (index: number) => void
  element?: HTMLElement | null
}
