import { TextBloom } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function TextBloomCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <div className="demo-feature demo-text-bloom">
      {active ? (
        <TextBloom as="h2" voice="pop">
          Make the headline bloom.
        </TextBloom>
      ) : (
        <h2>Make the headline bloom.</h2>
      )}
    </div>
  )
}
