<script setup lang="ts">
import type { PhotoPilePhoto } from '@/components/ui/kida/photo-pile.types'
import PhotoPile from '@/components/ui/kida/photo-pile.vue'

const photos: readonly PhotoPilePhoto[] = [
  { id: 'garden', src: '/garden.jpg', alt: 'Flowers in the garden' },
  { id: 'coast', src: '/coast.jpg', alt: 'Sunset over the coast' },
  { id: 'pool', src: '/pool.jpg', alt: 'Striped float in a pool' },
]
</script>

<template>
  <PhotoPile :photos="photos" aria-label="Summer snapshots" />
</template>
