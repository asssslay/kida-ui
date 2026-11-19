<script lang="ts">
import { GlowHighlight } from '@kida-ui/svelte'
</script>

<div class="demo-glow-finishes">
  <p><GlowHighlight finish="glow">Glow</GlowHighlight> for a headline</p>
  <p><GlowHighlight finish="sticker" spread={0.8}>Sticker</GlowHighlight> for a label</p>
  <p><GlowHighlight finish="halo" spread={1.2} duration={900}>Halo</GlowHighlight> for running text</p>
</div>
