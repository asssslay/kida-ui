<script lang="ts">
import { photoPile } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { PhotoPileProps } from './types.js'

let {
  photos,
  spread = 1,
  dragScale,
  tilt,
  element = $bindable(null),
  'aria-label': ariaLabel = 'Draggable photo pile',
  ...rest
}: PhotoPileProps = $props()

const positions = [
  { x: -54, y: -10, rotation: -7 },
  { x: 52, y: -18, rotation: 6 },
  { x: 2, y: 30, rotation: -1.5 },
  { x: -24, y: -38, rotation: 4 },
  { x: 38, y: 24, rotation: -5 },
] as const

const root = $derived(element)
const restartKey = $derived(JSON.stringify([photos.map((photo) => photo.id), dragScale, tilt]))
const layout = $derived(
  photos.map((photo, index) => {
    const fallback = positions[index % positions.length] ?? positions[0]
    return {
      photo,
      label: `Bring ${photo.alt || `Photo ${index + 1}`} to front and drag`,
      x: `${(photo.x ?? fallback.x) * spread}px`,
      y: `${(photo.y ?? fallback.y) * spread}px`,
      rotation: `${photo.rotation ?? fallback.rotation}deg`,
      layer: index + 1,
    }
  }),
)

$effect(() => {
  const node = root
  void restartKey
  if (!node) return
  return untrack(() => {
    node.querySelectorAll<HTMLElement>('[data-kida-photo-item]').forEach((item, index) => {
      item.style.zIndex = String(index + 1)
    })
    return photoPile(node, { dragScale, tilt })
  })
})
</script>

<fieldset {...rest} bind:this={element} aria-label={ariaLabel} data-kida-photo-pile="">
  <span data-kida-photo-stage="">
    {#each layout as item (item.photo.id)}
      <button
        type="button"
        aria-label={item.label}
        data-kida-photo-item=""
        style:--kida-photo-x={item.x}
        style:--kida-photo-y={item.y}
        style:--kida-photo-rotation={item.rotation}
        style:z-index={item.layer}
      >
        <span data-kida-photo-card="">
          <img {...item.photo.imageProps} src={item.photo.src} alt={item.photo.alt} draggable="false" />
        </span>
      </button>
    {/each}
  </span>
</fieldset>
