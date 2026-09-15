import { PhotoPile } from '@/components/ui/kida/photo-pile'

const photos = [
  { id: 'garden', src: '/garden.jpg', alt: 'Flowers in the garden' },
  { id: 'coast', src: '/coast.jpg', alt: 'Sunset over the coast' },
  { id: 'pool', src: '/pool.jpg', alt: 'Striped float in a pool' },
]

export default function PhotoPileExample() {
  return <PhotoPile photos={photos} />
}
