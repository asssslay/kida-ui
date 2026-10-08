<script setup lang="ts">
import { Collapse } from '@kida-ui/vue'
import { ref, useId } from 'vue'

const open = ref(true)
const panelId = useId()
const exits = ref(0)
</script>

<template>
  <div class="demo-stack">
    <button type="button" class="demo-button" :aria-expanded="open" :aria-controls="open ? panelId : undefined" @click="open = !open">
      {{ open ? 'Hide details' : 'Show details' }}
    </button>
    <Collapse :id="panelId" :open="open" @exit-complete="exits++">
      <div class="demo-panel">
        <h2>Room for the details.</h2>
        <p>The panel stays mounted until its CSS exit animation finishes.</p>
      </div>
    </Collapse>
    <p role="status">Completed exits: {{ exits }}</p>
  </div>
</template>
