<script lang="ts">
import { stickerBurst, stickerBurstLayout } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { StickerBurstProps } from './types.js'

let {
  stickers,
  count,
  distance,
  seed,
  element = $bindable(null),
  children,
  ...rest
}: StickerBurstProps = $props()

const defaults = ['✦', '●', '♥', '★']
const symbols = $derived(stickers?.length ? stickers : defaults)
const points = $derived(stickerBurstLayout({ count, distance, seed }))
const root = $derived(element)

$effect(() => {
  const node = root
  if (!node) return
  return untrack(() => stickerBurst(node))
})
</script>

<span {...rest} bind:this={element} data-kida-sticker-burst="" data-state="idle"><span data-kida-sticker-content="">{@render children?.()}</span><span aria-hidden="true" data-kida-sticker-layer="">{#each points as point, index (index)}<span
        style:--kida-sticker-x={`${point.x}px`}
        style:--kida-sticker-y={`${point.y}px`}
        style:--kida-sticker-rotation={`${point.rotation}deg`}
        style:--kida-sticker-delay={`${point.delay}ms`}
        style:--kida-sticker-scale={point.scale}
      >{symbols[index % symbols.length]}</span>{/each}</span></span>
