<script lang="ts">
import DualWave from '$lib/components/ui/kida/dual-wave.svelte'
import type { DualWaveItem } from '$lib/components/ui/kida/dual-wave.types.js'

const projects: readonly DualWaveItem[] = [
  {
    id: 'coast',
    title: 'Coastline',
    subtitle: 'Studio North',
    src: '/coast.jpg',
    alt: 'Sunset over the coast',
  },
  {
    id: 'garden',
    title: 'Garden Notes',
    subtitle: 'Field & Co',
    src: '/garden.jpg',
    alt: 'Flowers in the garden',
  },
  {
    id: 'city',
    title: 'City Lights',
    subtitle: 'Night Desk',
    src: '/city.jpg',
    alt: 'Streets after dark',
  },
  {
    id: 'studio',
    title: 'Studio Cat',
    subtitle: 'Home Office',
    src: '/cat.jpg',
    alt: 'A cat on a desk',
  },
]
</script>

<DualWave items={projects} headings={['Projects', 'Clients']} />
