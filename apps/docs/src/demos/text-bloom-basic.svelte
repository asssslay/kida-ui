<script lang="ts">
import { TextBloom } from '@kida-ui/svelte'

let replay = $state(0)
</script>

<div class="demo-feature demo-text-bloom">
  {#key replay}
    <TextBloom as="h2" voice="pop" text="Make the headline bloom." />
  {/key}
  <button type="button" class="demo-button" onclick={() => replay++}>Replay</button>
</div>
