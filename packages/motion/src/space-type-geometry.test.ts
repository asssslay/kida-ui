import { assert, test } from 'vitest'
import { getSpaceTypeGeometry } from './space-type-geometry.js'

test('radius keeps every glyph inside the frame throughout rotation and longitude waves', () => {
  for (const [width, height] of [
    [180, 240],
    [342, 240],
    [720, 400],
    [912, 448],
  ] as const) {
    for (const count of [1, 8, 38, 100]) {
      for (const rows of [1, 3, 6]) {
        for (const longitude of [0, 50, 100]) {
          for (const requestedRadius of [undefined, 0, Number.MAX_VALUE]) {
            const geometry = getSpaceTypeGeometry(
              width,
              height,
              count,
              rows,
              longitude,
              requestedRadius,
            )
            if (!geometry) throw new Error('Geometry was not measured')
            const { fontSize, radius, perspective } = geometry
            const amplitude = radius * longitude * 0.0032
            const rowPhase = (Math.PI * 12) / count
            const context = `${width}×${height}, ${count} letters, ${rows} rows, longitude ${longitude}`
            let extentX = 0
            let extentY = 0
            // Project actual glyph corners through the camera, independently of the bounds formula.
            for (let phase = 0; phase < Math.PI * 2; phase += Math.PI / 4) {
              for (let row = 0; row < rows; row++) {
                const waveAngle = phase + row * rowPhase
                const rowRadius = radius + Math.sin(waveAngle) * amplitude
                const surfaceTilt = Math.atan2(
                  amplitude * Math.cos(waveAngle) * Math.sin(rowPhase),
                  fontSize * 1.2,
                )
                const rowY = (row - (rows - 1) / 2) * fontSize * 1.2
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 36) {
                  for (const glyphX of [-fontSize * 0.4, fontSize * 0.4]) {
                    for (const glyphY of [-fontSize * 0.5, fontSize * 0.5]) {
                      const glyphZ = glyphY * Math.sin(surfaceTilt)
                      const x = (rowRadius + glyphZ) * Math.sin(angle) + glyphX * Math.cos(angle)
                      const y = rowY + glyphY * Math.cos(surfaceTilt)
                      const z = (rowRadius + glyphZ) * Math.cos(angle) - glyphX * Math.sin(angle)
                      const roll = (-3 * Math.PI) / 180
                      const tilt = (18 * Math.PI) / 180
                      const rolledX = x * Math.cos(roll) - y * Math.sin(roll)
                      const rolledY = x * Math.sin(roll) + y * Math.cos(roll)
                      const tiltedY = rolledY * Math.cos(tilt) - z * Math.sin(tilt)
                      const tiltedZ = rolledY * Math.sin(tilt) + z * Math.cos(tilt)
                      const scale = perspective / (perspective - tiltedZ)
                      extentX = Math.max(extentX, Math.abs(rolledX * scale))
                      extentY = Math.max(extentY, Math.abs(tiltedY * scale))
                    }
                  }
                }
              }
            }
            assert.ok(extentX < width / 2, `Horizontal clipping: ${context}`)
            assert.ok(extentY < height / 2, `Vertical clipping: ${context}`)
          }
        }
      }
    }
  }
})

test('radius can shrink to a compact ring without resizing letters', () => {
  const normal = getSpaceTypeGeometry(912, 448, 38, 1, 0)
  const smaller = getSpaceTypeGeometry(912, 448, 38, 1, 0, 0)
  const larger = getSpaceTypeGeometry(912, 448, 38, 1, 0, Number.MAX_VALUE)
  if (!normal || !smaller || !larger) throw new Error('Geometry was not measured')
  assert.equal(smaller.radius, normal.minRadius)
  assert.equal(larger.radius, normal.maxRadius)
  assert.equal(smaller.fontSize, normal.fontSize)
  assert.equal(larger.fontSize, normal.fontSize)
  assert.ok(smaller.radius < normal.radius / 2)
})

test('unmeasured previews wait for a spacing budget', () => {
  assert.equal(getSpaceTypeGeometry(0, 448, 38, 1, 0), null)
  assert.equal(getSpaceTypeGeometry(912, 0, 38, 1, 0), null)
})

test('longitude keeps auto and requested radii, limits, and font size fixed across its full range', () => {
  for (const [width, height] of [
    [342, 240],
    [720, 400],
    [912, 448],
  ] as const) {
    for (const rows of [1, 3, 6]) {
      for (const radius of [undefined, 0, 100, Number.MAX_VALUE]) {
        const resting = getSpaceTypeGeometry(width, height, 38, rows, 0, radius)
        if (!resting) throw new Error('Geometry was not measured')
        for (const longitude of [1, 25, 50, 75, 100, 0]) {
          assert.deepEqual(
            getSpaceTypeGeometry(width, height, 38, rows, longitude, radius),
            resting,
          )
        }
      }
    }
  }
})
