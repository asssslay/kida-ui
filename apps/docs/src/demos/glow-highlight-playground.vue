<script setup lang="ts">
import {
  GLOW_PALETTES,
  type GlowPaletteColors,
  prefersReducedMotion,
  watchReducedMotion,
} from '@kida-ui/motion'
import type { GlowHighlightFinish, GlowHighlightPalette, GlowHighlightTrigger } from '@kida-ui/vue'
import { GlowHighlight } from '@kida-ui/vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId } from 'vue'
// The panel shares SpaceType's customization styles so every component page reads the same.
import './space-type.css'
import './glow-highlight.css'

type Colors = GlowPaletteColors

const DEFAULT_TEXT = 'Playful'

/** The component's named palettes; picking one here is the same as the `palette` prop. */
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

function rangeStyle(value: number, min: number, max: number) {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return { '--space-type-progress': `${progress}%` }
}

const sameColors = (a: Colors, b: Colors) => COLOR_FIELDS.every(({ key }) => a[key] === b[key])

const textId = useId()
const spreadId = useId()
const durationId = useId()
const colorId = useId()
const text = shallowRef(DEFAULT_TEXT)
const finish = shallowRef<GlowHighlightFinish>('glow')
const palette = shallowRef<GlowHighlightPalette>('candy')
const colors = shallowRef<Colors>(GLOW_PALETTES.candy)
const spread = shallowRef(1)
const duration = shallowRef(600)
const trigger = shallowRef<GlowHighlightTrigger>('view')
const active = shallowRef(true)
const replay = shallowRef(0)
// Editing a color keeps the chosen palette as the base and overrides it inline.
const custom = computed(() => !sameColors(colors.value, GLOW_PALETTES[palette.value]))
const finishHint = computed(() => FINISHES.find((option) => option.value === finish.value)?.hint)
const paletteOptions = PALETTES.map((option) => {
  const { core, band, fringe } = GLOW_PALETTES[option.value]
  return { ...option, swatches: [core, band, fringe] }
})
const glowStyle = computed(() =>
  custom.value
    ? {
        '--kida-glow-core': colors.value.core,
        '--kida-glow-rim': colors.value.rim,
        '--kida-glow-band': colors.value.band,
        '--kida-glow-fringe': colors.value.fringe,
      }
    : undefined,
)

// Each radio group needs its own name, as React's Segmented gets from useId.
const finishName = useId()
const paletteName = useId()
const triggerName = useId()

// Matches React's useReducedMotion: false on the server, then the live preference.
const reduced = shallowRef(false)
let unwatch: (() => void) | undefined
onMounted(() => {
  reduced.value = prefersReducedMotion()
  unwatch = watchReducedMotion((value) => {
    reduced.value = value
  })
})
onBeforeUnmount(() => unwatch?.())

const inputValue = (event: Event) => (event.target as HTMLInputElement).value
const numberOf = (event: Event) => (event.target as HTMLInputElement).valueAsNumber

function choosePalette(name: GlowHighlightPalette) {
  palette.value = name
  colors.value = GLOW_PALETTES[name]
}

function setColor(key: keyof Colors, event: Event) {
  colors.value = { ...colors.value, [key]: inputValue(event) }
}
// Kept out of the template so no line break becomes a space in the rendered note.
const note = computed(() =>
  reduced.value
    ? 'Reduced motion is on. The glow switches without growing; you can still customize it.'
    : trigger.value === 'hover'
      ? 'Hover the word, or tab to it. The glow follows pointer and keyboard focus.'
      : 'Make it yours. Every color is a CSS custom property.',
)
</script>

<template>
  <section class="space-type-section glow-highlight-section" data-embedded="">
    <div class="glow-highlight-stage" :data-surface="palette === 'after-dark' ? 'dark' : undefined">
      <!-- Hover also answers keyboard focus, so the word joins the tab order for that demo. -->
      <p :key="`${trigger}-${replay}`" class="glow-highlight-headline">Calm at rest. <GlowHighlight :finish="finish" :palette="palette" :spread="spread" :duration="duration" :trigger="trigger" :active="active" :tabindex="trigger === 'hover' ? 0 : undefined" :style="glowStyle">{{ text }}</GlowHighlight> the moment you mean it.</p>
      <!-- Beside the word it controls, so the effect is in view when the button is pressed. -->
      <button
        v-if="trigger === 'manual'"
        type="button"
        class="glow-highlight-action"
        :aria-pressed="active"
        @click="active = !active"
      >{{ active ? 'Glow off' : 'Glow on' }}</button>
      <button v-else type="button" class="glow-highlight-action" @click="replay++">Replay</button>
    </div>
    <div class="space-type-panel">
      <div class="space-type-controls glow-highlight-controls">
        <div class="space-type-text-control">
          <label :for="textId">Highlighted words</label>
          <input
            :id="textId"
            type="text"
            :value="text"
            maxlength="40"
            spellcheck="false"
            :placeholder="DEFAULT_TEXT"
            @input="text = inputValue($event)"
          />
        </div>
        <fieldset class="glow-highlight-segmented">
          <legend>Finish</legend>
          <div>
            <label v-for="option in FINISHES" :key="option.value">
              <input
                type="radio"
                :name="finishName"
                :value="option.value"
                :checked="finish === option.value"
                @change="finish = option.value"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
      </div>
      <div class="glow-highlight-colors">
        <fieldset class="glow-highlight-segmented">
          <legend>Palette</legend>
          <div>
            <label v-for="option in paletteOptions" :key="option.value">
              <input
                type="radio"
                :name="paletteName"
                :value="option.value"
                :checked="!custom && palette === option.value"
                @change="choosePalette(option.value)"
              />
              <span><span class="glow-highlight-swatches" aria-hidden="true"><i v-for="color in option.swatches" :key="color" :style="{ backgroundColor: color }" /></span>{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
        <div class="space-type-customizations glow-highlight-color-grid">
          <div v-for="field in COLOR_FIELDS" :key="field.key" class="space-type-color-control">
            <label :for="`${colorId}-${field.key}`">{{ field.label }}</label>
            <div class="space-type-color-value">
              <span
                class="space-type-color-swatch"
                :style="{ backgroundColor: colors[field.key] }"
                aria-hidden="true"
              />
              <span>{{ colors[field.key].toUpperCase() }}</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m5 6.5 3 3 3-3"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <input
                :id="`${colorId}-${field.key}`"
                type="color"
                :value="colors[field.key]"
                @input="setColor(field.key, $event)"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="space-type-motion-controls">
        <div>
          <div class="space-type-speed-label">
            <label :for="spreadId">Spread</label>
            <output :for="spreadId">{{ spread.toFixed(2) }}×</output>
          </div>
          <input
            :id="spreadId"
            type="range"
            min="0.5"
            max="1.6"
            step="0.05"
            :value="spread"
            :style="rangeStyle(spread, 0.5, 1.6)"
            :aria-valuetext="`${spread.toFixed(2)} times the default size`"
            :aria-describedby="`${spreadId}-hint`"
            @input="spread = numberOf($event)"
          />
          <p :id="`${spreadId}-hint`" class="space-type-control-hint">{{ finishHint }} Spread scales every ring together.</p>
        </div>
        <div>
          <div class="space-type-speed-label">
            <label :for="durationId">Duration</label>
            <output :for="durationId">{{ duration }} ms</output>
          </div>
          <input
            :id="durationId"
            type="range"
            min="200"
            max="1400"
            step="50"
            :value="duration"
            :style="rangeStyle(duration, 200, 1400)"
            :aria-valuetext="`${duration} milliseconds`"
            :aria-describedby="`${durationId}-hint`"
            :disabled="reduced"
            @input="duration = numberOf($event)"
          />
          <p :id="`${durationId}-hint`" class="space-type-control-hint">Time to grow or fold away. Reversing mid-flight continues from the current frame.</p>
        </div>
      </div>
      <div class="glow-highlight-playback">
        <fieldset class="glow-highlight-segmented">
          <legend>Trigger</legend>
          <div>
            <label v-for="option in TRIGGERS" :key="option.value">
              <input
                type="radio"
                :name="triggerName"
                :value="option.value"
                :checked="trigger === option.value"
                @change="trigger = option.value"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
      </div>
      <p class="space-type-note">{{ note }}</p>
    </div>
  </section>
</template>
