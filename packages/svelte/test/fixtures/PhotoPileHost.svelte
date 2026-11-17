<script lang="ts">
import { PhotoPile, type PhotoPileProps } from '@kida-ui/svelte'

let { sink, ...rest }: PhotoPileProps & { sink?: { current: HTMLFieldSetElement | null } } =
  $props()

let element = $state<HTMLFieldSetElement | null>(null)
const setElement = (value: HTMLFieldSetElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<PhotoPile {...rest} bind:element={() => element, setElement} />
