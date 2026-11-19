<script lang="ts">
import { Magnetic } from '@kida-ui/svelte'

let {
  onclick,
  onpointerdown,
}: { onclick?: (event: MouseEvent) => void; onpointerdown?: (event: PointerEvent) => void } =
  $props()
</script>

<Magnetic><button type="button" {onclick} {onpointerdown}>Touch action</button></Magnetic>
