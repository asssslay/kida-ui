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
  SpaceTypeOptions,
  StickerBurstOptions,
  TextBloomOptions,
} from '@kida-ui/motion'
import type { ImgHTMLAttributes } from 'vue'

export type {
  DualWaveLayout,
  GlowHighlightFinish,
  GlowHighlightPalette,
  GlowHighlightTrigger,
  SpaceTypeGeometry,
  TextBloomVoice,
} from '@kida-ui/motion'

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

export interface GlowHighlightProps extends GlowHighlightOptions {
  /** Named color set. Inline --kida-glow-* values override it. @default 'candy' */
  palette?: GlowHighlightPalette
}

export interface ImageTextProps extends ImageTextOptions {
  /** One readable, selectable text sequence. */
  text: string
  /** Semantic root. @default 'h2' */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
}

export interface SpaceTypeProps extends SpaceTypeOptions {
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
}

export interface DualWaveItem {
  /** Stable key for this item. */
  id: string
  /** Shown in the left column, for example a project name. */
  title: string
  /** Shown in the right column, for example a client or credit. */
  subtitle: string
  src: string
  alt: string
  imageProps?: Omit<ImgHTMLAttributes, 'src' | 'alt' | 'draggable'>
}

export interface DualWaveProps extends DualWaveOptions {
  items: readonly DualWaveItem[]
  /** Labels for the title and subtitle columns. @default ['Projects', 'Clients'] */
  headings?: readonly [string, string]
  /** How the photo changes between items. @default 'mosaic' */
  layout?: DualWaveLayout
  /** Mosaic columns, from 2 to 5. Rows follow the 3:4 frame. @default 3 */
  columns?: number
  /** Item shown first. @default 0 */
  defaultIndex?: number
  /** Travels to this item whenever the value changes; supports v-model:index. */
  index?: number
}

/** Vue component refs expose the root DOM element, null when presence removes it. */
export interface KidaElement {
  element: HTMLElement | null
}
