<script setup lang="ts">
import { StickerBurst } from '@kida-ui/vue'
</script>

<template>
  <StickerBurst :count="10" :distance="72" :stickers="['✦', '🐈‍⬛', '♥', '★']">
    <button type="button" class="demo-sticker-button">Make some joy</button>
  </StickerBurst>
</template>
