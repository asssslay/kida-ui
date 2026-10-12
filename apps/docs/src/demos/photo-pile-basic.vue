<script setup lang="ts">
import { PhotoPile, type PhotoPilePhoto } from '@kida-ui/vue'

const photos: readonly PhotoPilePhoto[] = [
  { id: 'flower', src: '/demo/photo-pile-flower.svg', alt: 'Pink paper flower' },
  { id: 'sunset', src: '/demo/photo-pile-sunset.svg', alt: 'Orange sunset over mint hills' },
  { id: 'pool', src: '/demo/photo-pile-pool.svg', alt: 'Mint pool with striped float' },
]
</script>

<template>
  <PhotoPile :photos="photos" aria-label="Playful summer snapshots" />
</template>
