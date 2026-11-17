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

let { open = true }: { open?: boolean } = $props()
</script>

<main style="color: #241f22; background: #fff; padding: 20px">
  <h1>Svelte components</h1>
  <Reveal as="section"><h2>Reveal content</h2></Reveal>
  <Collapse {open}><p>Collapse content</p></Collapse>
  <TextBloom as="h2" text="Text bloom content" />
  <Magnetic><button type="button">Magnetic action</button></Magnetic>
  <PhotoPile {photos} aria-label="Travel snapshots" />
  <p><ScribbleHighlight>Highlighted content</ScribbleHighlight></p>
  <StickerBurst><button type="button">Celebrate</button></StickerBurst>
  <ImageText image={photos[0]?.src ?? ''} text="Image text content" />
  <SpaceType text="Space type content" style="height: 200px" />
  <p>Make it <GlowHighlight>glow</GlowHighlight></p>
  <DualWave items={waveItems} defaultIndex={1} aria-label="Showcase projects" />
</main>
