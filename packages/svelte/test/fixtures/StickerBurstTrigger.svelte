<script lang="ts">
import { StickerBurst, type StickerBurstProps } from '@kida-ui/svelte'

let { label = 'Celebrate', ...rest }: Omit<StickerBurstProps, 'children'> & { label?: string } =
  $props()
</script>

<StickerBurst {...rest}><button type="button">{label}</button></StickerBurst>
