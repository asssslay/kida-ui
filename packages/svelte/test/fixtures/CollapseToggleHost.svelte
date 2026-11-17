<script lang="ts">
import { Collapse } from '@kida-ui/svelte'

let { onExitComplete }: { onExitComplete?: () => void } = $props()

let open = $state(false)
</script>

<div>
  <button
    id="toggle"
    type="button"
    aria-expanded={open}
    aria-controls="details"
    onclick={() => {
      open = !open
    }}
  >Details</button>
  <Collapse {open} id="details" {onExitComplete}><p>Readable touch content</p></Collapse>
</div>
