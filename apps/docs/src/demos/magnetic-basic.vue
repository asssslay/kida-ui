<script setup lang="ts">
import { Magnetic } from '@kida-ui/vue'
</script>

<template>
  <Magnetic :max-distance="20" :strength="0.24">
    <button type="button" class="demo-magnetic-button">Come closer</button>
  </Magnetic>
</template>
