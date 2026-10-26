import type { SpaceTypeGeometry } from '@kida-ui/motion'
import { SpaceType, useReducedMotion } from '@kida-ui/react'
import { type CSSProperties, useId, useState } from 'react'
import './space-type.css'

const DEFAULT_TEXT = 'KIDA-UI / SMALL-DETAILS-BIG-DELIGHT / '
const DEFAULT_COLOR = '#211c24'
const DEFAULT_BACKGROUND = '#fffafb'

function rangeStyle(value: number, min: number, max: number): CSSProperties {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return { '--space-type-progress': `${progress}%` } as CSSProperties
}

function ColorControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-type-color-control">
      <label htmlFor={id}>{label}</label>
      <div className="space-type-color-value">
        <span
          className="space-type-color-swatch"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <span>{value.toUpperCase()}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m5 6.5 3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

export function SpaceTypeSection({ showHeading = true }: { showHeading?: boolean }) {
  const textId = useId()
  const speedId = useId()
  const rowsId = useId()
  const colorId = useId()
  const backgroundId = useId()
  const longitudeId = useId()
  const radiusId = useId()
  const [text, setText] = useState(DEFAULT_TEXT)
  const [speed, setSpeed] = useState(1)
  const [rows, setRows] = useState(1)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [background, setBackground] = useState(DEFAULT_BACKGROUND)
  const [longitude, setLongitude] = useState(0)
  const [radius, setRadius] = useState<number>()
  const [geometry, setGeometry] = useState<SpaceTypeGeometry | null>(null)
  const appliedRadius = geometry
    ? Math.min(geometry.maxRadius, Math.max(geometry.minRadius, radius ?? geometry.radius))
    : 0
  const reduced = useReducedMotion()

  return (
    <section
      className="space-type-section"
      data-embedded={!showHeading ? '' : undefined}
      aria-labelledby={showHeading ? `${textId}-title` : undefined}
      aria-label={showHeading ? undefined : 'SpaceType customization'}
    >
      {showHeading ? (
        <div className="space-type-heading">
          <div>
            <p className="space-type-eyebrow">Typography in motion</p>
            <h2 id={`${textId}-title`}>Space Type</h2>
          </div>
          <span className="space-type-caption">Small details. Big delight.</span>
        </div>
      ) : null}
      <SpaceType
        text={text}
        speed={speed}
        rows={rows}
        color={color}
        background={background}
        longitude={longitude}
        radius={radius}
        onGeometryChange={setGeometry}
      />
      <div className="space-type-panel">
        <div className="space-type-controls">
          <div className="space-type-text-control">
            <label htmlFor={textId}>Text</label>
            <input
              id={textId}
              type="text"
              value={text}
              maxLength={100}
              spellCheck={false}
              placeholder={DEFAULT_TEXT}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="space-type-speed-control">
            <div className="space-type-speed-label">
              <label htmlFor={speedId}>Speed</label>
              <output htmlFor={speedId}>{speed === 0 ? 'Paused' : `${speed.toFixed(2)}×`}</output>
            </div>
            <input
              id={speedId}
              type="range"
              min="0"
              max="3"
              step="0.05"
              value={speed}
              style={rangeStyle(speed, 0, 3)}
              aria-valuetext={speed === 0 ? 'Paused' : `${speed.toFixed(2)} times normal speed`}
              disabled={reduced}
              onChange={(event) => setSpeed(event.target.valueAsNumber)}
            />
          </div>
        </div>
        <div className="space-type-customizations">
          <ColorControl id={colorId} label="Text color" value={color} onChange={setColor} />
          <ColorControl
            id={backgroundId}
            label="Background"
            value={background}
            onChange={setBackground}
          />
          <div className="space-type-rows-control">
            <label htmlFor={rowsId}>Rows</label>
            <div className="space-type-stepper">
              <button
                type="button"
                aria-label="Decrease rows"
                aria-controls={rowsId}
                disabled={rows <= 1}
                onClick={() => setRows((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <input
                id={rowsId}
                type="number"
                min="1"
                max="6"
                step="1"
                value={rows}
                onChange={(event) => {
                  const value = event.target.valueAsNumber
                  setRows(Number.isFinite(value) ? Math.min(6, Math.max(1, Math.round(value))) : 1)
                }}
              />
              <button
                type="button"
                aria-label="Increase rows"
                aria-controls={rowsId}
                disabled={rows >= 6}
                onClick={() => setRows((value) => Math.min(6, value + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="space-type-motion-controls">
          <div>
            <div className="space-type-speed-label">
              <label htmlFor={radiusId}>Radius</label>
              <output htmlFor={radiusId}>
                {geometry ? `${Math.round(appliedRadius)} px` : 'Auto'}
              </output>
            </div>
            <input
              id={radiusId}
              type="range"
              min={geometry?.minRadius ?? 0}
              max={geometry?.maxRadius ?? 0}
              step="1"
              value={appliedRadius}
              style={rangeStyle(appliedRadius, geometry?.minRadius ?? 0, geometry?.maxRadius ?? 0)}
              disabled={!geometry || geometry.maxRadius <= geometry.minRadius}
              aria-describedby={`${radiusId}-hint`}
              onChange={(event) => setRadius(event.target.valueAsNumber)}
            />
            <p id={`${radiusId}-hint`} className="space-type-control-hint">
              Smaller rings pack the letters closer. Letter size stays fixed.
            </p>
          </div>
          <div>
            <div className="space-type-speed-label">
              <label htmlFor={longitudeId}>Longitude</label>
              <output htmlFor={longitudeId}>{longitude}%</output>
            </div>
            <input
              id={longitudeId}
              type="range"
              min="0"
              max="100"
              step="1"
              value={longitude}
              style={rangeStyle(longitude, 0, 100)}
              aria-describedby={`${longitudeId}-hint`}
              onChange={(event) => setLongitude(event.target.valueAsNumber)}
            />
            <p id={`${longitudeId}-hint`} className="space-type-control-hint">
              Pulse the rings and tilt the letters with the wave.
            </p>
          </div>
        </div>
        <p className="space-type-note">
          {reduced
            ? 'Reduced motion is on. The rings stay still; you can still customize them.'
            : 'Make it yours. Set speed to zero to pause.'}
        </p>
      </div>
    </section>
  )
}
