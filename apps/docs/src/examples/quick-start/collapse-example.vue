<script setup lang="ts">
import { ref, useId } from 'vue'
import Collapse from '@/components/ui/kida/collapse.vue'

const open = ref(false)
const panelId = useId()
</script>

<template>
  <div>
    <button type="button" :aria-expanded="open" :aria-controls="open ? panelId : undefined" @click="open = !open">
      {{ open ? 'Hide details' : 'Show details' }}
    </button>
    <Collapse :id="panelId" :open="open"><div>Anything at all.</div></Collapse>
  </div>
</template>
