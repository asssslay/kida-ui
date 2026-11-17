<script lang="ts">
import { DualWave, type DualWaveProps } from '@kida-ui/svelte'

let { sink, ...rest }: DualWaveProps & { sink?: { current: HTMLElement | null } } = $props()

let element = $state<HTMLElement | null>(null)
const setElement = (value: HTMLElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<DualWave {...rest} bind:element={() => element, setElement} />
