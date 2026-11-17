<script lang="ts">
import { SpaceType, type SpaceTypeProps } from '@kida-ui/svelte'

let {
  spacers = false,
  sink,
  ...rest
}: SpaceTypeProps & {
  spacers?: boolean
  sink?: { current: HTMLElement | null }
} = $props()

let element = $state<HTMLDivElement | null>(null)
const setElement = (value: HTMLDivElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

{#if spacers}<div style="height: 150vh"></div>{/if}
<SpaceType {...rest} bind:element={() => element, setElement} />
{#if spacers}<div style="height: 150vh"></div>{/if}
