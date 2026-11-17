<script lang="ts">
import { TextBloom, type TextBloomProps } from '@kida-ui/svelte'

let { sink, ...rest }: TextBloomProps & { sink?: { current: HTMLElement | null } } = $props()

let element = $state<HTMLElement | null>(null)
const setElement = (value: HTMLElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<TextBloom {...rest} bind:element={() => element, setElement} />
