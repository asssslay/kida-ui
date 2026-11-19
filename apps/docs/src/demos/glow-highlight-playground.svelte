<script lang="ts">
import {
  GLOW_PALETTES,
  type GlowPaletteColors,
  prefersReducedMotion,
  watchReducedMotion,
} from '@kida-ui/motion'
import type {
  GlowHighlightFinish,
  GlowHighlightPalette,
  GlowHighlightTrigger,
} from '@kida-ui/svelte'
import { GlowHighlight } from '@kida-ui/svelte'
import './space-type.css'
import './glow-highlight.css'

type Colors = GlowPaletteColors

const DEFAULT_TEXT = 'Playful'

const PALETTES: { value: GlowHighlightPalette; label: string }[] = [
  { value: 'candy', label: 'Candy' },
  { value: 'sorbet', label: 'Sorbet' },
  { value: 'berry', label: 'Berry' },
  { value: 'after-dark', label: 'After dark' },
]

const COLOR_FIELDS: { key: keyof Colors; label: string }[] = [
  { key: 'core', label: 'Core' },
  { key: 'rim', label: 'Rim' },
  { key: 'band', label: 'Band' },
  { key: 'fringe', label: 'Edge' },
]

const FINISHES: { value: GlowHighlightFinish; label: string; hint: string }[] = [
  { value: 'glow', label: 'Glow', hint: 'Soft layered bands traced around the letters.' },
  { value: 'sticker', label: 'Sticker', hint: 'A crisp die-cut edge with a small paper shadow.' },
  { value: 'halo', label: 'Halo', hint: 'No fill behind the letters, for running text.' },
]

const TRIGGERS: { value: GlowHighlightTrigger; label: string }[] = [
  { value: 'view', label: 'In view' },
  { value: 'hover', label: 'Hover' },
  { value: 'manual', label: 'Toggle' },
]

function rangeProgress(value: number, min: number, max: number) {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return `${progress}%`
}

const sameColors = (a: Colors, b: Colors) => COLOR_FIELDS.every(({ key }) => a[key] === b[key])

const id = $props.id()
const textId = `${id}-text`
const spreadId = `${id}-spread`
const durationId = `${id}-duration`
const colorId = `${id}-color`
const finishName = `${id}-finish`
const paletteName = `${id}-palette`
const triggerName = `${id}-trigger`

let text = $state(DEFAULT_TEXT)
let finish = $state<GlowHighlightFinish>('glow')
let palette = $state<GlowHighlightPalette>('candy')
let colors = $state.raw<Colors>(GLOW_PALETTES.candy)
let spread = $state(1)
let duration = $state(600)
let trigger = $state<GlowHighlightTrigger>('view')
let active = $state(true)
let replay = $state(0)
const custom = $derived(!sameColors(colors, GLOW_PALETTES[palette]))
const finishHint = $derived(FINISHES.find((option) => option.value === finish)?.hint)
const paletteOptions = PALETTES.map((option) => {
  const { core, band, fringe } = GLOW_PALETTES[option.value]
  return { ...option, swatches: [core, band, fringe] }
})
const glowStyle = $derived(
  custom
    ? [
        `--kida-glow-core: ${colors.core}`,
        `--kida-glow-rim: ${colors.rim}`,
        `--kida-glow-band: ${colors.band}`,
        `--kida-glow-fringe: ${colors.fringe}`,
      ].join('; ')
    : undefined,
)

let reduced = $state(false)
$effect(() => {
  reduced = prefersReducedMotion()
  return watchReducedMotion((value) => {
    reduced = value
  })
})

function choosePalette(name: GlowHighlightPalette) {
  palette = name
  colors = GLOW_PALETTES[name]
}

function setColor(key: keyof Colors, value: string) {
  colors = { ...colors, [key]: value }
}
const note = $derived(
  reduced
    ? 'Reduced motion is on. The glow switches without growing; you can still customize it.'
    : trigger === 'hover'
      ? 'Hover the word, or tab to it. The glow follows pointer and keyboard focus.'
      : 'Make it yours. Every color is a CSS custom property.',
)
</script>

<section class="space-type-section glow-highlight-section" data-embedded="">
  <div class="glow-highlight-stage" data-surface={palette === 'after-dark' ? 'dark' : undefined}>
    {#key `${trigger}-${replay}`}
      <p class="glow-highlight-headline">Calm at rest. <GlowHighlight {finish} {palette} {spread} {duration} {trigger} {active} tabindex={trigger === 'hover' ? 0 : undefined} style={glowStyle}>{text}</GlowHighlight> the moment you mean it.</p>
    {/key}
    {#if trigger === 'manual'}
      <button type="button" class="glow-highlight-action" aria-pressed={active} onclick={() => (active = !active)}>{active ? 'Glow off' : 'Glow on'}</button>
    {:else}
      <button type="button" class="glow-highlight-action" onclick={() => replay++}>Replay</button>
    {/if}
  </div>
  <div class="space-type-panel">
    <div class="space-type-controls glow-highlight-controls">
      <div class="space-type-text-control">
        <label for={textId}>Highlighted words</label>
        <input id={textId} type="text" bind:value={text} maxlength="40" spellcheck="false" placeholder={DEFAULT_TEXT} />
      </div>
      <fieldset class="glow-highlight-segmented">
        <legend>Finish</legend>
        <div>
          {#each FINISHES as option (option.value)}
            <label><input type="radio" name={finishName} value={option.value} bind:group={finish} /><span>{option.label}</span></label>
          {/each}
        </div>
      </fieldset>
    </div>
    <div class="glow-highlight-colors">
      <fieldset class="glow-highlight-segmented">
        <legend>Palette</legend>
        <div>
          {#each paletteOptions as option (option.value)}
            <label><input type="radio" name={paletteName} value={option.value} checked={!custom && palette === option.value} onchange={() => choosePalette(option.value)} /><span><span class="glow-highlight-swatches" aria-hidden="true">{#each option.swatches as color (color)}<i style:background-color={color}></i>{/each}</span>{option.label}</span></label>
          {/each}
        </div>
      </fieldset>
      <div class="space-type-customizations glow-highlight-color-grid">
        {#each COLOR_FIELDS as field (field.key)}
          <div class="space-type-color-control">
            <label for={`${colorId}-${field.key}`}>{field.label}</label>
            <div class="space-type-color-value">
              <span class="space-type-color-swatch" style:background-color={colors[field.key]} aria-hidden="true"></span>
              <span>{colors[field.key].toUpperCase()}</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m5 6.5 3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <input id={`${colorId}-${field.key}`} type="color" value={colors[field.key]} oninput={(event) => setColor(field.key, event.currentTarget.value)} />
            </div>
          </div>
        {/each}
      </div>
    </div>
    <div class="space-type-motion-controls">
      <div>
        <div class="space-type-speed-label">
          <label for={spreadId}>Spread</label>
          <output for={spreadId}>{spread.toFixed(2)}×</output>
        </div>
        <input
          id={spreadId}
          type="range"
          min="0.5"
          max="1.6"
          step="0.05"
          bind:value={spread}
          style:--space-type-progress={rangeProgress(spread, 0.5, 1.6)}
          aria-valuetext={`${spread.toFixed(2)} times the default size`}
          aria-describedby={`${spreadId}-hint`}
        />
        <p id={`${spreadId}-hint`} class="space-type-control-hint">{finishHint} Spread scales every ring together.</p>
      </div>
      <div>
        <div class="space-type-speed-label">
          <label for={durationId}>Duration</label>
          <output for={durationId}>{duration} ms</output>
        </div>
        <input
          id={durationId}
          type="range"
          min="200"
          max="1400"
          step="50"
          bind:value={duration}
          style:--space-type-progress={rangeProgress(duration, 200, 1400)}
          aria-valuetext={`${duration} milliseconds`}
          aria-describedby={`${durationId}-hint`}
          disabled={reduced}
        />
        <p id={`${durationId}-hint`} class="space-type-control-hint">Time to grow or fold away. Reversing mid-flight continues from the current frame.</p>
      </div>
    </div>
    <div class="glow-highlight-playback">
      <fieldset class="glow-highlight-segmented">
        <legend>Trigger</legend>
        <div>
          {#each TRIGGERS as option (option.value)}
            <label><input type="radio" name={triggerName} value={option.value} bind:group={trigger} /><span>{option.label}</span></label>
          {/each}
        </div>
      </fieldset>
    </div>
    <p class="space-type-note">{note}</p>
  </div>
</section>
