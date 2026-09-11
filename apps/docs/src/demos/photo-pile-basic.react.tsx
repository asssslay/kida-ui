import { PhotoPile } from '@kida-ui/react'

const photos = [
  { id: 'flower', src: '/demo/photo-pile-flower.svg', alt: 'Pink paper flower' },
  { id: 'sunset', src: '/demo/photo-pile-sunset.svg', alt: 'Orange sunset over mint hills' },
  { id: 'pool', src: '/demo/photo-pile-pool.svg', alt: 'Mint pool with striped float' },
]

export default function PhotoPileBasic() {
  return <PhotoPile photos={photos} aria-label="Playful summer snapshots" />
}
