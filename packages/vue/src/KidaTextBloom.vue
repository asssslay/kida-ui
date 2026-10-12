<script setup lang="ts">
import { textBloom, textBloomInitialStyle } from '@kida-ui/motion'
import { computed, shallowRef, watch } from 'vue'
import type { TextBloomProps } from './types.js'

defineOptions({ name: 'KidaTextBloom', inheritAttrs: false })
const props = withDefaults(defineProps<TextBloomProps>(), { once: undefined })
const element = shallowRef<HTMLElement | null>(null)
const nodes = new Map<string, HTMLElement>()
defineExpose({ element })

const segments = computed(() => {
  const parts = props.by === 'character' ? Array.from(props.text) : props.text.split(/(\s+)/)
  let cursor = 0
  return parts.map((text) => {
    const key = JSON.stringify([props.by, props.voice, cursor, text])
    cursor += text.length
    return { key, text, whitespace: /^\s*$/.test(text) }
  })
})

watch(
  [
    () => element.value,
    () => props.as,
    () => props.text,
    () => props.by,
    () => props.voice,
    () => props.stagger,
    () => props.delay,
    () => props.duration,
    () => props.once,
    () => props.amount,
  ],
  (_, __, onCleanup) => {
    if (element.value) onCleanup(textBloom(element.value, { ...props }))
  },
  { flush: 'post' },
)

function setSegment(key: string, node: unknown) {
  // Function refs are also called with null when a segment is removed.
  if (node) nodes.set(key, node as HTMLElement)
  else nodes.delete(key)
}

function segmentStyle(key: string) {
  const node = nodes.get(key)
  return node
    ? {
        opacity: node.style.opacity,
        transform: node.style.transform,
        transformOrigin: node.style.transformOrigin,
        willChange: node.style.willChange,
      }
    : textBloomInitialStyle(props.voice)
}
</script>

<template>
  <component
    :is="props.as ?? 'span'"
    v-bind="$attrs"
    ref="element"
    data-kida-text-bloom=""
    :data-state="element?.dataset.state ?? 'idle'"
  >
    <span><template v-for="segment in segments" :key="segment.key"><template v-if="segment.whitespace">{{ segment.text }}</template><span v-else :ref="(node) => setSegment(segment.key, node)" data-kida-text-bloom-segment="" :style="segmentStyle(segment.key)">{{ segment.text }}</span></template></span>
  </component>
</template>
