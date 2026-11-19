<script lang="ts">
import {
  Collapse,
  DualWave,
  GlowHighlight,
  ImageText,
  Magnetic,
  PhotoPile,
  Reveal,
  ScribbleHighlight,
  SpaceType,
  StickerBurst,
  TextBloom,
} from '@kida-ui/svelte'
import { photos, waveItems } from '../fixtures.js'

let { group }: { group: 'primitives' | 'surfaces' | 'dual-wave' } = $props()
const image = photos[0]?.src ?? ''
</script>

{#if group === 'primitives'}
  <main><Reveal as="section"><h2>Reveal content</h2></Reveal><Collapse open={true}><p>Collapse content</p></Collapse><TextBloom as="h2" text="Soft text, clearly spoken." /><Magnetic><button type="button">Magnetic action</button></Magnetic><PhotoPile {photos} /><p><ScribbleHighlight>Underline</ScribbleHighlight> <ScribbleHighlight variant="circle">Circle</ScribbleHighlight></p><StickerBurst count={6} seed={3}><button type="button">Celebrate</button></StickerBurst></main>
{:else if group === 'surfaces'}
  <main><ImageText {image} text="Color between the lines." /><SpaceType text="KIDA / ORBIT / " rows={2} style="height: 240px" /><p style="font-size: 28px">Make it <GlowHighlight trigger="manual" active={true}>sweet</GlowHighlight> and <GlowHighlight trigger="manual" active={true} finish="sticker" palette="berry">bold</GlowHighlight></p></main>
{:else}
  <main><DualWave items={waveItems} defaultIndex={1} style="--kida-dual-wave-height: 380px" /><DualWave items={waveItems} layout="frame" style="--kida-dual-wave-height: 380px" /></main>
{/if}
