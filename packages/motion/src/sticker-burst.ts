import { prefersReducedMotion } from './reduced-motion.js'

export interface StickerBurstPoint {
  x: number
  y: number
  rotation: number
  delay: number
  scale: number
}

export interface StickerBurstOptions {
  /** Number of decorative pieces. @default 8 */
  count?: number
  /** Maximum travel in CSS pixels. @default 64 */
  distance?: number
  /** Stable layout seed. @default 17 */
  seed?: number
}

const DEFAULTS = { count: 8, distance: 64, seed: 17 } as const

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable geometry keeps server output and hydration identical. */
export function stickerBurstLayout(options: StickerBurstOptions = {}): StickerBurstPoint[] {
  const count = Math.max(1, Math.min(16, Math.round(options.count ?? DEFAULTS.count)))
  const distance = Math.max(16, options.distance ?? DEFAULTS.distance)
  const next = random(options.seed ?? DEFAULTS.seed)

  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count + (next() - 0.5) * 0.3
    const radius = distance * (0.72 + next() * 0.28)
    return {
      x: Math.round(Math.cos(angle) * radius * 100) / 100,
      y: Math.round(Math.sin(angle) * radius * 100) / 100,
      rotation: Math.round((next() * 100 - 50) * 100) / 100,
      delay: Math.round(index * 18 + next() * 18),
      scale: Math.round((0.82 + next() * 0.36) * 100) / 100,
    }
  })
}

/** Replays the CSS burst for pointer and keyboard-generated clicks. */
export function stickerBurst(root: HTMLElement): () => void {
  root.dataset.state = 'idle'
  if (prefersReducedMotion()) return () => {}

  const replay = () => {
    root.dataset.state = 'idle'
    // A single layout read per intentional trigger restarts the finite CSS animation.
    void root.offsetWidth
    root.dataset.state = 'active'
  }

  root.addEventListener('click', replay)
  return () => {
    root.removeEventListener('click', replay)
    root.dataset.state = 'idle'
  }
}
