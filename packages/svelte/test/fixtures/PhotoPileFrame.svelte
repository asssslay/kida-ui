<script lang="ts">
import { PhotoPile, type PhotoPilePhoto } from '@kida-ui/svelte'

let {
  photos,
  width,
  height,
}: { photos: readonly PhotoPilePhoto[]; width: number; height: number } = $props()
</script>

<div style="padding-top: 240px">
  <div
    style:width={`${width}px`}
    style:height={`${height}px`}
    style="display: grid; place-items: center; overflow: hidden"
  >
    <PhotoPile {photos} style="width: 100%; height: 100%; min-height: 0" />
  </div>
</div>
