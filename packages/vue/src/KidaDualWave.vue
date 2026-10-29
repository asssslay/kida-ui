<script setup lang="ts">
import { type DualWaveControls, dualWave, getDualWaveMosaicRows } from '@kida-ui/motion'
import { computed, shallowRef, useId, watch } from 'vue'
import type { DualWaveProps } from './types.js'

defineOptions({ name: 'KidaDualWave', inheritAttrs: false })
// Keep an omitted captureScroll undefined so the shared core's default of true applies.
const props = withDefaults(defineProps<DualWaveProps>(), {
  headings: () => ['Projects', 'Clients'] as const,
  layout: 'mosaic',
  columns: 3,
  defaultIndex: 0,
  captureScroll: undefined,
})
const emit = defineEmits<{
  /** The item nearest the center changed; also enables v-model:index. */
  'update:index': [index: number]
  'index-change': [index: number]
}>()
const element = shallowRef<HTMLElement | null>(null)
let controls: DualWaveControls | null = null
defineExpose({ element })

const toIndex = (value: number | undefined, count: number) =>
  count && value !== undefined && Number.isFinite(value)
    ? ((Math.round(value) % count) + count) % count
    : 0

const helpId = useId()
const count = computed(() => props.items.length)
const selected = shallowRef(toIndex(props.index ?? props.defaultIndex, count.value))
// A shorter item list keeps the selection on its last item.
const active = computed(() => (count.value ? Math.min(selected.value, count.value - 1) : 0))
const current = computed(() => props.items[active.value])
const gridColumns = computed(() =>
  Number.isFinite(props.columns) ? Math.max(2, Math.min(5, Math.round(props.columns))) : 3,
)
const gridRows = computed(() => getDualWaveMosaicRows(gridColumns.value))
const itemKey = computed(() =>
  props.items
    .map((item) => [item.id, item.src, item.title, item.subtitle].join('\u0001'))
    .join('\u0000'),
)

// Structure changes restart the controller from the item on screen; options update in place.
watch(
  [() => element.value, itemKey, () => props.layout, gridColumns],
  (_, __, onCleanup) => {
    const node = element.value
    if (!node) return
    const created = dualWave(node, {
      index: active.value,
      strength: props.strength,
      response: props.response,
      captureScroll: props.captureScroll,
      onIndexChange(next) {
        selected.value = next
        emit('update:index', next)
        emit('index-change', next)
      },
    })
    controls = created
    onCleanup(() => {
      created.destroy()
      if (controls === created) controls = null
    })
  },
  { flush: 'post' },
)

watch(
  [() => props.strength, () => props.response, () => props.captureScroll],
  () =>
    controls?.update({
      strength: props.strength,
      response: props.response,
      captureScroll: props.captureScroll,
    }),
  { flush: 'post' },
)

watch(
  [() => props.index, count],
  ([index, total]) => {
    if (index === undefined || !total) return
    const next = toIndex(index, total)
    if (next !== active.value) controls?.select(next)
  },
  { flush: 'post' },
)

const mosaicStyle = computed(() => ({
  '--kida-dual-wave-columns': gridColumns.value,
  '--kida-dual-wave-rows': gridRows.value,
  ...(current.value
    ? { '--kida-dual-wave-initial': `url(${JSON.stringify(current.value.src)})` }
    : {}),
}))
</script>

<template>
  <!-- Focus scopes arrow-key navigation to this carousel without global key handlers. -->
  <section
    v-bind="$attrs"
    ref="element"
    data-kida-dual-wave=""
    :data-layout="props.layout"
    aria-roledescription="carousel"
    :aria-label="($attrs['aria-label'] as string | undefined) ?? props.headings[0]"
    :aria-describedby="($attrs['aria-describedby'] as string | undefined) ?? helpId"
    :tabindex="($attrs.tabindex as number | string | undefined) ?? 0"
  >
    <div data-kida-dual-wave-headings="" aria-hidden="true">
      <span>{{ props.headings[0] }}</span>
      <span>{{ props.headings[1] }}</span>
    </div>
    <div data-kida-dual-wave-field="">
      <fieldset data-kida-dual-wave-column="title" :aria-label="props.headings[0]">
        <button v-for="(item, index) in props.items" :key="item.id" type="button" data-kida-dual-wave-item="" :aria-label="`Show ${item.title}, ${item.subtitle}`" :aria-current="index === active ? 'true' : undefined" :tabindex="index === active ? 0 : -1">{{ item.title }}</button>
      </fieldset>
      <fieldset data-kida-dual-wave-column="subtitle" :aria-label="props.headings[1]">
        <button v-for="(item, index) in props.items" :key="item.id" type="button" data-kida-dual-wave-item="" :aria-label="`Show ${item.subtitle}, ${item.title}`" :aria-current="index === active ? 'true' : undefined" :tabindex="-1">{{ item.subtitle }}</button>
      </fieldset>
    </div>
    <div data-kida-dual-wave-media="">
      <div v-if="props.layout === 'mosaic'" data-kida-dual-wave-mosaic="" :data-kida-dual-wave-columns="gridColumns" aria-hidden="true" :style="mosaicStyle">
        <div v-for="tile in gridColumns * gridRows" :key="tile" data-kida-dual-wave-tile="" :style="{ '--kida-dual-wave-column': (tile - 1) % gridColumns, '--kida-dual-wave-row': Math.floor((tile - 1) / gridColumns) }">
          <span data-kida-dual-wave-layer="" />
          <span data-kida-dual-wave-layer="" />
        </div>
      </div>
      <div data-kida-dual-wave-images="" aria-hidden="true">
        <img v-for="(item, index) in props.items" :key="item.id" v-bind="item.imageProps" :src="item.src" alt="" data-kida-dual-wave-image="" :data-current="index === active ? '' : undefined" :decoding="item.imageProps?.decoding ?? 'async'" :draggable="false" />
      </div>
      <span v-if="current" data-kida-dual-wave-sr="" role="img" :aria-label="current.alt" />
    </div>
    <span :id="helpId" data-kida-dual-wave-sr="">Scroll, swipe, or use arrow keys</span>
    <span data-kida-dual-wave-sr="" aria-live="polite" aria-atomic="true">{{ current ? `Item ${active + 1} of ${count}: ${current.title}, ${current.subtitle}.` : '' }}</span>
  </section>
</template>
