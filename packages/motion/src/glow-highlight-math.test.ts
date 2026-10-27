import { describe, expect, test } from 'vitest'
import {
  easeOutBack,
  GLOW_CLOSING,
  GLOW_RINGS,
  type GlowHighlightFinish,
  glowExtent,
  glowRingsPx,
  ringFrame,
  ringWindow,
  stepProgress,
} from './glow-highlight-math.js'

const FINISHES = Object.keys(GLOW_RINGS) as GlowHighlightFinish[]

describe('rings', () => {
  test('the core closes across the line gap of wrapped headlines', () => {
    // From one baseline to the next line's x-height at line-height 1.2 and x-height ~0.5em.
    // A narrower bridge joins only at ascenders and descenders and leaves holes.
    const lineGap = 1.2 - 0.5
    for (const finish of ['glow', 'sticker'] as const) {
      const core = GLOW_RINGS[finish][0]?.radius ?? 0
      expect(2 * (core + GLOW_CLOSING.y)).toBeGreaterThanOrEqual(lineGap)
    }
    // Horizontally it stays tighter, so a single word keeps its letter-shaped notches.
    expect(GLOW_CLOSING.x).toBeLessThan(GLOW_CLOSING.y)
  })

  test.each(FINISHES)('%s rings grow outward from the glyphs', (finish) => {
    const visible = GLOW_RINGS[finish].filter((ring) => !ring.dy)
    for (let i = 1; i < visible.length; i++) {
      expect(visible[i]?.radius).toBeGreaterThan(visible[i - 1]?.radius ?? 0)
    }
  })

  test('pixel sizes follow the font size and spread', () => {
    const small = glowRingsPx('glow', 20)
    const large = glowRingsPx('glow', 40)
    const spread = glowRingsPx('glow', 20, 1.5)
    small.forEach((ring, i) => {
      expect(large[i]?.radius).toBeCloseTo(ring.radius * 2)
      expect(spread[i]?.radius).toBeCloseTo(ring.radius * 1.5)
    })
  })

  test('the extent covers the furthest ring, its blur and the sticker shadow', () => {
    expect(glowExtent('glow')).toBeCloseTo(0.225 + 0.045 * 3)
    expect(glowExtent('sticker')).toBeGreaterThan(0.145 + 0.04)
    expect(glowExtent('glow', 1.5)).toBeGreaterThan(glowExtent('glow'))
  })
})

describe('timeline', () => {
  test('ring windows stagger from the core and the last one ends on 1', () => {
    expect(ringWindow(0, 4).start).toBe(0)
    expect(ringWindow(3, 4).end).toBeCloseTo(1)
    expect(ringWindow(1, 4).start).toBeGreaterThan(ringWindow(0, 4).start)
    expect(ringWindow(0, 1)).toEqual({ start: 0, end: 1 })
  })

  test('the overshoot ease starts at 0, ends at 1 and peaks gently', () => {
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => easeOutBack(i / 100)))
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.06)
  })

  test('every ring is empty at 0 and complete at 1', () => {
    for (let i = 0; i < 4; i++) {
      expect(ringFrame(0, i, 4)).toEqual({ grow: 0, alpha: 0 })
      const end = ringFrame(1, i, 4)
      expect(end.grow).toBeCloseTo(1)
      expect(end.alpha).toBeCloseTo(1)
    }
  })

  test('the core leads and outer rings follow', () => {
    const early = 0.2
    expect(ringFrame(early, 0, 4).grow).toBeGreaterThan(ringFrame(early, 3, 4).grow)
    expect(ringFrame(early, 3, 4).grow).toBe(0)
  })

  test('progress is the only state, so reversing retraces the same frames', () => {
    const forward = ringFrame(0.4, 2, 4)
    const backward = ringFrame(stepProgress(0.6, 0, 120, 600), 2, 4)
    expect(backward.grow).toBeCloseTo(forward.grow)
    expect(backward.alpha).toBeCloseTo(forward.alpha)
  })

  test('progress steps toward the target, clamps and handles zero duration', () => {
    expect(stepProgress(0, 1, 300, 600)).toBeCloseTo(0.5)
    expect(stepProgress(0.9, 1, 300, 600)).toBe(1)
    expect(stepProgress(0.5, 0, 150, 600)).toBeCloseTo(0.25)
    expect(stepProgress(0.1, 0, 300, 600)).toBe(0)
    expect(stepProgress(0.3, 1, 16, 0)).toBe(1)
  })
})
