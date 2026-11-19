<script lang="ts">
import {
  type CollapseSizeObserver,
  observeCollapseSize,
  prefersReducedMotion,
} from '@kida-ui/motion'
import * as presence from '@zag-js/presence'
import { normalizeProps, useMachine } from '@zag-js/svelte'
import { untrack } from 'svelte'
import type { CollapseProps } from './types.js'

let { open, onExitComplete, element = $bindable(null), children, ...rest }: CollapseProps = $props()

const service = useMachine(presence.machine, () => ({
  present: open,
  onExitComplete: () => onExitComplete?.(),
}))
const api = $derived(presence.connect(service, normalizeProps))
let content = $state<HTMLDivElement | null>(null)
let size: CollapseSizeObserver | undefined
const root = $derived(element)

$effect(() => {
  const node = root
  untrack(() => api.setNode(node))
})

$effect(() => {
  const node = root
  const inner = content
  if (!node || !inner) return
  const observer = observeCollapseSize(node, inner)
  size = observer
  return () => {
    observer.disconnect()
    if (size === observer) size = undefined
  }
})

$effect(() => {
  void { ...rest }
  untrack(() => size?.measure())
})

$effect(() => {
  if (!open) untrack(() => prefersReducedMotion() && api.unmount())
})
</script>

{#if api.present}
  <div
    {...rest}
    bind:this={element}
    data-kida-collapse=""
    data-state={open ? 'open' : 'closed'}
    data-skip-animation={api.skip ? '' : undefined}
  >
    <div bind:this={content}>{@render children?.()}</div>
  </div>
{/if}
