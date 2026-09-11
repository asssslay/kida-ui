import { animate } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

export interface PhotoPileOptions {
  /** Scale applied while a photo is being dragged. @default 1.035 */
  dragScale?: number
  /** Degrees of responsive tilt per horizontal CSS pixel. @default 0.025 */
  tilt?: number
}

const DEFAULTS = { dragScale: 1.035, tilt: 0.025 } as const
const IDENTITY = 'translate3d(0px, 0px, 0) rotate(0deg) scale(1)'

/**
 * Adds direct pointer dragging and a spring return to every photo card in a pile.
 * The positioned item stays still; only its inner card moves, so authored layout transforms
 * never compete with the drag transform.
 */
export function photoPile(root: HTMLElement, options: PhotoPileOptions = {}): () => void {
  const { dragScale = DEFAULTS.dragScale, tilt = DEFAULTS.tilt } = options
  const reduced = prefersReducedMotion()
  const items = [...root.querySelectorAll<HTMLElement>('[data-kida-photo-item]')]
  const cleanups: Array<() => void> = []
  const originalZ = new Map(items.map((item) => [item, item.style.zIndex]))
  let topLayer = items.length

  const activate = (item: HTMLElement) => {
    topLayer += 1
    item.style.zIndex = String(topLayer)
  }

  for (const item of items) {
    const card = item.querySelector<HTMLElement>('[data-kida-photo-card]')
    if (!card) continue

    let pointerId: number | undefined
    let originX = 0
    let originY = 0
    let x = 0
    let y = 0
    let frame = 0
    let settleFrame = 0
    let controls: ReturnType<typeof animate> | undefined

    const transform = () =>
      `translate3d(${x}px, ${y}px, 0) rotate(${x * tilt}deg) scale(${dragScale})`

    const paint = () => {
      frame = 0
      card.style.transform = transform()
    }

    const settle = () => {
      controls?.cancel()
      controls = undefined
      card.style.transform = 'none'
      card.style.willChange = 'auto'
      delete item.dataset.dragging
    }

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== undefined || (event.pointerType === 'mouse' && event.button !== 0)) return
      if (settleFrame) {
        cancelAnimationFrame(settleFrame)
        settleFrame = 0
      }
      controls?.cancel()
      pointerId = event.pointerId
      originX = event.clientX
      originY = event.clientY
      x = 0
      y = 0
      activate(item)
      item.dataset.dragging = ''
      card.style.willChange = 'transform'
      card.style.transform = IDENTITY
      try {
        item.setPointerCapture(pointerId)
      } catch {
        // Synthetic pointer events and older browsers may not expose capture; window listeners
        // below still keep the gesture alive.
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      x = event.clientX - originX
      y = event.clientY - originY
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      pointerId = undefined
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
        card.style.transform = transform()
      }
      try {
        if (item.hasPointerCapture(event.pointerId)) item.releasePointerCapture(event.pointerId)
      } catch {
        // See the capture fallback above.
      }

      if (reduced) {
        settle()
        return
      }

      const from = transform()
      controls = animate(
        card,
        { transform: [from, IDENTITY] },
        {
          type: 'spring',
          stiffness: 420,
          damping: 30,
          mass: 0.7,
          // Motion commits the final keyframe after calling onComplete. Clear that committed
          // identity transform on the following frame so the card truly returns to authored CSS.
          onComplete: () => {
            settleFrame = requestAnimationFrame(() => {
              settleFrame = 0
              settle()
            })
          },
        },
      )
    }

    const onFocus = () => activate(item)
    item.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    item.addEventListener('focusin', onFocus)

    cleanups.push(() => {
      item.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      item.removeEventListener('focusin', onFocus)
      if (frame) cancelAnimationFrame(frame)
      if (settleFrame) cancelAnimationFrame(settleFrame)
      settle()
    })
  }

  return () => {
    for (const cleanup of cleanups) cleanup()
    for (const item of items) item.style.zIndex = originalZ.get(item) ?? ''
  }
}
