<script lang="ts">
import Collapse from '$lib/components/ui/kida/collapse.svelte'

let open = $state(false)
const panelId = $props.id()
</script>

<div>
  <button type="button" aria-expanded={open} aria-controls={open ? panelId : undefined} onclick={() => (open = !open)}>
    {open ? 'Hide details' : 'Show details'}
  </button>
  <Collapse id={panelId} {open}><div>Anything at all.</div></Collapse>
</div>
