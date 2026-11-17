<script lang="ts">
import { DualWave, type DualWaveItem } from '@kida-ui/svelte'

let {
  items,
  onIndexChange,
}: { items: readonly DualWaveItem[]; onIndexChange?: (index: number) => void } = $props()

let index = $state<number | undefined>(undefined)
export const getIndex = () => index
export const setIndex = (next: number) => {
  index = next
}
</script>

<DualWave {items} bind:index {onIndexChange} />
