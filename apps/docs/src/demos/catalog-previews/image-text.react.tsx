import { ImageText } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'
import '../image-text.css'

export default function ImageTextCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <div className="demo-image-text">
      <ImageText image="/demo/image-text/pink-bloom.webp" paused={!active}>
        A world of color, between the lines.
      </ImageText>
    </div>
  )
}
