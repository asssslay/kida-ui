<script setup lang="ts">
import { type ImageTextControls, imageText, imageTextStyle } from '@kida-ui/motion'
import { type StyleValue, shallowRef, watch } from 'vue'
import type { ImageTextProps } from './types.js'

defineOptions({ name: 'KidaImageText', inheritAttrs: false })
const props = defineProps<ImageTextProps>()
const element = shallowRef<HTMLElement | null>(null)
let controls: ImageTextControls | null = null
defineExpose({ element })

// Playback updates are independent of loading and measurement and keep the current frame.
watch(
  [
    () => element.value,
    () => props.as,
    () => props.text,
    () => props.duration,
    () => props.image,
    () => props.zoom,
  ],
  (_, __, onCleanup) => {
    const node = element.value
    if (!node) return
    const created = imageText(node, { ...props })
    controls = created
    onCleanup(() => {
      created.destroy()
      if (controls === created) controls = null
    })
  },
  { flush: 'post' },
)

watch(
  () => props.paused,
  (paused) => controls?.setPaused(paused),
  { flush: 'post' },
)
</script>

<template>
  <component
    :is="props.as ?? 'h2'"
    v-bind="$attrs"
    ref="element"
    :style="[imageTextStyle(props), $attrs.style as StyleValue]"
    data-kida-image-text=""
    data-image="loading"
    data-state="pending"
    data-suspended="true"
    :data-paused="String(props.paused)"
  >{{ props.text }}</component>
</template>
