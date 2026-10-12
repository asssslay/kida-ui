<script setup lang="ts">
import { magnetic } from '@kida-ui/motion'
import { shallowRef, watch } from 'vue'
import type { MagneticProps } from './types.js'

defineOptions({ name: 'KidaMagnetic', inheritAttrs: false })
const props = defineProps<MagneticProps>()
const element = shallowRef<HTMLSpanElement | null>(null)
const target = shallowRef<HTMLSpanElement | null>(null)
defineExpose({ element })

watch(
  [() => element.value, () => target.value, () => props.strength, () => props.maxDistance],
  (_, __, onCleanup) => {
    if (element.value && target.value)
      onCleanup(magnetic(element.value, target.value, { ...props }))
  },
  { flush: 'post' },
)
</script>

<template>
  <span v-bind="$attrs" ref="element" data-kida-magnetic="">
    <span ref="target" :class="props.targetClass" data-kida-magnetic-target=""><slot /></span>
  </span>
</template>
