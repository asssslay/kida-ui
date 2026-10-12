<script setup lang="ts">
import { stickerBurst, stickerBurstLayout } from '@kida-ui/motion'
import { computed, shallowRef, watch } from 'vue'
import type { StickerBurstProps } from './types.js'

defineOptions({ name: 'KidaStickerBurst', inheritAttrs: false })
const props = defineProps<StickerBurstProps>()
const element = shallowRef<HTMLSpanElement | null>(null)
defineExpose({ element })
const defaults = ['✦', '●', '♥', '★']
const symbols = computed(() => (props.stickers?.length ? props.stickers : defaults))
const points = computed(() => stickerBurstLayout({ ...props }))

watch(
  () => element.value,
  (node, _, onCleanup) => {
    if (node) onCleanup(stickerBurst(node))
  },
  { flush: 'post' },
)
</script>

<template>
  <span v-bind="$attrs" ref="element" data-kida-sticker-burst="" :data-state="element?.dataset.state ?? 'idle'">
    <span data-kida-sticker-content=""><slot /></span>
    <span aria-hidden="true" data-kida-sticker-layer="">
      <span v-for="(point, index) in points" :key="`${point.x}-${point.y}-${point.delay}`" :style="{
        '--kida-sticker-x': `${point.x}px`,
        '--kida-sticker-y': `${point.y}px`,
        '--kida-sticker-rotation': `${point.rotation}deg`,
        '--kida-sticker-delay': `${point.delay}ms`,
        '--kida-sticker-scale': point.scale,
      }">{{ symbols[index % symbols.length] }}</span>
    </span>
  </span>
</template>
