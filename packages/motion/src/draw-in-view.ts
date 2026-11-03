import { inView } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

export interface DrawInViewOptions {
  /** Animate only on the first viewport entry. @default true */
  once?: boolean
  /** How much of the element must be visible. @default 0.4 */
  amount?: 'some' | 'all' | number
}

/** Custom property set on each shape: its drawn length in pixels, for dash-based drawing. */
const LENGTH = '--kida-draw-length'

/**
 * Length of an SVG shape as drawn, in pixels of its `<svg>` viewport.
 *
 * A stroke with `vector-effect: non-scaling-stroke` is dashed in these pixels, not in user units
 * or `pathLength`, and a stretched viewBox (`preserveAspectRatio="none"`) changes the drawn
 * length with the element's size. Sampling the shape through its viewport matrix measures that
 * length for any stretch.
 */
export function drawnLength(shape: SVGGeometryElement, samples = 48): number {
  const matrix = shape.getCTM()
  const total = shape.getTotalLength()
  if (!matrix || !total) return 0
  let length = 0
  let previous: DOMPoint | undefined
  for (let index = 0; index <= samples; index++) {
    const point = shape.getPointAtLength((total * index) / samples).matrixTransform(matrix)
    if (previous) length += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return length
}

export function drawInView(element: HTMLElement, options: DrawInViewOptions = {}): () => void {
  if (prefersReducedMotion()) {
    element.dataset.state = 'settled'
    return () => {}
  }

  const { once = true, amount = 0.4 } = options
  element.dataset.state = 'idle'

  // Each shape's dash spans its whole drawn length, so it reveals in one stroke at any size.
  // Rounding up and one extra pixel cover sampling error and keep the end cap hidden until drawn.
  const shapes = [...element.querySelectorAll<SVGGeometryElement>('svg path')]
  const measure = () => {
    for (const shape of shapes) {
      const length = drawnLength(shape)
      if (length) shape.style.setProperty(LENGTH, `${Math.ceil(length) + 1}px`)
      else shape.style.removeProperty(LENGTH)
    }
  }
  measure()
  // Font loading, content, and container changes resize the element, including after drawing.
  const resize = new ResizeObserver(measure)
  resize.observe(element)

  const stop = inView(
    element,
    () => {
      element.dataset.state = 'active'
      if (once) stop()
      return once
        ? undefined
        : () => {
            element.dataset.state = 'idle'
          }
    },
    { amount },
  )

  return () => {
    stop()
    resize.disconnect()
    for (const shape of shapes) shape.style.removeProperty(LENGTH)
  }
}
