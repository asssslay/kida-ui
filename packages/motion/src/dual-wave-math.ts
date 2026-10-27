/** Wraps any position onto the item loop. */
export const wrapIndex = (position: number, count: number) => ((position % count) + count) % count

/** Signed distance around the loop. Recycled rows always cross outside the visible stage. */
export const itemDistance = (index: number, position: number, count: number) =>
  wrapIndex(index - position + count / 2, count) - count / 2

/** The loop position nearest to `target` that shows `index`. */
export const nearestItemPosition = (index: number, target: number, count: number) =>
  target + itemDistance(index, target, count)

/** Horizontal travel for a row, from 0 to `range`. The phase drifts with position. */
export function waveOffset(distance: number, position: number, range: number) {
  return ((Math.sin(distance * 0.72 + position * 0.18 - Math.PI / 2) + 1) / 2) * range
}

/** Time-based damping keeps the response consistent on 60 Hz and 120 Hz displays. */
export function dampPosition(position: number, target: number, elapsed: number, speed: number) {
  return position + (target - position) * (1 - Math.exp((-elapsed * speed) / 115))
}

/** Mosaic rows that keep the grid close to the frame's 3:4 aspect. */
export const getDualWaveMosaicRows = (columns: number) => Math.round((columns * 4) / 3)

/**
 * Where a mosaic tile starts its hand-off: bottom rows lead, matching the text rising from below,
 * and the middle columns trail slightly so the front curves like the wave. Returns 0..1.
 */
export function tileDelay(column: number, row: number, columns: number, rows: number) {
  const fromBottom = rows > 1 ? (rows - 1 - row) / (rows - 1) : 0
  const bow = columns > 1 ? Math.sin((column / (columns - 1)) * Math.PI) : 0
  return fromBottom * 0.75 + bow * 0.25
}

/** Per-tile progress for a transition. Pure in `t`, so reversing mid-way retraces the cascade. */
export function tileProgress(t: number, delay: number, spread = 1.4) {
  const x = Math.min(1, Math.max(0, t * (1 + spread) - delay * spread))
  return x * x * (3 - 2 * x)
}
