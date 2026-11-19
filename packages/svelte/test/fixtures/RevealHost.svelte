<script lang="ts">
import { Reveal, type RevealProps } from '@kida-ui/svelte'

let {
  label = 'Reveal content',
  sink,
  ...rest
}: RevealProps & { label?: string; sink?: { current: HTMLElement | null } } = $props()

let element = $state<HTMLElement | null>(null)
const setElement = (value: HTMLElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<Reveal {...rest} bind:element={() => element, setElement}>{label}</Reveal>
