<script lang="ts">
import { ImageText, type ImageTextProps } from '@kida-ui/svelte'

let { sink, ...rest }: ImageTextProps & { sink?: { current: HTMLElement | null } } = $props()

let element = $state<HTMLElement | null>(null)
const setElement = (value: HTMLElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<ImageText {...rest} bind:element={() => element, setElement} />
