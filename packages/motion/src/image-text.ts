import { prefersReducedMotion, watchReducedMotion } from './reduced-motion.js'

export interface ImageTextOptions {
  /** A photo or texture supplied by the application. */
  image: string
  /** Center crop, in percentages. @default [50, 50] */
  position?: readonly [number, number]
  /** Milliseconds per complete crop cycle; zero is static. @default 9600 */
  duration?: number
  /** Image overscan, clamped to 1–4. @default 1.28 */
  zoom?: number
  /** Freeze the current frame without restarting the cycle. @default false */
  paused?: boolean
}

export interface ImageTextControls {
  setPaused(paused: boolean): void
  destroy(): void
}

const finite = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) ? value : fallback
const percent = (value: number) => Math.min(100, Math.max(0, value))

/** Deterministic styles for SSR and the shared background-position keyframes. */
export function imageTextStyle({
  image,
  position,
  duration,
}: ImageTextOptions): Record<string, string> {
  const x = percent(finite(position?.[0], 50))
  const y = percent(finite(position?.[1], 50))
  const crop = (dx: number, dy: number) => `${percent(x + dx)}% ${percent(y + dy)}%`
  return {
    '--kida-image-text-image': image.trim() ? `url(${JSON.stringify(image)})` : 'none',
    '--kida-image-text-position': crop(0, 0),
    '--kida-image-text-crop-one': crop(30, -16),
    '--kida-image-text-crop-two': crop(-26, 18),
    '--kida-image-text-crop-three': crop(18, -8),
    ...(duration === undefined
      ? {}
      : { '--kida-image-text-duration': `${Math.max(0, finite(duration, 9600))}ms` }),
  }
}

/** A decoded photograph moves beneath one unsplit text element. No per-frame JS work. */
export function imageText(root: HTMLElement, options: ImageTextOptions): ImageTextControls {
  let disposed = false
  let decoded = false
  let visible = false
  let paused = options.paused ?? false
  let reduced = prefersReducedMotion()
  const duration = Math.max(0, finite(options.duration, 9600))
  const zoom = Math.min(4, Math.max(1, finite(options.zoom, 1.28)))
  const photo = new Image()

  root.dataset.image = 'loading'
  root.dataset.state = 'pending'
  root.dataset.suspended = 'true'
  root.dataset.paused = String(paused)

  const measure = () => {
    if (disposed || !decoded) return
    // Decode, font reflow and resize are the only geometry reads; animation just repaints.
    const scale =
      Math.max(root.clientWidth / photo.naturalWidth, root.clientHeight / photo.naturalHeight) *
      zoom
    root.style.setProperty(
      '--kida-image-text-size',
      `${Math.ceil(photo.naturalWidth * scale)}px ${Math.ceil(photo.naturalHeight * scale)}px`,
    )
  }
  const update = () => {
    if (disposed || !decoded) return
    if (reduced || duration === 0 || !root.textContent?.trim()) {
      root.dataset.state = 'settled'
    } else if (visible && !document.hidden && !paused) {
      root.dataset.state = 'moving'
    }
    root.dataset.suspended = String(
      root.dataset.state !== 'moving' || paused || !visible || document.hidden,
    )
  }
  const fail = () => {
    if (disposed) return
    root.dataset.image = 'error'
    root.dataset.state = 'fallback'
  }
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    update()
  })
  const resize = new ResizeObserver(measure)
  const unwatch = watchReducedMotion((value) => {
    reduced = value
    update()
  })

  photo.onload = async () => {
    try {
      await photo.decode()
      if (disposed) return
      decoded = true
      measure()
      root.dataset.image = 'ready'
      update()
    } catch {
      fail()
    }
  }
  photo.onerror = fail
  intersection.observe(root)
  resize.observe(root)
  document.addEventListener('visibilitychange', update)
  if (options.image.trim()) photo.src = options.image
  else fail()

  return {
    setPaused(value) {
      if (disposed) return
      paused = value
      root.dataset.paused = String(value)
      update()
    },
    destroy() {
      disposed = true
      photo.onload = null
      photo.onerror = null
      photo.removeAttribute('src')
      intersection.disconnect()
      resize.disconnect()
      unwatch()
      document.removeEventListener('visibilitychange', update)
      root.dataset.state = 'pending'
      root.dataset.image = 'loading'
      root.dataset.suspended = 'true'
      root.style.removeProperty('--kida-image-text-size')
    },
  }
}
