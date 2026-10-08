<script setup lang="ts">
import { reveal, revealInitialStyle } from '@kida-ui/motion'
import { type StyleValue, shallowRef, watch } from 'vue'
import type { RevealProps } from './types.js'

defineOptions({ name: 'KidaReveal', inheritAttrs: false })
// Vue casts an absent Boolean prop to false. Keep omission undefined so the shared core's
// once=true default applies while an explicit :once="false" still requests repetition.
const props = withDefaults(defineProps<RevealProps>(), { once: undefined })
const element = shallowRef<HTMLElement | null>(null)
defineExpose({ element })

watch(
  [
    () => element.value,
    () => props.as,
    () => props.x,
    () => props.y,
    () => props.scale,
    () => props.duration,
    () => props.delay,
    () => (Array.isArray(props.ease) ? props.ease.join(',') : props.ease),
    () => props.once,
    () => props.amount,
    () => props.margin,
  ],
  (_, __, onCleanup) => {
    if (element.value) onCleanup(reveal(element.value, { ...props }))
  },
  { flush: 'post' },
)

function motionStyle() {
  // Vue patches every bound style on updates. Preserve the controller's current inline state
  // so changing slot content, classes, or an equivalent easing tuple cannot re-hide a reveal.
  const node = element.value
  return node
    ? {
        opacity: node.style.opacity,
        transform: node.style.transform,
        willChange: node.style.willChange,
      }
    : revealInitialStyle(props)
}
</script>

<template>
  <component
    :is="props.as ?? 'div'"
    v-bind="$attrs"
    ref="element"
    data-kida-reveal=""
    :style="[motionStyle(), $attrs.style as StyleValue]"
  >
    <slot />
  </component>
</template>
