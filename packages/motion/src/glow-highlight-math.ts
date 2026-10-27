/**
 * Pure geometry and timing for GlowHighlight. No DOM, so it is unit-testable.
 *
 * A glow is a stack of rings traced around the glyphs. Each ring is the text's alpha grown
 * outward by `radius`, rounded, then softened by `soft`. Lengths are in em so the effect
 * follows the font size; the engine converts them to CSS pixels for the SVG filter.
 */

export type GlowHighlightFinish = 'glow' | 'sticker' | 'halo'

export type GlowHighlightPalette = 'candy' | 'sorbet' | 'berry' | 'after-dark'

export interface GlowPaletteColors {
  core: string
  rim: string
  band: string
  fringe: string
}

/**
 * Named colour sets. The stylesheet applies them through `data-palette`; these values mirror
 * it for tooling and docs, and a test keeps the two identical. Candy is the default.
 */
export const GLOW_PALETTES: Record<GlowHighlightPalette, GlowPaletteColors> = {
  candy: { core: '#e94f86', rim: '#ffe1ec', band: '#ffd76a', fringe: '#ff8a3d' },
  sorbet: { core: '#ffb07a', rim: '#fff0e4', band: '#ffd76a', fringe: '#e94f86' },
  berry: { core: '#cdbdff', rim: '#f6f1ff', band: '#f9a8c9', fringe: '#e94f86' },
  // Deeper core so light text keeps its contrast on dark surfaces.
  'after-dark': { core: '#8f2350', rim: '#c23a6e', band: '#ffd76a', fringe: '#ff8a3d' },
}

export interface GlowRing {
  /** Custom property that supplies the ring colour. */
  color: string
  /** Distance grown outward from the glyph edge, in em. */
  radius: number
  /** Edge blur, in em. `0` keeps a crisp, die-cut edge. */
  soft: number
  /** Peak opacity of the ring. */
  opacity: number
  /** Vertical offset, in em. Used for the sticker's paper shadow. */
  dy?: number
}

/** Rings from the innermost (drawn on top) to the outermost (drawn underneath). */
export const GLOW_RINGS: Record<GlowHighlightFinish, readonly GlowRing[]> = {
  // Closest to the reference: a filled core, a pale rim, then warmer bands that soften outward.
  glow: [
    { color: '--kida-glow-core', radius: 0.075, soft: 0.005, opacity: 1 },
    { color: '--kida-glow-rim', radius: 0.11, soft: 0.006, opacity: 1 },
    { color: '--kida-glow-band', radius: 0.17, soft: 0.014, opacity: 1 },
    { color: '--kida-glow-fringe', radius: 0.225, soft: 0.045, opacity: 0.95 },
  ],
  // Cut-paper: crisp edges and a small, hard shadow instead of an ambient glow.
  sticker: [
    { color: '--kida-glow-core', radius: 0.07, soft: 0, opacity: 1 },
    { color: '--kida-glow-rim', radius: 0.11, soft: 0, opacity: 1 },
    { color: '--kida-glow-fringe', radius: 0.145, soft: 0, opacity: 1 },
    { color: '--kida-glow-shadow', radius: 0.145, soft: 0.006, opacity: 1, dy: 0.045 },
  ],
  // No fill behind the letters: a quiet light that stays legible inside body copy.
  halo: [
    { color: '--kida-glow-rim', radius: 0.05, soft: 0.05, opacity: 0.95 },
    { color: '--kida-glow-band', radius: 0.11, soft: 0.08, opacity: 0.8 },
    { color: '--kida-glow-fringe', radius: 0.18, soft: 0.12, opacity: 0.55 },
  ],
}

/**
 * Extra grow-then-shrink, in em, so the core reads as one shape. Horizontally it closes
 * counters and word spaces but keeps the notches that make the outline follow the letters.
 * Vertically it is larger to bridge the line gap of wrapped text; otherwise the core joins
 * only where ascenders and descenders reach across and the rim shows through as holes.
 */
export const GLOW_CLOSING = { x: 0.14, y: 0.3 } as const

/** The ring furthest from the glyphs, including blur. Used to size the filter region. */
export function glowExtent(finish: GlowHighlightFinish, spread = 1): number {
  return Math.max(
    ...GLOW_RINGS[finish].map((ring) => ring.radius * spread + ring.soft * 3 + (ring.dy ?? 0)),
  )
}

export interface GlowRingPx {
  color: string
  radius: number
  soft: number
  opacity: number
  dy: number
}

/** Converts the em-based rings to CSS pixels for a font size and spread multiplier. */
export function glowRingsPx(
  finish: GlowHighlightFinish,
  fontSize: number,
  spread = 1,
): GlowRingPx[] {
  return GLOW_RINGS[finish].map((ring) => ({
    color: ring.color,
    radius: ring.radius * spread * fontSize,
    soft: ring.soft * Math.sqrt(spread) * fontSize,
    opacity: ring.opacity,
    dy: (ring.dy ?? 0) * fontSize,
  }))
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Ease-out with a small overshoot. `overshoot` 1.2 peaks at roughly 5%. */
export function easeOutBack(x: number, overshoot = 1.2): number {
  const t = x - 1
  return 1 + (overshoot + 1) * t * t * t + overshoot * t * t
}

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3

/** Fraction of the timeline between one ring starting and the next. */
export const GLOW_STAGGER = 0.14

/** The slice of the 0..1 timeline in which ring `index` grows. Inner rings lead. */
export function ringWindow(index: number, count: number, stagger = GLOW_STAGGER) {
  const length = 1 - stagger * Math.max(0, count - 1)
  const start = stagger * index
  return { start, end: start + length }
}

export interface RingFrame {
  /** Multiplier on the ring radius. Overshoots slightly past 1 while growing. */
  grow: number
  /** Multiplier on the ring opacity, 0..1. */
  alpha: number
}

/**
 * The state of one ring at timeline position `progress`.
 *
 * The mapping is a pure function of progress, so reversing mid-flight is just moving progress
 * the other way: the outer rings collapse first and the glow folds back into the letters.
 */
export function ringFrame(progress: number, index: number, count: number): RingFrame {
  const { start, end } = ringWindow(index, count)
  const local = clamp01((progress - start) / (end - start))
  return {
    grow: local === 0 ? 0 : easeOutBack(local),
    alpha: easeOutCubic(clamp01(local / 0.55)),
  }
}

/** Advances progress linearly toward `target` at a rate set by `duration` (ms). */
export function stepProgress(
  progress: number,
  target: number,
  elapsed: number,
  duration: number,
): number {
  if (duration <= 0) return target
  const delta = elapsed / duration
  return target > progress ? Math.min(target, progress + delta) : Math.max(target, progress - delta)
}
