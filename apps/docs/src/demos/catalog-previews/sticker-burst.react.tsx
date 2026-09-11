import { StickerBurst } from '@kida-ui/react'
import { useEffect, useRef } from 'react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

export default function StickerBurstCatalogPreview({ active }: CatalogPreviewProps) {
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (active) root.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    else root.dataset.state = 'idle'
  }, [active])

  return (
    <StickerBurst ref={rootRef} count={10} distance={66} stickers={['✦', '🐈‍⬛', '♥', '★']}>
      <span className="demo-sticker-button">Make some joy</span>
    </StickerBurst>
  )
}
