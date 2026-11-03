<script setup lang="ts">
import {
  getSpaceTypeGeometry,
  type SpaceTypeControls,
  type SpaceTypeGeometry,
  spaceType,
} from '@kida-ui/motion'
import { computed, onMounted, type StyleValue, shallowRef, watch } from 'vue'
import type { SpaceTypeProps } from './types.js'

defineOptions({ name: 'KidaSpaceType', inheritAttrs: false })
const props = withDefaults(defineProps<SpaceTypeProps>(), {
  speed: 1,
  paused: false,
  rows: 1,
  longitude: 0,
})
const emit = defineEmits<{
  /** Fitted geometry and the available radius range after measurement. */
  'geometry-change': [geometry: SpaceTypeGeometry | null]
}>()
const element = shallowRef<HTMLDivElement | null>(null)
const size = shallowRef({ width: 0, height: 0 })
let controls: SpaceTypeControls | null = null
defineExpose({ element })

const rowCount = computed(() =>
  Number.isFinite(props.rows) ? Math.max(1, Math.min(6, Math.round(props.rows))) : 1,
)
const wave = computed(() =>
  Number.isFinite(props.longitude) ? Math.max(0, Math.min(100, props.longitude)) : 0,
)
const characters = computed(() => Array.from(props.text))
const geometry = computed(() =>
  getSpaceTypeGeometry(
    size.value.width,
    size.value.height,
    characters.value.length,
    rowCount.value,
    wave.value,
    props.radius,
  ),
)
const playback = () => ({
  speed: props.speed,
  paused: props.paused || characters.value.length === 0,
})

watch(
  () => element.value,
  (node, _, onCleanup) => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      if (size.value.width !== width || size.value.height !== height) size.value = { width, height }
    })
    observer.observe(node)
    const created = spaceType(node, playback())
    controls = created
    onCleanup(() => {
      observer.disconnect()
      created.destroy()
      if (controls === created) controls = null
    })
  },
  { flush: 'post' },
)

watch(
  [() => props.speed, () => props.paused, () => characters.value.length],
  () => controls?.setPlayback(playback()),
  { flush: 'post' },
)

// Reported on the client only, starting with null before the first measurement.
onMounted(() => {
  watch(geometry, (next) => emit('geometry-change', next), { immediate: true, flush: 'post' })
})

const rootStyle = computed(() => ({
  '--kida-space-type-count': Math.max(characters.value.length, 1),
  '--kida-space-type-rows': rowCount.value,
  '--kida-space-type-longitude': wave.value,
  ...(props.color === undefined ? {} : { '--kida-space-type-color': props.color }),
  ...(props.background === undefined ? {} : { '--kida-space-type-background': props.background }),
  ...(geometry.value
    ? {
        '--kida-space-type-size': `${geometry.value.fontSize}px`,
        '--kida-space-type-radius': `${geometry.value.radius}px`,
        '--kida-space-type-perspective': `${geometry.value.perspective}px`,
      }
    : {}),
}))
</script>

<template>
  <div v-bind="$attrs" ref="element" data-kida-space-type="" :style="[rootStyle, $attrs.style as StyleValue]">
    <span data-kida-space-type-text="">{{ props.text }}</span>
    <div data-kida-space-type-space="" aria-hidden="true">
      <div data-kida-space-type-camera="">
        <div data-kida-space-type-ring="">
          <div v-for="row in rowCount" :key="row" data-kida-space-type-row="" :style="{ '--kida-space-type-row': row - 1 }">
            <span v-for="(character, index) in characters" :key="index" data-kida-space-type-letter="" :style="{ '--kida-space-type-index': index }">
              <span data-kida-space-type-face="front">{{ character }}</span>
              <span data-kida-space-type-face="back">{{ character }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
