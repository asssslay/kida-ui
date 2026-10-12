<script setup lang="ts">
import { TextBloom } from '@kida-ui/vue'
import { ref } from 'vue'

const replay = ref(0)
</script>

<template>
  <div class="demo-feature demo-text-bloom">
    <TextBloom :key="replay" as="h2" voice="pop" text="Make the headline bloom." />
    <button type="button" class="demo-button" @click="replay++">Replay</button>
  </div>
</template>
