import { Magnetic } from '@kida-ui/react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function MagneticCatalogPreview(_props: CatalogPreviewProps) {
  return (
    <Magnetic maxDistance={20} strength={0.24}>
      <span className="demo-magnetic-button">Come closer</span>
    </Magnetic>
  )
}
