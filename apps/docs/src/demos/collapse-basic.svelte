<script lang="ts">
import { Collapse } from '@kida-ui/svelte'
import { untrack } from 'svelte'

let { initialOpen = false }: { initialOpen?: boolean } = $props()
let open = $state(untrack(() => initialOpen))
const panelId = $props.id()
</script>

<div class="demo-stack">
  <button type="button" class="demo-button" aria-expanded={open} aria-controls={open ? panelId : undefined} onclick={() => (open = !open)}>
    {open ? 'Close' : 'Open'}
  </button>
  <Collapse id={panelId} {open}>
    <div class="demo-panel">
      <p>The node stays mounted until the close keyframes finish.</p>
      <p>Its natural height is measured into --kida-collapse-height.</p>
    </div>
  </Collapse>
</div>
