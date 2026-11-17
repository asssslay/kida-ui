<script lang="ts">
import { GlowHighlight, type GlowHighlightPalette } from '@kida-ui/svelte'

let {
  scene,
  palettes = [],
  active = true,
}: {
  scene: 'palettes' | 'hover' | 'view' | 'pair'
  palettes?: readonly GlowHighlightPalette[]
  active?: boolean
} = $props()
</script>

{#if scene === 'palettes'}
  <p>
    <GlowHighlight>default</GlowHighlight>
    {#each palettes as name (name)}<GlowHighlight palette={name}>{name}</GlowHighlight>{/each}
    <GlowHighlight palette="berry" style="--kida-glow-core: #123456">custom</GlowHighlight>
  </p>
{:else if scene === 'hover'}
  <p style="margin: 240px 0 0 240px"><a href="#notes">Read the <GlowHighlight trigger="hover">notes</GlowHighlight></a></p>
{:else if scene === 'view'}
  <div style="height: 150vh"></div>
  <GlowHighlight id="once" duration={150}>scrolled</GlowHighlight>
  <GlowHighlight id="again" duration={150} once={false}>again</GlowHighlight>
  <div style="height: 150vh"></div>
{:else}
  <GlowHighlight trigger="manual" duration={2000} {active}>one</GlowHighlight>
  <GlowHighlight trigger="manual" duration={2000} {active}>two</GlowHighlight>
{/if}
