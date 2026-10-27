<script setup lang="ts">
import { Reveal } from '@kida-ui/vue'

const cards = [
  { title: 'From the left', options: { x: -32, y: 0 } },
  { title: 'Scale up', options: { scale: 0.9, y: 0 } },
  { title: 'Slow', options: { duration: 1.2 } },
  { title: 'Every time', options: { once: false } },
]
</script>

<template>
  <div class="demo-grid">
    <Reveal v-for="card in cards" :key="card.title" v-bind="card.options" class="demo-card">
      <strong>{{ card.title }}</strong>
      <code>{{ JSON.stringify(card.options) }}</code>
    </Reveal>
  </div>
</template>
