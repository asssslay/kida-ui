<script lang="ts">
import { reveal, revealInitialStyle } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { RevealProps } from './types.js'

let {
  as = 'div',
  x,
  y,
  scale,
  duration,
  delay,
  ease,
  once,
  amount,
  margin,
  element = $bindable(null),
  style,
  children,
  ...rest
}: RevealProps = $props()

// A parent's {...spread} invalidates every prop when any one changes. These deriveds only
// notify on a real value change, so unrelated updates cannot restart the controller.
const root = $derived(element)
const easeKey = $derived(Array.isArray(ease) ? ease.join(',') : ease)
const optionsKey = $derived(JSON.stringify([x, y, scale, duration, delay, once, amount, margin]))

// The controller owns these inline values after mount. A changed authored style must carry
// them forward, or it would re-hide a settled reveal. A new root starts from the initial state.
const rootStyle = $derived.by(() => {
  const tag = as
  const authored = style
  const node = untrack(() => element)
  const motion =
    node?.localName === tag
      ? {
          opacity: node.style.opacity,
          transform: node.style.transform,
          willChange: node.style.willChange,
        }
      : untrack(() => revealInitialStyle({ x, y, scale }))
  return [
    `opacity: ${motion.opacity}`,
    `transform: ${motion.transform}`,
    `will-change: ${motion.willChange}`,
    authored,
  ]
    .filter(Boolean)
    .join('; ')
})

$effect(() => {
  const node = root
  void [optionsKey, easeKey]
  if (!node) return
  return untrack(() => reveal(node, { x, y, scale, duration, delay, ease, once, amount, margin }))
})
</script>

<svelte:element this={as} {...rest} bind:this={element} data-kida-reveal="" style={rootStyle}>{@render children?.()}</svelte:element>
