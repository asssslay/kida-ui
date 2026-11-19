<script lang="ts">
import { Magnetic, type MagneticProps } from '@kida-ui/svelte'

let {
  label = 'Pull me',
  sink,
  ...rest
}: MagneticProps & { label?: string; sink?: { current: HTMLElement | null } } = $props()

let element = $state<HTMLSpanElement | null>(null)
const setElement = (value: HTMLSpanElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<Magnetic {...rest} bind:element={() => element, setElement}><button type="button" style="width: 120px; height: 48px">{label}</button></Magnetic>
