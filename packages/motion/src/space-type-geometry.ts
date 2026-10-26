const TILT = (18 * Math.PI) / 180
const ROLL = (3 * Math.PI) / 180
const PROJECTION_ALLOWANCE = 1.1
const RADIUS_RESERVE = 0.88
const MAX_WAVE = 0.32

/** Bounds reserve the full longitude wave, so its strength never changes the base radius. */
export function getSpaceTypeGeometry(
  width: number,
  height: number,
  characterCount: number,
  rows: number,
  _longitude: number,
  requestedRadius?: number,
) {
  if (width <= 0 || height <= 0) return null

  rows = Number.isFinite(rows) ? Math.max(1, Math.min(6, Math.round(rows))) : 1
  const count = Math.max(1, characterCount)
  const inset = Math.max(8, width * 0.018)
  const halfWidth = Math.max(0, width / 2 - inset) / PROJECTION_ALLOWANCE
  const halfHeight = Math.max(0, height / 2 - inset) / PROJECTION_ALLOWANCE
  const radialX = Math.cos(ROLL)
  const stackX = Math.sin(ROLL)
  const radialY = Math.hypot(Math.cos(TILT) * Math.sin(ROLL), Math.sin(TILT))
  const stackY = Math.cos(TILT) * Math.cos(ROLL)

  const radiusLimit = (fontSize: number, tilted = false) => {
    // Tilting the glyph surface can project half its height into the radial plane.
    const glyphRadialExtent = fontSize * (tilted ? 0.9 : 0.4)
    const stackHalfHeight = fontSize * ((rows - 1) * 0.6 + 0.5)
    return Math.max(
      0,
      Math.min(
        (halfWidth - stackHalfHeight * stackX) / radialX - glyphRadialExtent,
        (halfHeight - stackHalfHeight * stackY) / radialY - glyphRadialExtent,
      ),
    )
  }

  // Size type against the resting ring, independently of radius and wave strength.
  let fontSize = Math.min(width * 0.09, (width * 3.5) / count, (width * 0.2) / rows)
  const nominalRadius = width * 0.34
  const initialRadius = Math.min(nominalRadius, radiusLimit(fontSize) * RADIUS_RESERVE)
  if (count > 1) {
    fontSize = Math.min(fontSize, (2 * initialRadius * Math.sin(Math.PI / count)) / 0.7)
  }

  const maxRadius = radiusLimit(fontSize, true) / (1 + MAX_WAVE)
  const defaultRadius = Math.min(nominalRadius, maxRadius * RADIUS_RESERVE)
  // Compact rings intentionally pack the same-sized letters more densely.
  const minRadius = Math.min(maxRadius, (width * 0.1) / (1 + MAX_WAVE))
  const radius = Math.max(
    minRadius,
    Math.min(
      maxRadius,
      typeof requestedRadius === 'number' && Number.isFinite(requestedRadius)
        ? requestedRadius
        : defaultRadius,
    ),
  )

  return {
    fontSize,
    radius,
    minRadius,
    maxRadius,
    perspective: Math.max(width, height) * 12,
  }
}

export type SpaceTypeGeometry = NonNullable<ReturnType<typeof getSpaceTypeGeometry>>
