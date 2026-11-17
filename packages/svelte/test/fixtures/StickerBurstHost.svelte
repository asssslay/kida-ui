<script lang="ts">
import { StickerBurst } from '@kida-ui/svelte'

let { onclick }: { onclick?: (event: MouseEvent) => void } = $props()
</script>

<StickerBurst><button type="button" {onclick}>Celebrate</button></StickerBurst>
