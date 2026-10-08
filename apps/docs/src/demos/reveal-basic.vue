<script setup lang="ts">
import { Reveal } from '@kida-ui/vue'
import { ref } from 'vue'

const replay = ref(0)
</script>

<template>
  <div class="demo-stack">
    <button type="button" class="demo-button" @click="replay++">Replay reveal</button>
    <Reveal :key="replay" class="demo-card" as="section" :y="16" :duration="0.5">
      <h2>A little movement, a clear message.</h2>
      <p>Shared animation, native Vue props and slots.</p>
    </Reveal>
  </div>
</template>
