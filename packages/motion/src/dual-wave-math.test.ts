import { assert, test } from 'vitest'
import {
  dampPosition,
  getDualWaveMosaicRows,
  itemDistance,
  nearestItemPosition,
  tileDelay,
  tileProgress,
  waveOffset,
  wrapIndex,
} from './dual-wave-math.js'

test('navigation loops in both directions, including after many complete cycles', () => {
  assert.equal(wrapIndex(-1, 24), 23)
  assert.equal(wrapIndex(24, 24), 0)
  assert.equal(wrapIndex(24 * 100 + 6, 24), 6)
  assert.equal(nearestItemPosition(0, 23, 24), 24)
  assert.equal(nearestItemPosition(23, 0, 24), -1)
  assert.equal(nearestItemPosition(2, 24 * 100 + 23, 24), 24 * 101 + 2)
})

test('the last and first rows remain adjacent through the loop boundary', () => {
  for (const position of [23, 23.25, 23.5, 23.75, 24]) {
    assert.equal(itemDistance(0, position, 24) - itemDistance(23, position, 24), 1)
    assert.equal(wrapIndex(Math.round(position), 24), position < 23.5 ? 23 : 0)
  }
})

test('recycled rows stay outside the stage for short lists', () => {
  for (const count of [2, 3, 5]) {
    for (let position = 0; position <= count; position += 0.125) {
      for (let index = 0; index < count; index++) {
        assert.isAtMost(Math.abs(itemDistance(index, position, count)), count / 2)
      }
    }
  }
})

test('damping covers the same distance at 30, 60, and 120 Hz without overshoot', () => {
  const endpoints = [30, 60, 120].map((fps) => {
    let position = 6
    for (let frame = 0; frame < fps; frame++) {
      position = dampPosition(position, 7, 1000 / fps, 1)
      assert.ok(position >= 6 && position <= 7)
    }
    return position
  })
  for (const position of endpoints) assert.ok(Math.abs(position - (endpoints[0] ?? 0)) < 1e-12)
  assert.ok(Math.abs((endpoints[0] ?? 0) - 7) < 0.001)
})

test('a rapid reversal converges toward the new target, including a delayed frame', () => {
  let position = dampPosition(6, 10, 100, 1)
  assert.ok(position > 6 && position < 10)
  position = dampPosition(position, 3, 1000, 1)
  assert.ok(position >= 3 && position < 3.001)
  assert.equal(dampPosition(position, 0, 0, 1), position)
})

test('wave offsets stay inside the measured column space', () => {
  for (let position = -48; position <= 48; position += 0.25) {
    for (let row = 0; row < 24; row++) {
      const offset = waveOffset(itemDistance(row, position, 24), position, 120)
      assert.ok(offset >= 0 && offset <= 120)
    }
  }
  assert.equal(waveOffset(3, 8, 0), 0)
})

test('mosaic rows follow a 3:4 frame for every supported column count', () => {
  assert.deepEqual([2, 3, 4, 5].map(getDualWaveMosaicRows), [3, 4, 5, 7])
})

test('every mosaic tile hands off completely between neighbouring items', () => {
  for (const columns of [1, 2, 3, 4, 5]) {
    const rows = getDualWaveMosaicRows(columns)
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const delay = tileDelay(column, row, columns, rows)
        assert.ok(delay >= 0 && delay <= 1)
        assert.equal(tileProgress(0, delay), 0)
        assert.equal(tileProgress(1, delay), 1)
      }
    }
  }
})

test('the mosaic cascade starts at the bottom row and never runs backwards', () => {
  const bottom = tileDelay(0, 3, 3, 4)
  const top = tileDelay(0, 0, 3, 4)
  assert.ok(tileProgress(0.4, bottom) > tileProgress(0.4, top))
  let previous = 0
  for (let t = 0; t <= 1; t += 0.05) {
    const progress = tileProgress(t, tileDelay(1, 1, 3, 4))
    assert.ok(progress >= previous)
    previous = progress
  }
})
