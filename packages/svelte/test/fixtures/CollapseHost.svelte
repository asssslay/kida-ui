<script lang="ts">
import { Collapse, type CollapseProps } from '@kida-ui/svelte'

let {
  label = 'Collapse content',
  height = 40,
  sink,
  ...rest
}: Omit<CollapseProps, 'children'> & {
  label?: string
  height?: number
  sink?: { current: HTMLDivElement | null }
} = $props()

let element = $state<HTMLDivElement | null>(null)
const setElement = (value: HTMLDivElement | null | undefined) => {
  element = value ?? null
  if (sink) sink.current = element
}
</script>

<Collapse {...rest} bind:element={() => element, setElement}><div style:height={`${height}px`}>{label}</div></Collapse>
