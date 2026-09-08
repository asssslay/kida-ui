import { describe, expect, test } from 'vitest'
import { stickerBurstLayout } from './sticker-burst.js'

describe('stickerBurstLayout', () => {
  test('creates stable geometry for server rendering and hydration', () => {
    expect(stickerBurstLayout({ count: 5, distance: 72, seed: 12 })).toEqual(
      stickerBurstLayout({ count: 5, distance: 72, seed: 12 }),
    )
    expect(stickerBurstLayout({ count: 5, distance: 72, seed: 12 })).not.toEqual(
      stickerBurstLayout({ count: 5, distance: 72, seed: 13 }),
    )
  })

  test('clamps the public count and distance ranges', () => {
    expect(stickerBurstLayout({ count: 0 })).toHaveLength(1)
    expect(stickerBurstLayout({ count: 99 })).toHaveLength(16)

    const near = stickerBurstLayout({ count: 1, distance: 0, seed: 1 })[0]
    expect(near).toBeDefined()
    expect(Math.hypot(near?.x ?? 0, near?.y ?? 0)).toBeGreaterThanOrEqual(11)
  })
})
