import { PhotoPile } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

const photos = [
  { id: 'flower', src: '/demo/photo-pile-flower.svg', alt: 'Pink paper flower' },
  { id: 'sunset', src: '/demo/photo-pile-sunset.svg', alt: 'Orange sunset over mint hills' },
  { id: 'pool', src: '/demo/photo-pile-pool.svg', alt: 'Mint pool with striped float' },
]

export default function PhotoPileCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <PhotoPile
      photos={photos}
      spread={active ? 0.78 : 0.62}
      aria-label="Playful summer snapshots"
    />
  )
}
