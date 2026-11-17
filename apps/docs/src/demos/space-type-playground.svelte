<script lang="ts">
import { prefersReducedMotion, watchReducedMotion } from '@kida-ui/motion'
import { SpaceType, type SpaceTypeGeometry } from '@kida-ui/svelte'
import './space-type.css'

let { showHeading = true }: { showHeading?: boolean } = $props()

const DEFAULT_TEXT = 'KIDA-UI / SMALL-DETAILS-BIG-DELIGHT / '
const DEFAULT_COLOR = '#211c24'
const DEFAULT_BACKGROUND = '#fffafb'

function rangeProgress(value: number, min: number, max: number) {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return `${progress}%`
}

const id = $props.id()
const textId = `${id}-text`
const speedId = `${id}-speed`
const rowsId = `${id}-rows`
const colorId = `${id}-color`
const backgroundId = `${id}-background`
const longitudeId = `${id}-longitude`
const radiusId = `${id}-radius`
let text = $state(DEFAULT_TEXT)
let speed = $state(1)
let rows = $state(1)
let color = $state(DEFAULT_COLOR)
let background = $state(DEFAULT_BACKGROUND)
let longitude = $state(0)
let radius = $state<number>()
let geometry = $state.raw<SpaceTypeGeometry | null>(null)
const appliedRadius = $derived(
  geometry
    ? Math.min(geometry.maxRadius, Math.max(geometry.minRadius, radius ?? geometry.radius))
    : 0,
)
const colorControls = [
  {
    id: colorId,
    label: 'Text color',
    get value() {
      return color
    },
    set value(value: string) {
      color = value
    },
  },
  {
    id: backgroundId,
    label: 'Background',
    get value() {
      return background
    },
    set value(value: string) {
      background = value
    },
  },
]

let reduced = $state(false)
$effect(() => {
  reduced = prefersReducedMotion()
  return watchReducedMotion((value) => {
    reduced = value
  })
})

function setRows(value: number) {
  rows = Number.isFinite(value) ? Math.min(6, Math.max(1, Math.round(value))) : 1
}
const note = $derived(
  reduced
    ? 'Reduced motion is on. The rings stay still; you can still customize them.'
    : 'Make it yours. Set speed to zero to pause.',
)
</script>

<section
  class="space-type-section"
  data-embedded={!showHeading ? '' : undefined}
  aria-labelledby={showHeading ? `${textId}-title` : undefined}
  aria-label={showHeading ? undefined : 'SpaceType customization'}
>
  {#if showHeading}
    <div class="space-type-heading">
      <div>
        <p class="space-type-eyebrow">Typography in motion</p>
        <h2 id={`${textId}-title`}>Space Type</h2>
      </div>
      <span class="space-type-caption">Small details. Big delight.</span>
    </div>
  {/if}
  <SpaceType
    {text}
    {speed}
    {rows}
    {color}
    {background}
    {longitude}
    {radius}
    onGeometryChange={(value) => (geometry = value)}
  />
  <div class="space-type-panel">
    <div class="space-type-controls">
      <div class="space-type-text-control">
        <label for={textId}>Text</label>
        <input id={textId} type="text" bind:value={text} maxlength="100" spellcheck="false" placeholder={DEFAULT_TEXT} />
      </div>
      <div class="space-type-speed-control">
        <div class="space-type-speed-label">
          <label for={speedId}>Speed</label>
          <output for={speedId}>{speed === 0 ? 'Paused' : `${speed.toFixed(2)}×`}</output>
        </div>
        <input
          id={speedId}
          type="range"
          min="0"
          max="3"
          step="0.05"
          bind:value={speed}
          style:--space-type-progress={rangeProgress(speed, 0, 3)}
          aria-valuetext={speed === 0 ? 'Paused' : `${speed.toFixed(2)} times normal speed`}
          disabled={reduced}
        />
      </div>
    </div>
    <div class="space-type-customizations">
      {#each colorControls as control (control.id)}
        <div class="space-type-color-control">
          <label for={control.id}>{control.label}</label>
          <div class="space-type-color-value">
            <span class="space-type-color-swatch" style:background-color={control.value} aria-hidden="true"></span>
            <span>{control.value.toUpperCase()}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m5 6.5 3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input id={control.id} type="color" value={control.value} oninput={(event) => (control.value = event.currentTarget.value)} />
          </div>
        </div>
      {/each}
      <div class="space-type-rows-control">
        <label for={rowsId}>Rows</label>
        <div class="space-type-stepper">
          <button type="button" aria-label="Decrease rows" aria-controls={rowsId} disabled={rows <= 1} onclick={() => (rows = Math.max(1, rows - 1))}>−</button>
          <input id={rowsId} type="number" min="1" max="6" step="1" value={rows} oninput={(event) => setRows(event.currentTarget.valueAsNumber)} />
          <button type="button" aria-label="Increase rows" aria-controls={rowsId} disabled={rows >= 6} onclick={() => (rows = Math.min(6, rows + 1))}>+</button>
        </div>
      </div>
    </div>
    <div class="space-type-motion-controls">
      <div>
        <div class="space-type-speed-label">
          <label for={radiusId}>Radius</label>
          <output for={radiusId}>{geometry ? `${Math.round(appliedRadius)} px` : 'Auto'}</output>
        </div>
        <input
          id={radiusId}
          type="range"
          min={geometry?.minRadius ?? 0}
          max={geometry?.maxRadius ?? 0}
          step="1"
          value={appliedRadius}
          style:--space-type-progress={rangeProgress(appliedRadius, geometry?.minRadius ?? 0, geometry?.maxRadius ?? 0)}
          disabled={!geometry || geometry.maxRadius <= geometry.minRadius}
          aria-describedby={`${radiusId}-hint`}
          oninput={(event) => (radius = event.currentTarget.valueAsNumber)}
        />
        <p id={`${radiusId}-hint`} class="space-type-control-hint">Smaller rings pack the letters closer. Letter size stays fixed.</p>
      </div>
      <div>
        <div class="space-type-speed-label">
          <label for={longitudeId}>Longitude</label>
          <output for={longitudeId}>{longitude}%</output>
        </div>
        <input
          id={longitudeId}
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={longitude}
          style:--space-type-progress={rangeProgress(longitude, 0, 100)}
          aria-describedby={`${longitudeId}-hint`}
        />
        <p id={`${longitudeId}-hint`} class="space-type-control-hint">Pulse the rings and tilt the letters with the wave.</p>
      </div>
    </div>
    <p class="space-type-note">{note}</p>
  </div>
</section>
