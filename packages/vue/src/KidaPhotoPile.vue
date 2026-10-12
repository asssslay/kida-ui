<script setup lang="ts">
import { photoPile } from '@kida-ui/motion'
import { shallowRef, watch } from 'vue'
import type { PhotoPilePhoto, PhotoPileProps } from './types.js'

defineOptions({ name: 'KidaPhotoPile', inheritAttrs: false })
const props = defineProps<PhotoPileProps>()
const element = shallowRef<HTMLFieldSetElement | null>(null)
const items = new Map<string, HTMLButtonElement>()
defineExpose({ element })
const positions = [
  { x: -54, y: -10, rotation: -7 },
  { x: 52, y: -18, rotation: 6 },
  { x: 2, y: 30, rotation: -1.5 },
  { x: -24, y: -38, rotation: 4 },
  { x: 38, y: 24, rotation: -5 },
] as const

watch(
  [
    () => element.value,
    () => JSON.stringify(props.photos.map((photo) => photo.id)),
    () => props.dragScale,
    () => props.tilt,
  ],
  (_, __, onCleanup) => {
    const node = element.value
    if (!node) return
    // Collection changes end the previous gesture and reset layering in the new DOM order.
    node.querySelectorAll<HTMLElement>('[data-kida-photo-item]').forEach((item, index) => {
      item.style.zIndex = String(index + 1)
    })
    onCleanup(photoPile(node, { ...props }))
  },
  { flush: 'post' },
)

function setItem(id: string, node: unknown) {
  if (node) items.set(id, node as HTMLButtonElement)
  else items.delete(id)
}

function itemStyle(photo: PhotoPilePhoto, index: number) {
  const fallback = positions[index % positions.length] ?? positions[0]
  return {
    '--kida-photo-x': `${(photo.x ?? fallback.x) * (props.spread ?? 1)}px`,
    '--kida-photo-y': `${(photo.y ?? fallback.y) * (props.spread ?? 1)}px`,
    '--kida-photo-rotation': `${photo.rotation ?? fallback.rotation}deg`,
    zIndex: items.get(photo.id)?.style.zIndex ?? index + 1,
  }
}
</script>

<template>
  <fieldset v-bind="$attrs" ref="element" :aria-label="($attrs['aria-label'] as string | undefined) ?? 'Draggable photo pile'" data-kida-photo-pile="">
    <span data-kida-photo-stage="">
      <button v-for="(photo, index) in props.photos" :key="photo.id" :ref="(node) => setItem(photo.id, node)" type="button" :aria-label="`Bring ${photo.alt || `Photo ${index + 1}`} to front and drag`" data-kida-photo-item="" :style="itemStyle(photo, index)">
        <span data-kida-photo-card="">
          <img v-bind="photo.imageProps" :src="photo.src" :alt="photo.alt" :draggable="false" />
        </span>
      </button>
    </span>
  </fieldset>
</template>
