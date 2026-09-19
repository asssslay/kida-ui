import { Reveal } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

const content = (
  <>
    <strong>Scrolled into view</strong>
    <span>Rises gently and fades into place.</span>
  </>
)

export default function RevealCatalogPreview({ active }: CatalogPreviewProps) {
  return active ? (
    <Reveal className="demo-card">{content}</Reveal>
  ) : (
    <div className="demo-card">{content}</div>
  )
}
