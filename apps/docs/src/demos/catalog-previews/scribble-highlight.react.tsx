import { ScribbleHighlight } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function ScribbleHighlightCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <p className="demo-scribble-copy">
      Keep the layout precise, then add one{' '}
      {active ? <ScribbleHighlight>imperfect detail</ScribbleHighlight> : 'imperfect detail'}.
    </p>
  )
}
