import { SpaceType } from '@kida-ui/react'
import type { CSSProperties } from 'react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function SpaceTypeCatalogPreview({ active }: CatalogPreviewProps) {
  return (
    <SpaceType
      text="KIDA-UI / MADE-TO-MOVE / "
      paused={!active}
      style={
        {
          '--kida-space-type-height': '10rem',
          '--kida-space-type-background': 'transparent',
        } as CSSProperties
      }
    />
  )
}
