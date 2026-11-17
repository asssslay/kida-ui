<script lang="ts">
import { Collapse } from '@kida-ui/svelte'

let { width = 360 }: { width?: number } = $props()
</script>

<div style:width={`${width}px`}>
  <Collapse open={true}><p style="margin: 0; line-height: 20px">Responsive content grows taller when the available inline space becomes substantially narrower.</p></Collapse>
</div>
