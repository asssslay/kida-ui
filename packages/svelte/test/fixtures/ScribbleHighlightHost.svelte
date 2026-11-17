<script lang="ts">
import { ScribbleHighlight, type ScribbleHighlightProps } from '@kida-ui/svelte'

let {
  label = 'Worth highlighting',
  ...rest
}: Omit<ScribbleHighlightProps, 'children'> & { label?: string } = $props()
</script>

<ScribbleHighlight {...rest}>{label}</ScribbleHighlight>
