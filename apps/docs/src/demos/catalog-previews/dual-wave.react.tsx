import { DualWave } from '@kida-ui/react'
import { useEffect, useState } from 'react'
import type { CatalogPreviewProps } from '../catalog-preview-types'
import { DUAL_WAVE_PHOTOS } from '../dual-wave-photos'

// A short run keeps the catalog light: eight photos instead of the full set.
const items = DUAL_WAVE_PHOTOS.slice(3, 11)

export default function DualWaveCatalogPreview({ active }: CatalogPreviewProps) {
  const [index, setIndex] = useState(3)

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setIndex((current) => current + 1), 1100)
    return () => window.clearInterval(timer)
  }, [active])

  return (
    <DualWave
      items={items}
      index={index}
      defaultIndex={3}
      headings={['Projects', 'Photographers']}
      captureScroll={false}
      tabIndex={-1}
      aria-label="Photo projects"
    />
  )
}
