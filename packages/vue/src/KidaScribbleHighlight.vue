<script setup lang="ts">
import { drawInView } from '@kida-ui/motion'
import { shallowRef, watch } from 'vue'
import type { ScribbleHighlightProps } from './types.js'

defineOptions({ name: 'KidaScribbleHighlight', inheritAttrs: false })
const props = withDefaults(defineProps<ScribbleHighlightProps>(), { once: undefined })
const element = shallowRef<HTMLSpanElement | null>(null)
defineExpose({ element })
const paths = {
  underline: 'M2 12.5 C18 8.5 34 15.5 50 11 C66 6.5 82 14 98 9.5',
  circle: 'M6 10 C16 1 78 0 94 8 C104 15 88 20 50 19 C14 19 -3 15 6 10',
} as const

watch(
  [() => element.value, () => props.variant, () => props.once, () => props.amount],
  (_, __, onCleanup) => {
    if (element.value) onCleanup(drawInView(element.value, { ...props }))
  },
  { flush: 'post' },
)
</script>

<template>
  <span v-bind="$attrs" ref="element" data-kida-scribble="" :data-variant="props.variant ?? 'underline'" :data-state="element?.dataset.state ?? 'idle'">
    <span data-kida-scribble-content=""><slot /></span>
    <svg aria-hidden="true" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path :d="paths[props.variant ?? 'underline']" pathLength="1" />
    </svg>
  </span>
</template>
