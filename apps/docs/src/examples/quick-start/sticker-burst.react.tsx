import { StickerBurst } from '@/components/ui/kida/sticker-burst'

export default function StickerBurstExample() {
  return (
    <StickerBurst stickers={['✦', '🐈‍⬛', '♥', '★']}>
      <button type="button">Celebrate</button>
    </StickerBurst>
  )
}
