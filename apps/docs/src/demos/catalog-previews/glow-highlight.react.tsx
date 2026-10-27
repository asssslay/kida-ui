import { GlowHighlight } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function GlowHighlightCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <p className="demo-glow-copy">
      Calm at rest.{' '}
      <GlowHighlight trigger="manual" active={active}>
        Playful
      </GlowHighlight>
    </p>
  )
}
