<script lang="ts">
/*
 * AI agent notes: GlowHighlight
 *
 * Change the look with props only; the component has no runtime controls. Do not edit the
 * motion engine or glow-highlight.css to restyle one usage: they apply to every instance.
 *
 * Settings and defaults:
 *   finish    'glow' | 'sticker' | 'halo'                    default 'glow'
 *   palette   'candy' | 'sorbet' | 'berry' | 'after-dark'    default 'candy'
 *   spread    ring size multiplier, clamped 0–3              default 1
 *   duration  ms to grow or fold away                        default 600
 *   trigger   'view' | 'hover' | 'manual'                    default 'view'
 *   once      view: stay lit after the first entry           default true
 *   amount    view: visible fraction (0–1) needed to start   default 0.6
 *   active    manual: whether the glow is on                 default false
 *
 * To reproduce a docs look exactly, copy finish, palette, spread, duration, and trigger.
 * Any setting left out falls back to its default.
 *   Playful     <GlowHighlight>Playful</GlowHighlight>
 *   Sticker     <GlowHighlight finish="sticker" spread={0.8}>Sticker</GlowHighlight>
 *   Halo        <GlowHighlight finish="halo" spread={1.2} duration={900}>Halo</GlowHighlight>
 *   After dark  <GlowHighlight finish="sticker" palette="after-dark">after dark</GlowHighlight>
 *               Use on a dark surface with light text.
 *
 * Colors beyond the palettes: set --kida-glow-core, --kida-glow-rim, --kida-glow-band, and
 * --kida-glow-fringe in `style` on the component. A class loaded before this component's
 * CSS does not override them.
 *
 * The content renders twice: once as the traced copy and once as the readable text. Keep it on
 * the same line as its tags, because surrounding line breaks become spaces in both copies.
 * `hover` follows the nearest link, button, label, summary, or [tabindex] element, including
 * the highlight itself, so keyboard focus lights it too. Keep it to a word or short phrase:
 * every growing instance redraws its filter each frame. Reduced motion is handled inside;
 * do not add your own checks.
 */
import { type GlowHighlightControls, glowHighlight } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { GlowHighlightProps } from './types.js'

let {
  finish = 'glow',
  palette = 'candy',
  spread = 1,
  duration = 600,
  trigger = 'view',
  once = true,
  amount = 0.6,
  active = false,
  element = $bindable(null),
  children,
  ...rest
}: GlowHighlightProps = $props()

let controls: GlowHighlightControls | null = null
const root = $derived(element)
const restartKey = $derived(JSON.stringify([trigger, once, amount]))
const visualKey = $derived(JSON.stringify([finish, spread, duration]))
const manualKey = $derived(trigger === 'manual' ? String(active) : '')

$effect(() => {
  const node = root
  void restartKey
  if (!node) return
  const created = untrack(() =>
    glowHighlight(node, { finish, spread, duration, trigger, once, amount, active }),
  )
  controls = created
  return () => {
    created.destroy()
    if (controls === created) controls = null
  }
})

$effect(() => {
  void visualKey
  untrack(() => controls?.update({ finish, spread, duration }))
})

$effect(() => {
  if (manualKey) untrack(() => controls?.setActive(active))
})
</script>

<span {...rest} bind:this={element} data-kida-glow="" data-finish={finish} data-palette={palette} data-state="off"><span data-kida-glow-layer="" aria-hidden="true">{@render children?.()}</span><span data-kida-glow-content="">{@render children?.()}</span><svg data-kida-glow-defs="" aria-hidden="true" focusable="false"></svg></span>
