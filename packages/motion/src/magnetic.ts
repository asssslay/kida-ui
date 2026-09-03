import { motionValue, springValue, styleEffect } from 'motion'
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
  let inside = false

  // Retarget one persistent spring instead of canceling and recreating a DOM animation
  // for every pointer frame. Recreating it continually throws away most of the spring's
  // velocity, which makes a moving pointer look as though it barely affects the target.
  const sourceX = motionValue(0)
  const sourceY = motionValue(0)
  const spring = { stiffness: 360, damping: 24, mass: 0.65 }
  const springX = springValue(sourceX, spring)
  const springY = springValue(sourceY, spring)
  const stopStyleEffect = styleEffect(target, { x: springX, y: springY })

  let xSettled = true
  let ySettled = true
  const settle = () => {
    if (inside || !xSettled || !ySettled || sourceX.get() !== 0 || sourceY.get() !== 0) return
    target.style.transform = 'none'
    target.style.willChange = 'auto'
  }
  const stopXStart = springX.on('animationStart', () => {
    xSettled = false
  })
  const stopYStart = springY.on('animationStart', () => {
    ySettled = false
  })
  const stopXComplete = springX.on('animationComplete', () => {
    xSettled = true
    settle()
  })
  const stopYComplete = springY.on('animationComplete', () => {
    ySettled = true
    settle()
  })

  const move = () => {
    frame = 0
    sourceX.set(x)
    sourceY.set(y)
  }

  const onEnter = () => {
    inside = true
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
    inside = false
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    x = 0
    y = 0
    sourceX.set(0)
    sourceY.set(0)
    settle()
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
    stopXStart()
    stopYStart()
    stopXComplete()
    stopYComplete()
    stopStyleEffect()
    springX.destroy()
    springY.destroy()
    sourceX.destroy()
    sourceY.destroy()
    target.style.transform = 'none'
    target.style.willChange = 'auto'
  }
}
