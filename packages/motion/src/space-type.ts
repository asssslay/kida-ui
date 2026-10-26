import { prefersReducedMotion, watchReducedMotion } from './reduced-motion.js'

export { getSpaceTypeGeometry, type SpaceTypeGeometry } from './space-type-geometry.js'

export interface SpaceTypeOptions {
  /** Rotation rate; zero freezes the current angle. @default 1 */
  speed?: number
  /** Pause without resetting the current angle. @default false */
  paused?: boolean
}

export interface SpaceTypeControls {
  setPlayback(options: SpaceTypeOptions): void
  destroy(): void
}

/** Shared loop lifecycle; adapters only render the geometry and update playback options. */
export function spaceType(root: HTMLElement, options: SpaceTypeOptions = {}): SpaceTypeControls {
  const ring = root.querySelector<HTMLElement>('[data-kida-space-type-ring]')
  let animation: Animation | undefined
  let visible = false
  let destroyed = false
  let speed = 1
  let paused = false

  const sync = () => {
    if (destroyed || !ring) return
    if (prefersReducedMotion()) {
      animation?.cancel()
      animation = undefined
      root.dataset.state = 'reduced'
      return
    }
    if (!animation) {
      animation = ring.animate(
        [
          { transform: 'rotateY(-90deg)', '--kida-space-type-phase': '0' },
          { transform: 'rotateY(270deg)', '--kida-space-type-phase': '1' },
        ],
        { duration: 24000, iterations: Number.POSITIVE_INFINITY, easing: 'linear' },
      )
      animation.pause()
    }
    if (animation.playbackRate !== speed) animation.updatePlaybackRate(speed)
    if (paused || speed === 0 || !visible || document.hidden) {
      animation.pause()
      root.dataset.state = 'paused'
    } else {
      animation.play()
      root.dataset.state = 'active'
    }
  }

  const setPlayback = (next: SpaceTypeOptions) => {
    speed = Number.isFinite(next.speed) ? Math.max(0, Math.min(3, next.speed ?? 1)) : 1
    paused = next.paused ?? false
    sync()
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    sync()
  })
  observer.observe(root)
  document.addEventListener('visibilitychange', sync)
  const unwatch = watchReducedMotion(sync)
  setPlayback(options)

  return {
    setPlayback,
    destroy() {
      destroyed = true
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      unwatch()
      animation?.cancel()
      animation = undefined
      root.dataset.state = 'idle'
    },
  }
}
