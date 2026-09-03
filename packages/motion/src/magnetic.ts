import { animate } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

export interface MagneticOptions {
  /** Portion of pointer distance followed by the target. @default 0.22 */
  strength?: number
  /** Maximum travel in CSS pixels. @default 18 */
  maxDistance?: number
}

const DEFAULTS = { strength: 0.22, maxDistance: 18 } as const

export function magnetic(
  root: HTMLElement,
  target: HTMLElement,
  options: MagneticOptions = {},
): () => void {
  if (prefersReducedMotion()) return () => {}

  const { strength = DEFAULTS.strength, maxDistance = DEFAULTS.maxDistance } = options
  let bounds = root.getBoundingClientRect()
  let frame = 0
  let x = 0
  let y = 0
  let controls: ReturnType<typeof animate> | undefined

  const move = () => {
    frame = 0
    controls?.cancel()
    controls = animate(
      target,
      { x, y },
      { type: 'spring', stiffness: 360, damping: 24, mass: 0.65 },
    )
  }

  const onEnter = () => {
    bounds = root.getBoundingClientRect()
    target.style.willChange = 'transform'
  }
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    x = Math.max(-maxDistance, Math.min(maxDistance, (event.clientX - centerX) * strength))
    y = Math.max(-maxDistance, Math.min(maxDistance, (event.clientY - centerY) * strength))
    if (!frame) frame = requestAnimationFrame(move)
  }
  const onLeave = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    controls?.cancel()
    controls = animate(
      target,
      { x: 0, y: 0 },
      {
        type: 'spring',
        stiffness: 420,
        damping: 26,
        mass: 0.65,
        onComplete: () => {
          target.style.transform = 'none'
          target.style.willChange = 'auto'
        },
      },
    )
  }

  root.addEventListener('pointerenter', onEnter)
  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerleave', onLeave)
  const observer = new ResizeObserver(() => {
    bounds = root.getBoundingClientRect()
  })
  observer.observe(root)

  return () => {
    root.removeEventListener('pointerenter', onEnter)
    root.removeEventListener('pointermove', onMove)
    root.removeEventListener('pointerleave', onLeave)
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    controls?.cancel()
    target.style.transform = 'none'
    target.style.willChange = 'auto'
  }
}
