<script setup lang="ts">
import { prefersReducedMotion, watchReducedMotion } from '@kida-ui/motion'
import { SpaceType, type SpaceTypeGeometry } from '@kida-ui/vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId } from 'vue'
import './space-type.css'

const { showHeading = true } = defineProps<{ showHeading?: boolean }>()

const DEFAULT_TEXT = 'KIDA-UI / SMALL-DETAILS-BIG-DELIGHT / '
const DEFAULT_COLOR = '#211c24'
const DEFAULT_BACKGROUND = '#fffafb'

function rangeStyle(value: number, min: number, max: number) {
  const progress = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0
  return { '--space-type-progress': `${progress}%` }
}

const textId = useId()
const speedId = useId()
const rowsId = useId()
const colorId = useId()
const backgroundId = useId()
const longitudeId = useId()
const radiusId = useId()
const text = shallowRef(DEFAULT_TEXT)
const speed = shallowRef(1)
const rows = shallowRef(1)
const color = shallowRef(DEFAULT_COLOR)
const background = shallowRef(DEFAULT_BACKGROUND)
const longitude = shallowRef(0)
const radius = shallowRef<number>()
const geometry = shallowRef<SpaceTypeGeometry | null>(null)
const appliedRadius = computed(() =>
  geometry.value
    ? Math.min(
        geometry.value.maxRadius,
        Math.max(geometry.value.minRadius, radius.value ?? geometry.value.radius),
      )
    : 0,
)
const colorControls = computed(() => [
  { id: colorId, label: 'Text color', value: color },
  { id: backgroundId, label: 'Background', value: background },
])

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

function setRows(event: Event) {
  const value = numberOf(event)
  rows.value = Number.isFinite(value) ? Math.min(6, Math.max(1, Math.round(value))) : 1
}
// Kept out of the template so no line break becomes a space in the rendered note.
const note = computed(() =>
  reduced.value
    ? 'Reduced motion is on. The rings stay still; you can still customize them.'
    : 'Make it yours. Set speed to zero to pause.',
)
</script>

<template>
  <section
    class="space-type-section"
    :data-embedded="!showHeading ? '' : undefined"
    :aria-labelledby="showHeading ? `${textId}-title` : undefined"
    :aria-label="showHeading ? undefined : 'SpaceType customization'"
  >
    <div v-if="showHeading" class="space-type-heading">
      <div>
        <p class="space-type-eyebrow">Typography in motion</p>
        <h2 :id="`${textId}-title`">Space Type</h2>
      </div>
      <span class="space-type-caption">Small details. Big delight.</span>
    </div>
    <SpaceType
      :text="text"
      :speed="speed"
      :rows="rows"
      :color="color"
      :background="background"
      :longitude="longitude"
      :radius="radius"
      @geometry-change="geometry = $event"
    />
    <div class="space-type-panel">
      <div class="space-type-controls">
        <div class="space-type-text-control">
          <label :for="textId">Text</label>
          <input
            :id="textId"
            type="text"
            :value="text"
            maxlength="100"
            spellcheck="false"
            :placeholder="DEFAULT_TEXT"
            @input="text = inputValue($event)"
          />
        </div>
        <div class="space-type-speed-control">
          <div class="space-type-speed-label">
            <label :for="speedId">Speed</label>
            <output :for="speedId">{{ speed === 0 ? 'Paused' : `${speed.toFixed(2)}×` }}</output>
          </div>
          <input
            :id="speedId"
            type="range"
            min="0"
            max="3"
            step="0.05"
            :value="speed"
            :style="rangeStyle(speed, 0, 3)"
            :aria-valuetext="speed === 0 ? 'Paused' : `${speed.toFixed(2)} times normal speed`"
            :disabled="reduced"
            @input="speed = numberOf($event)"
          />
        </div>
      </div>
      <div class="space-type-customizations">
        <div v-for="control in colorControls" :key="control.id" class="space-type-color-control">
          <label :for="control.id">{{ control.label }}</label>
          <div class="space-type-color-value">
            <span
              class="space-type-color-swatch"
              :style="{ backgroundColor: control.value.value }"
              aria-hidden="true"
            />
            <span>{{ control.value.value.toUpperCase() }}</span>
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
              :id="control.id"
              type="color"
              :value="control.value.value"
              @input="control.value.value = inputValue($event)"
            />
          </div>
        </div>
        <div class="space-type-rows-control">
          <label :for="rowsId">Rows</label>
          <div class="space-type-stepper">
            <button
              type="button"
              aria-label="Decrease rows"
              :aria-controls="rowsId"
              :disabled="rows <= 1"
              @click="rows = Math.max(1, rows - 1)"
            >−</button>
            <input
              :id="rowsId"
              type="number"
              min="1"
              max="6"
              step="1"
              :value="rows"
              @input="setRows"
            />
            <button
              type="button"
              aria-label="Increase rows"
              :aria-controls="rowsId"
              :disabled="rows >= 6"
              @click="rows = Math.min(6, rows + 1)"
            >+</button>
          </div>
        </div>
      </div>
      <div class="space-type-motion-controls">
        <div>
          <div class="space-type-speed-label">
            <label :for="radiusId">Radius</label>
            <output :for="radiusId">{{ geometry ? `${Math.round(appliedRadius)} px` : 'Auto' }}</output>
          </div>
          <input
            :id="radiusId"
            type="range"
            :min="geometry?.minRadius ?? 0"
            :max="geometry?.maxRadius ?? 0"
            step="1"
            :value="appliedRadius"
            :style="rangeStyle(appliedRadius, geometry?.minRadius ?? 0, geometry?.maxRadius ?? 0)"
            :disabled="!geometry || geometry.maxRadius <= geometry.minRadius"
            :aria-describedby="`${radiusId}-hint`"
            @input="radius = numberOf($event)"
          />
          <p :id="`${radiusId}-hint`" class="space-type-control-hint">Smaller rings pack the letters closer. Letter size stays fixed.</p>
        </div>
        <div>
          <div class="space-type-speed-label">
            <label :for="longitudeId">Longitude</label>
            <output :for="longitudeId">{{ longitude }}%</output>
          </div>
          <input
            :id="longitudeId"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="longitude"
            :style="rangeStyle(longitude, 0, 100)"
            :aria-describedby="`${longitudeId}-hint`"
            @input="longitude = numberOf($event)"
          />
          <p :id="`${longitudeId}-hint`" class="space-type-control-hint">Pulse the rings and tilt the letters with the wave.</p>
        </div>
      </div>
      <p class="space-type-note">{{ note }}</p>
    </div>
  </section>
</template>
