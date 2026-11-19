<script lang="ts">
import { magnetic } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { MagneticProps } from './types.js'

let {
  strength,
  maxDistance,
  targetClass,
  element = $bindable(null),
  children,
  ...rest
}: MagneticProps = $props()

let target = $state<HTMLSpanElement | null>(null)

// A parent's {...spread} invalidates every prop when any one changes. These deriveds only
// notify on a real value change, so unrelated updates cannot restart the controller.
const root = $derived(element)
const optionsKey = $derived(`${strength}:${maxDistance}`)

$effect(() => {
  const outer = root
  const inner = target
  void optionsKey
  if (!outer || !inner) return
  return untrack(() => magnetic(outer, inner, { strength, maxDistance }))
})
</script>

<span {...rest} bind:this={element} data-kida-magnetic=""><span bind:this={target} class={targetClass} data-kida-magnetic-target="">{@render children?.()}</span></span>
