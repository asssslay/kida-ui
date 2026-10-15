<script setup lang="ts">
import { Collapse } from '@kida-ui/vue'
import { ref, useId } from 'vue'

const props = withDefaults(defineProps<{ initialOpen?: boolean }>(), { initialOpen: false })
const open = ref(props.initialOpen)
const panelId = useId()
</script>

<template>
  <div class="demo-stack">
    <button type="button" class="demo-button" :aria-expanded="open" :aria-controls="open ? panelId : undefined" @click="open = !open">
      {{ open ? 'Close' : 'Open' }}
    </button>
    <Collapse :id="panelId" :open="open">
      <div class="demo-panel">
        <p>The node stays mounted until the close keyframes finish.</p>
        <p>Its natural height is measured into --kida-collapse-height.</p>
      </div>
    </Collapse>
  </div>
</template>
