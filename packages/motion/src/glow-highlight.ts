/**
 * GlowHighlight engine. Framework-agnostic; adapters render the markup contract and forward
 * options.
 *
 *   <span data-kida-glow>
 *     <span data-kida-glow-layer aria-hidden>text</span>         ← filtered copy, behind
 *     <span data-kida-glow-content>text</span>                   ← the real, readable text
 *     <svg data-kida-glow-defs aria-hidden></svg>                ← the engine fills this
 *   </span>
 *
 * The rings are an SVG filter on the hidden copy, built from its alpha, so any text, font
 * or size works and late-loading fonts re-trace for free. Motion is one progress value per
 * instance driven by an on-demand rAF loop that stops when settled. At rest the layer is
 * `visibility: hidden` when off, so an idle highlight costs no filter work.
 */
import {
  GLOW_CLOSING,
  type GlowHighlightFinish,
  type GlowRingPx,
  glowRingsPx,
  ringFrame,
  stepProgress,
} from './glow-highlight-math.js'
import { prefersReducedMotion, watchReducedMotion } from './reduced-motion.js'

export type { GlowHighlightFinish } from './glow-highlight-math.js'

export type GlowHighlightTrigger = 'view' | 'hover' | 'manual'

export interface GlowHighlightOptions {
  /** Ring treatment. @default 'glow' */
  finish?: GlowHighlightFinish
  /** Multiplier on ring size, from 0 to 3. @default 1 */
  spread?: number
  /** Time to fully grow or collapse, in ms. @default 600 */
  duration?: number
  /** What turns the glow on. @default 'view' */
  trigger?: GlowHighlightTrigger
  /** For `view`: glow once and stay lit. @default true */
  once?: boolean
  /** For `view`: visible fraction needed to start, from 0 to 1. @default 0.6 */
  amount?: number
  /** For `manual`: the initial state, applied without animation. @default false */
  active?: boolean
}

export interface GlowHighlightControls {
  /** Animate toward on or off. Interrupts and reverses any motion in progress. */
  setActive(active: boolean): void
  /** Apply new visual options without restarting or losing the current state. */
  update(options: Pick<GlowHighlightOptions, 'finish' | 'spread' | 'duration'>): void
  destroy(): void
}

const SVG = 'http://www.w3.org/2000/svg'
/**
 * Corner-rounding blur as a fraction of the ring radius. Thresholding the blur at 50% turns
 * feMorphology's square corners round and fills small counters (the bowls of P, a, e).
 */
const ROUNDING = 0.65
let nextId = 0

interface RingNodes {
  spec: GlowRingPx
  morph: SVGFEMorphologyElement
  close: SVGFEMorphologyElement
  smooth: SVGFEGaussianBlurElement
  round: SVGFEGaussianBlurElement
  flood: SVGFEFloodElement
}

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
  return node
}

const px = (value: number) => Math.round(value * 100) / 100

const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
  value !== undefined && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export function glowHighlight(
  root: HTMLElement,
  options: GlowHighlightOptions = {},
): GlowHighlightControls {
  const foundLayer = root.querySelector<HTMLElement>('[data-kida-glow-layer]')
  const defs = root.querySelector<SVGSVGElement>('[data-kida-glow-defs]')
  if (!foundLayer || !defs) throw new Error('glowHighlight: missing layer or defs markup')
  const layer: HTMLElement = foundLayer

  let finish: GlowHighlightFinish = options.finish ?? 'glow'
  let spread = finite(options.spread, 1, 0, 3)
  let duration = finite(options.duration, 600, 0, Number.POSITIVE_INFINITY)
  const trigger = options.trigger ?? 'view'

  const id = `kida-glow-${++nextId}`
  // The region is set in pixels around the layer's box (see fitRegion). The rings paint
  // outside the text without enlarging any box, so they never cause page overflow.
  const filter = el('filter', {
    id,
    filterUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB',
  })
  defs.append(filter)
  layer.style.filter = `url(#${id})`
  // Links or buttons inside the copy must not be focused twice. Set here rather than in markup
  // because React 18 and 19 serialize `inert` differently; until now the copy was
  // `visibility: hidden`, which also keeps it out of the tab order.
  layer.inert = true

  let rings: RingNodes[] = []
  let fontSize = 0
  let progress = trigger === 'manual' && options.active ? 1 : 0
  let target = progress
  let frame = 0
  let last = 0

  function build() {
    filter.replaceChildren()
    rings = []
    const specs = glowRingsPx(finish, fontSize, spread)
    const merge = el('feMerge', {})
    specs.forEach((spec, i) => {
      // Grow past the ring, round the square corners feMorphology leaves (blur, then a steep
      // threshold at 50%), and only then shrink back. Rounding while oversized keeps the
      // bridges that close counters, word spaces and line gaps; rounding after the shrink
      // would cut them again.
      const morph = el('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 0 })
      morph.setAttribute('result', `m${i}`)
      const round = el('feGaussianBlur', { in: `m${i}`, stdDeviation: 0, result: `r${i}` })
      const threshold = el('feComponentTransfer', { in: `r${i}`, result: `t${i}` })
      threshold.append(el('feFuncA', { type: 'linear', slope: 24, intercept: -11.5 }))
      const close = el('feMorphology', { in: `t${i}`, operator: 'erode', radius: 0 })
      close.setAttribute('result', `e${i}`)
      // The square erode kernel leaves boxy notches; a light second rounding removes them
      // without cutting the much wider bridges.
      const smooth = el('feGaussianBlur', { in: `e${i}`, stdDeviation: 0, result: `b${i}` })
      const edge = el('feComponentTransfer', { in: `b${i}`, result: `n${i}` })
      edge.append(el('feFuncA', { type: 'linear', slope: 24, intercept: -11.5 }))
      filter.append(morph, round, threshold, close, smooth, edge)

      let shape = `n${i}`
      if (spec.soft > 0) {
        filter.append(
          el('feGaussianBlur', { in: shape, stdDeviation: px(spec.soft), result: `s${i}` }),
        )
        shape = `s${i}`
      }
      if (spec.dy) {
        filter.append(el('feOffset', { in: shape, dy: px(spec.dy), result: `o${i}` }))
        shape = `o${i}`
      }
      const flood = el('feFlood', { 'flood-opacity': 0, result: `f${i}` })
      flood.style.setProperty('flood-color', `var(${spec.color})`)
      filter.append(
        flood,
        el('feComposite', { in: `f${i}`, in2: shape, operator: 'in', result: `c${i}` }),
      )
      rings.push({ spec, morph, close, round, smooth, flood })
    })
    // Outermost ring underneath, core on top.
    for (let i = specs.length - 1; i >= 0; i--) merge.append(el('feMergeNode', { in: `c${i}` }))
    filter.append(merge)
  }

  function render() {
    layer.style.visibility = progress > 0 ? 'visible' : 'hidden'
    if (progress <= 0) return
    rings.forEach(({ spec, ...nodes }, i) => {
      const { grow, alpha } = ringFrame(progress, i, rings.length)
      const radius = spec.radius * grow
      const em = fontSize * Math.min(1, grow)
      const cx = GLOW_CLOSING.x * em
      const cy = GLOW_CLOSING.y * em
      nodes.morph.setAttribute('radius', `${px(radius + cx)} ${px(radius + cy)}`)
      nodes.close.setAttribute('radius', `${px(cx)} ${px(cy)}`)
      nodes.smooth.setAttribute('stdDeviation', String(px(Math.max(0.3, cx * 0.4))))
      nodes.round.setAttribute('stdDeviation', String(px(Math.max(0.3, radius * ROUNDING))))
      nodes.flood.setAttribute('flood-opacity', String(px(spec.opacity * alpha)))
    })
  }

  function settleState() {
    root.dataset.state =
      progress === target ? (target === 1 ? 'on' : 'off') : target === 1 ? 'entering' : 'leaving'
  }

  function tick(now: number) {
    // A hidden tab pauses rAF; clamp so returning does not count the whole absence twice.
    const elapsed = Math.min(now - last, 100)
    last = now
    progress = stepProgress(progress, target, elapsed, duration)
    render()
    settleState()
    frame = progress === target ? 0 : requestAnimationFrame(tick)
  }

  function jump() {
    cancelAnimationFrame(frame)
    frame = 0
    progress = target
    render()
    settleState()
  }

  function setActive(active: boolean) {
    target = active ? 1 : 0
    if (prefersReducedMotion() || duration <= 0) {
      jump()
      return
    }
    if (!frame && progress !== target) {
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    settleState()
  }

  /**
   * Sizes the filter region to the furthest ring plus the closing grow, which happens before
   * the shrink and would be clipped by a tighter region. Smaller than a percentage region on
   * long phrases, so there are fewer pixels to filter.
   */
  function fitRegion() {
    const reach =
      Math.max(0, ...rings.map(({ spec }) => spec.radius + spec.soft * 3 + Math.abs(spec.dy))) +
      (Math.max(GLOW_CLOSING.x, GLOW_CLOSING.y) + 0.1) * fontSize +
      4
    filter.setAttribute('x', String(px(-reach)))
    filter.setAttribute('y', String(px(-reach)))
    filter.setAttribute('width', String(px(layer.offsetWidth + reach * 2)))
    filter.setAttribute('height', String(px(layer.offsetHeight + reach * 2)))
  }

  function measure() {
    const next = Number.parseFloat(getComputedStyle(root).fontSize)
    if (next !== fontSize) {
      fontSize = next
      build()
      render()
    }
    fitRegion()
  }

  measure()
  settleState()

  // Font size can change with the viewport (clamp(), container queries), and wrapping changes
  // the box the region surrounds; either way the root resizes.
  const resize = new ResizeObserver(measure)
  resize.observe(root)

  // Turning reduced motion on mid-flight settles immediately instead of finishing the growth.
  const cleanups: Array<() => void> = [
    () => resize.disconnect(),
    watchReducedMotion((reduced) => {
      if (reduced && frame) jump()
    }),
  ]

  if (trigger === 'view') {
    const once = options.once ?? true
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true)
          if (once) io.disconnect()
        } else if (!once) {
          setActive(false)
        }
      },
      { threshold: finite(options.amount, 0.6, 0, 1) },
    )
    io.observe(root)
    cleanups.push(() => io.disconnect())
  }

  if (trigger === 'hover') {
    // Highlights inside links and buttons respond to the control, not just the word.
    const host = root.closest<HTMLElement>('a, button, label, summary, [tabindex]') ?? root
    let hovered = false
    let focused = false
    const sync = () => setActive(hovered || focused)
    const enter = () => {
      hovered = true
      sync()
    }
    const leave = () => {
      hovered = false
      sync()
    }
    const focus = () => {
      focused = true
      sync()
    }
    const blur = () => {
      focused = false
      sync()
    }
    host.addEventListener('pointerenter', enter)
    host.addEventListener('pointerleave', leave)
    host.addEventListener('focusin', focus)
    host.addEventListener('focusout', blur)
    cleanups.push(() => {
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('focusin', focus)
      host.removeEventListener('focusout', blur)
    })
  }

  return {
    setActive,
    update(next) {
      const nextFinish = next.finish ?? finish
      const nextSpread = finite(next.spread, spread, 0, 3)
      const rebuild = nextFinish !== finish || nextSpread !== spread
      finish = nextFinish
      spread = nextSpread
      duration = finite(next.duration, duration, 0, Number.POSITIVE_INFINITY)
      if (rebuild) {
        build()
        render()
        fitRegion()
      }
    },
    destroy() {
      cancelAnimationFrame(frame)
      frame = 0
      for (const cleanup of cleanups) cleanup()
      filter.remove()
      layer.style.removeProperty('filter')
      layer.style.removeProperty('visibility')
      layer.inert = false
      root.dataset.state = 'off'
    },
  }
}
