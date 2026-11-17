<script lang="ts">
import { GlowHighlight, type GlowHighlightProps } from '@kida-ui/svelte'

let {
  label = 'glow',
  href,
  sink,
  ...rest
}: GlowHighlightProps & {
  label?: string
  href?: string
  sink?: { current: HTMLElement | null }
} = $props()

let element = $state<HTMLSpanElement | null>(null)
const setElement = (value: HTMLSpanElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<p>Make it <GlowHighlight {...rest} bind:element={() => element, setElement}>{#if href}<a {href}>{label}</a>{:else}{label}{/if}</GlowHighlight></p>
