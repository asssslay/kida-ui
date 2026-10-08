<script setup lang="ts">
import {
  type CollapseSizeObserver,
  observeCollapseSize,
  prefersReducedMotion,
} from '@kida-ui/motion'
import * as presence from '@zag-js/presence'
import { normalizeProps, useMachine } from '@zag-js/vue'
import { computed, onUpdated, shallowRef, watch } from 'vue'
import type { CollapseProps } from './types.js'

defineOptions({ name: 'KidaCollapse', inheritAttrs: false })
const props = defineProps<CollapseProps>()
const emit = defineEmits<{ 'exit-complete': [] }>()
const service = useMachine(presence.machine, {
  get present() {
    return props.open
  },
  onExitComplete: () => emit('exit-complete'),
})
const api = computed(() => presence.connect(service, normalizeProps))
const element = shallowRef<HTMLDivElement | null>(null)
const content = shallowRef<HTMLDivElement | null>(null)
let size: CollapseSizeObserver | undefined
defineExpose({ element })

watch(element, (node) => api.value.setNode(node), { flush: 'post' })
watch(
  [element, content],
  ([node, inner], _, onCleanup) => {
    if (!node || !inner) return
    const observer = observeCollapseSize(node, inner)
    size = observer
    onCleanup(() => {
      observer.disconnect()
      size = undefined
    })
  },
  { flush: 'post' },
)

// Root styles can change without resizing the inner content. Refresh after Vue patches them.
onUpdated(() => size?.measure())
watch(
  () => props.open,
  (open) => {
    if (!open && prefersReducedMotion()) api.value.unmount()
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    v-if="api.present"
    v-bind="$attrs"
    ref="element"
    data-kida-collapse=""
    :data-state="props.open ? 'open' : 'closed'"
    :data-skip-animation="api.skip ? '' : undefined"
  >
    <div ref="content"><slot /></div>
  </div>
</template>
