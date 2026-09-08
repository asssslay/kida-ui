import { StickerBurst } from '@kida-ui/react'

export default function StickerBurstBasic() {
  return (
    <StickerBurst count={10} distance={72} stickers={['✦', '●', '♥', '★']}>
      <button type="button" className="demo-sticker-button">
        Make some joy
      </button>
    </StickerBurst>
  )
}
