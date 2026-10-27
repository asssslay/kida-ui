import { GlowHighlight, type GlowHighlightProps, useReducedMotion } from '@kida-ui/react'
import { type CSSProperties, useId, useState } from 'react'
// The panel shares SpaceType's customization styles so every component page reads the same.
import './space-type.css'
import './glow-highlight.css'

type Finish = NonNullable<GlowHighlightProps['finish']>
type Trigger = NonNullable<GlowHighlightProps['trigger']>
type Colors = Record<'core' | 'rim' | 'band' | 'fringe', string>

const DEFAULT_TEXT = 'Playful'

/** The component's own defaults, so the first render matches an unstyled GlowHighlight. */
const CANDY: Colors = { core: '#e94f86', rim: '#ffe1ec', band: '#ffd76a', fringe: '#ff8a3d' }

const PALETTES: { name: string; colors: Colors }[] = [
  { name: 'Candy', colors: CANDY },
  {
    name: 'Sorbet',
    colors: { core: '#ffb07a', rim: '#fff0e4', band: '#ffd76a', fringe: '#e94f86' },
  },
  {
    name: 'Berry',
    colors: { core: '#cdbdff', rim: '#f6f1ff', band: '#f9a8c9', fringe: '#e94f86' },
  },
]

const COLOR_FIELDS: { key: keyof Colors; label: string }[] = [
  { key: 'core', label: 'Core' },
  { key: 'rim', label: 'Rim' },
  { key: 'band', label: 'Band' },
  { key: 'fringe', label: 'Edge' },
]

const FINISHES: { value: Finish; label: string; hint: string }[] = [
  { value: 'glow', label: 'Glow', hint: 'Soft layered bands traced around the letters.' },
  { value: 'sticker', label: 'Sticker', hint: 'A crisp die-cut edge with a small paper shadow.' },
  { value: 'halo', label: 'Halo', hint: 'No fill behind the letters, for running text.' },
]

const TRIGGERS: { value: Trigger; label: string }[] = [
  { value: 'view', label: 'In view' },
  { value: 'hover', label: 'Hover' },
  { value: 'manual', label: 'Toggle' },
]

function rangeStyle(value: number, min: number, max: number): CSSProperties {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return { '--space-type-progress': `${progress}%` } as CSSProperties
}

const sameColors = (a: Colors, b: Colors) => COLOR_FIELDS.every(({ key }) => a[key] === b[key])

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | undefined
  options: { value: T; label: string; swatches?: string[] }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="glow-highlight-segmented">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              {option.swatches && (
                <span className="glow-highlight-swatches" aria-hidden="true">
                  {option.swatches.map((color) => (
                    <i key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
              )}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
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

export function GlowHighlightSection() {
  const textId = useId()
  const spreadId = useId()
  const durationId = useId()
  const colorId = useId()
  const [text, setText] = useState(DEFAULT_TEXT)
  const [finish, setFinish] = useState<Finish>('glow')
  const [colors, setColors] = useState<Colors>(CANDY)
  const [spread, setSpread] = useState(1)
  const [duration, setDuration] = useState(600)
  const [trigger, setTrigger] = useState<Trigger>('view')
  const [active, setActive] = useState(true)
  const [replay, setReplay] = useState(0)
  const reduced = useReducedMotion()
  const palette = PALETTES.find((option) => sameColors(option.colors, colors))?.name
  const finishHint = FINISHES.find((option) => option.value === finish)?.hint

  return (
    <section className="space-type-section glow-highlight-section" data-embedded="">
      <div className="glow-highlight-stage">
        <p className="glow-highlight-headline" key={`${trigger}-${replay}`}>
          Calm at rest.{' '}
          <GlowHighlight
            finish={finish}
            spread={spread}
            duration={duration}
            trigger={trigger}
            active={active}
            // Hover also answers keyboard focus, so the word joins the tab order for that demo.
            tabIndex={trigger === 'hover' ? 0 : undefined}
            style={
              {
                '--kida-glow-core': colors.core,
                '--kida-glow-rim': colors.rim,
                '--kida-glow-band': colors.band,
                '--kida-glow-fringe': colors.fringe,
              } as CSSProperties
            }
          >
            {text}
          </GlowHighlight>{' '}
          the moment you mean it.
        </p>
        {/* Beside the word it controls, so the effect is in view when the button is pressed. */}
        {trigger === 'manual' ? (
          <button
            type="button"
            className="glow-highlight-action"
            aria-pressed={active}
            onClick={() => setActive((value) => !value)}
          >
            {active ? 'Glow off' : 'Glow on'}
          </button>
        ) : (
          <button
            type="button"
            className="glow-highlight-action"
            onClick={() => setReplay((value) => value + 1)}
          >
            Replay
          </button>
        )}
      </div>
      <div className="space-type-panel">
        <div className="space-type-controls glow-highlight-controls">
          <div className="space-type-text-control">
            <label htmlFor={textId}>Highlighted words</label>
            <input
              id={textId}
              type="text"
              value={text}
              maxLength={40}
              spellCheck={false}
              placeholder={DEFAULT_TEXT}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <Segmented label="Finish" value={finish} options={FINISHES} onChange={setFinish} />
        </div>
        <div className="glow-highlight-colors">
          <Segmented
            label="Palette"
            value={palette}
            options={PALETTES.map((option) => ({
              value: option.name,
              label: option.name,
              swatches: [option.colors.core, option.colors.band, option.colors.fringe],
            }))}
            onChange={(name) => {
              const next = PALETTES.find((option) => option.name === name)
              if (next) setColors(next.colors)
            }}
          />
          <div className="space-type-customizations glow-highlight-color-grid">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorControl
                key={key}
                id={`${colorId}-${key}`}
                label={label}
                value={colors[key]}
                onChange={(value) => setColors((current) => ({ ...current, [key]: value }))}
              />
            ))}
          </div>
        </div>
        <div className="space-type-motion-controls">
          <div>
            <div className="space-type-speed-label">
              <label htmlFor={spreadId}>Spread</label>
              <output htmlFor={spreadId}>{spread.toFixed(2)}×</output>
            </div>
            <input
              id={spreadId}
              type="range"
              min="0.5"
              max="1.6"
              step="0.05"
              value={spread}
              style={rangeStyle(spread, 0.5, 1.6)}
              aria-valuetext={`${spread.toFixed(2)} times the default size`}
              aria-describedby={`${spreadId}-hint`}
              onChange={(event) => setSpread(event.target.valueAsNumber)}
            />
            <p id={`${spreadId}-hint`} className="space-type-control-hint">
              {finishHint} Spread scales every ring together.
            </p>
          </div>
          <div>
            <div className="space-type-speed-label">
              <label htmlFor={durationId}>Duration</label>
              <output htmlFor={durationId}>{duration} ms</output>
            </div>
            <input
              id={durationId}
              type="range"
              min="200"
              max="1400"
              step="50"
              value={duration}
              style={rangeStyle(duration, 200, 1400)}
              aria-valuetext={`${duration} milliseconds`}
              aria-describedby={`${durationId}-hint`}
              disabled={reduced}
              onChange={(event) => setDuration(event.target.valueAsNumber)}
            />
            <p id={`${durationId}-hint`} className="space-type-control-hint">
              Time to grow or fold away. Reversing mid-flight continues from the current frame.
            </p>
          </div>
        </div>
        <div className="glow-highlight-playback">
          <Segmented label="Trigger" value={trigger} options={TRIGGERS} onChange={setTrigger} />
        </div>
        <p className="space-type-note">
          {reduced
            ? 'Reduced motion is on. The glow switches without growing; you can still customize it.'
            : trigger === 'hover'
              ? 'Hover the word, or tab to it. The glow follows pointer and keyboard focus.'
              : 'Make it yours. Every color is a CSS custom property.'}
        </p>
      </div>
    </section>
  )
}
