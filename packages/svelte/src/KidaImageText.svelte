<script lang="ts">
import { type ImageTextControls, imageText, imageTextStyle } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { ImageTextProps } from './types.js'

let {
  text,
  as = 'h2',
  image,
  position,
  duration,
  zoom,
  paused = false,
  element = $bindable(null),
  style,
  ...rest
}: ImageTextProps = $props()

let controls: ImageTextControls | null = null
const root = $derived(element)
const restartKey = $derived(JSON.stringify([text, duration, image, zoom]))

const rootStyle = $derived.by(() => {
  const authored = style
  const variables = imageTextStyle({ image, position, duration })
  const measured = untrack(() => element?.style.getPropertyValue('--kida-image-text-size'))
  if (measured) variables['--kida-image-text-size'] = measured
  return [...Object.entries(variables).map(([key, value]) => `${key}: ${value}`), authored]
    .filter(Boolean)
    .join('; ')
})

const attributes = $derived({
  ...rest,
  style: rootStyle,
  'data-kida-image-text': '',
  'data-image': 'loading',
  'data-state': 'pending',
  'data-suspended': 'true',
  'data-paused': String(paused),
})

$effect(() => {
  const node = root
  void restartKey
  if (!node) return
  const created = untrack(() => imageText(node, { image, position, duration, zoom, paused }))
  controls = created
  return () => {
    created.destroy()
    if (controls === created) controls = null
  }
})

$effect(() => {
  const value = paused
  untrack(() => controls?.setPaused(value))
})
</script>

{#if as === 'h1'}<h1 {...attributes} bind:this={element}>{text}</h1>
{:else if as === 'h3'}<h3 {...attributes} bind:this={element}>{text}</h3>
{:else if as === 'h4'}<h4 {...attributes} bind:this={element}>{text}</h4>
{:else if as === 'h5'}<h5 {...attributes} bind:this={element}>{text}</h5>
{:else if as === 'h6'}<h6 {...attributes} bind:this={element}>{text}</h6>
{:else if as === 'p'}<p {...attributes} bind:this={element}>{text}</p>
{:else}<h2 {...attributes} bind:this={element}>{text}</h2>
{/if}
