<script lang="ts">
import { textBloom, textBloomInitialStyle } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { TextBloomProps } from './types.js'

let {
  text,
  by = 'word',
  as = 'span',
  voice,
  stagger,
  delay,
  duration,
  once,
  amount,
  element = $bindable(null),
  ...rest
}: TextBloomProps = $props()

const initial = $derived(textBloomInitialStyle(voice))
const segments = $derived.by(() => {
  const parts = by === 'character' ? Array.from(text) : text.split(/(\s+)/)
  let cursor = 0
  return parts.map((part) => {
    const key = JSON.stringify([by, voice, cursor, part])
    cursor += part.length
    return { key, text: part, whitespace: /^\s*$/.test(part) }
  })
})

const root = $derived(element)
const optionsKey = $derived(
  JSON.stringify([text, by, voice, stagger, delay, duration, once, amount]),
)

$effect(() => {
  const node = root
  void optionsKey
  if (!node) return
  return untrack(() => textBloom(node, { voice, stagger, delay, duration, once, amount }))
})
</script>

<svelte:element this={as} {...rest} bind:this={element} data-kida-text-bloom="" data-state="idle"><span>{#each segments as segment (segment.key)}{#if segment.whitespace}{segment.text}{:else}<span data-kida-text-bloom-segment="" style:opacity={initial.opacity} style:transform={initial.transform} style:transform-origin={initial.transformOrigin} style:will-change={initial.willChange}>{segment.text}</span>{/if}{/each}</span></svelte:element>
