import {
  dampPosition,
  getDualWaveMosaicRows,
  itemDistance,
  nearestItemPosition,
  tileDelay,
  tileProgress,
  waveOffset,
  wrapIndex,
} from './dual-wave-math.js'
import { prefersReducedMotion, watchReducedMotion } from './reduced-motion.js'

export { getDualWaveMosaicRows } from './dual-wave-math.js'

/** `mosaic` splits the photo into tiles that cascade and part with speed; `frame` cuts to it. */
export type DualWaveLayout = 'mosaic' | 'frame'

export interface DualWaveOptions {
  /** Horizontal wave travel and how far mosaic tiles part, from 0 to 100. @default 80 */
  strength?: number
  /** Settling speed multiplier, from 0.25 to 3. @default 1 */
  response?: number
  /** Whether wheel and swipe gestures over the stage move between items. @default true */
  captureScroll?: boolean
}

export interface DualWaveSetup extends DualWaveOptions {
  /** Item shown when the controller starts. @default 0 */
  index?: number
  /** Called when the item nearest the center changes. */
  onIndexChange?: (index: number) => void
}

export interface DualWaveControls {
  /** Travels the shortest way around the loop to an item. */
  select(index: number): void
  /** Moves by whole items; negative values move backward. */
  step(delta: number): void
  /** Applies new options without restarting or moving. */
  update(options: DualWaveOptions): void
  destroy(): void
}

const DEFAULTS = { strength: 80, response: 1, captureScroll: true } as const
const NAVIGATION_KEYS = new Map([
  ['ArrowDown', 1],
  ['ArrowRight', 1],
  ['PageDown', 1],
  ['ArrowUp', -1],
  ['ArrowLeft', -1],
  ['PageUp', -1],
])

// Shared by every instance and restart: once a photo is decoded it can be shown immediately.
// Showing a loaded-but-undecoded image paints an empty frame first, which reads as a blink.
const decodedImages = new WeakSet<HTMLImageElement>()

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min

/**
 * Drives a DualWave stage: two text columns that wave past each other and a photo between them.
 * Only transforms, opacity, and background images are written per frame; layout is read on resize.
 */
export function dualWave(root: HTMLElement, setup: DualWaveSetup = {}): DualWaveControls {
  const columns = [
    root.querySelector<HTMLElement>('[data-kida-dual-wave-column="title"]'),
    root.querySelector<HTMLElement>('[data-kida-dual-wave-column="subtitle"]'),
  ]
  const [titles, subtitles] = columns.map((column) =>
    column ? [...column.querySelectorAll<HTMLElement>('[data-kida-dual-wave-item]')] : [],
  ) as [HTMLElement[], HTMLElement[]]
  const images = [...root.querySelectorAll<HTMLImageElement>('img[data-kida-dual-wave-image]')]
  const mosaicRoot = root.querySelector<HTMLElement>('[data-kida-dual-wave-mosaic]')
  const count = titles.length

  let strength: number = DEFAULTS.strength
  let response: number = DEFAULTS.response
  let captureScroll: boolean = DEFAULTS.captureScroll
  const applyOptions = (options: DualWaveOptions) => {
    if (options.strength !== undefined) strength = clamp(options.strength, 0, 100)
    if (options.response !== undefined) response = clamp(options.response, 0.25, 3)
    if (options.captureScroll !== undefined) captureScroll = options.captureScroll
  }
  applyOptions(setup)

  const mosaicColumns = Math.max(1, Number(mosaicRoot?.dataset.kidaDualWaveColumns) || 1)
  const mosaicRows = getDualWaveMosaicRows(mosaicColumns)
  const mosaic = [
    ...(mosaicRoot?.querySelectorAll<HTMLElement>('[data-kida-dual-wave-tile]') ?? []),
  ]
    .map((tile, index) => {
      const [from, to] = tile.querySelectorAll<HTMLElement>('[data-kida-dual-wave-layer]')
      const column = index % mosaicColumns
      const row = Math.floor(index / mosaicColumns)
      return {
        tile,
        from,
        to,
        delay: tileDelay(column, row, mosaicColumns, mosaicRows),
        x: column - (mosaicColumns - 1) / 2,
        y: row - (mosaicRows - 1) / 2,
      }
    })
    .filter((part): part is typeof part & { from: HTMLElement; to: HTMLElement } =>
      Boolean(part.from && part.to),
    )

  let reduced = prefersReducedMotion()
  const start = count ? wrapIndex(Math.round(setup.index ?? 0), count) : 0
  const state = { position: start, target: start }
  let announced = start
  let frame = 0
  let previousTime = 0
  let snapTimer = 0
  let visible = false
  let disposed = false
  let rowHeight = 48
  let stageHeight = 600
  let titleRange = 0
  let subtitleRange = 0
  let tileWidth = 0
  let wheelRemainder = 0
  let touchStart: { x: number; y: number } | null = null
  let lastImage = start
  let frontImage = -1
  let backImage = -1
  let shownFrom = -1
  let shownTo = -1

  // A restart (for example a layout change) must not inherit what the previous pass wrote.
  for (const image of images) image.style.removeProperty('opacity')
  for (const image of images) image.style.removeProperty('visibility')
  for (const image of images) image.style.removeProperty('z-index')

  const ready = (index: number) => {
    const image = images[index]
    return image ? decodedImages.has(image) : false
  }

  const paintImages = (position: number, nearest: number) => {
    const lower = wrapIndex(Math.floor(position), count)
    const upper = wrapIndex(Math.ceil(position), count)
    const canBlend = ready(lower) && ready(upper)
    if (canBlend || ready(nearest)) lastImage = nearest
    else if (!ready(lastImage)) {
      const fallback = images.findIndex((image) => decodedImages.has(image))
      if (fallback >= 0) lastImage = fallback
    }

    if (mosaic.length) {
      const from = canBlend ? lower : lastImage
      const to = canBlend ? upper : lastImage
      if (!ready(from) || !ready(to)) return
      const t = canBlend && !reduced ? position - Math.floor(position) : 0
      const source = (index: number) => {
        const image = images[index]
        return `url("${image?.currentSrc || image?.src || ''}")`
      }
      // Background swaps only happen when the pair changes; each frame writes opacity/transform.
      for (const part of mosaic) {
        if (from !== shownFrom) part.from.style.backgroundImage = source(from)
        if (to !== shownTo) part.to.style.backgroundImage = source(to)
      }
      shownFrom = from
      shownTo = to
      // Tiles part with velocity and settle back into one image at rest.
      const parting = reduced ? 0 : Math.min(1, Math.abs(state.target - position) / 1.5)
      const gap = tileWidth * 0.16 * (strength / 100) * parting
      for (const { tile, to: layer, delay, x, y } of mosaic) {
        const progress = tileProgress(t, delay)
        const lift = reduced ? 0 : Math.sin(progress * Math.PI)
        layer.style.opacity = String(progress)
        tile.style.transform =
          gap || lift
            ? `translate3d(${x * gap}px, ${y * gap - lift * tileWidth * 0.08}px, 0) scale(${1 - lift * 0.06})`
            : ''
      }
      return
    }

    // Frame cuts straight to the photo. The previous one stays underneath, so a late first paint
    // of the new photo reveals it rather than the empty backdrop.
    if (lastImage !== frontImage && ready(lastImage)) {
      backImage = frontImage
      frontImage = lastImage
    }
    if (frontImage < 0) return
    images.forEach((image, index) => {
      const shown = index === frontImage || index === backImage
      image.style.opacity = shown ? '1' : '0'
      image.style.visibility = shown ? 'visible' : 'hidden'
      image.style.zIndex = index === frontImage ? '1' : ''
    })
  }

  const paint = () => {
    if (!count) return
    const position = state.position
    const nearest = wrapIndex(Math.round(position), count)
    if (announced !== nearest) {
      announced = nearest
      setup.onIndexChange?.(nearest)
    }

    for (let index = 0; index < count; index++) {
      const distance = itemDistance(index, position, count)
      const y = distance * rowHeight
      const inView = Math.abs(y) < stageHeight / 2 + rowHeight
      const opacity = 0.38 + 0.62 * Math.max(0, 1 - Math.abs(distance)) ** 2
      const x = reduced ? 0 : waveOffset(distance, position, 1)
      for (const [row, range, direction] of [
        [titles[index], titleRange, 1],
        [subtitles[index], subtitleRange, -1],
      ] as const) {
        if (!row) continue
        row.style.visibility = inView ? 'visible' : 'hidden'
        row.style.transform = `translate3d(${x * range * direction}px, ${y}px, 0)`
        row.style.opacity = String(opacity)
      }
    }
    paintImages(position, nearest)
  }

  const canRun = () => visible && !document.hidden
  const settle = () => {
    root.dataset.state = 'settled'
    previousTime = 0
  }
  const tick = (time: number) => {
    frame = 0
    if (!canRun()) return
    const elapsed = previousTime ? Math.max(0, time - previousTime) : 16.67
    previousTime = time
    state.position = dampPosition(state.position, state.target, elapsed, response)
    const settled = Math.abs(state.target - state.position) < 0.001
    if (settled) state.position = state.target
    paint()
    if (settled) settle()
    else frame = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (disposed || frame || !canRun()) return
    if (reduced) {
      state.position = state.target
      paint()
      settle()
      return
    }
    root.dataset.state = 'moving'
    previousTime = 0
    frame = requestAnimationFrame(tick)
  }
  const step = (delta: number) => {
    if (!count) return
    window.clearTimeout(snapTimer)
    state.target = Math.round(state.target) + Math.round(delta)
    wake()
  }
  const select = (index: number) => {
    if (!count || !Number.isFinite(index)) return
    window.clearTimeout(snapTimer)
    state.target = nearestItemPosition(wrapIndex(Math.round(index), count), state.target, count)
    wake()
  }
  const snap = () => {
    snapTimer = 0
    state.target = Math.round(state.target)
    wake()
  }

  const prime = (image: HTMLImageElement) => {
    if (!image.complete || !image.naturalWidth || decodedImages.has(image)) return
    image
      .decode()
      .then(() => {
        decodedImages.add(image)
        if (disposed) return
        if (frame) return
        // Not animating: paint the newly available photo directly.
        paint()
      })
      .catch(() => {})
  }
  const primeLoaded = (event: Event) => prime(event.currentTarget as HTMLImageElement)

  const measure = () => {
    const titleColumn = columns[0]
    const subtitleColumn = columns[1]
    if (!titleColumn || !subtitleColumn) return
    stageHeight = titleColumn.clientHeight
    rowHeight = Math.max(titles[0]?.offsetHeight || 48, stageHeight / Math.max(2, count - 1))
    const widest = (rows: HTMLElement[]) => Math.max(0, ...rows.map((row) => row.offsetWidth))
    titleRange = Math.max(0, titleColumn.clientWidth - widest(titles)) * (strength / 100)
    subtitleRange = Math.max(0, subtitleColumn.clientWidth - widest(subtitles)) * (strength / 100)
    tileWidth = (mosaicRoot?.clientWidth ?? 0) / mosaicColumns
    paint()
  }

  const onWheel = (event: WheelEvent) => {
    // Leave zoom and Shift-scroll to the browser so the page can still scroll past the stage.
    if (!captureScroll || count < 2 || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return
    event.preventDefault()
    const delta =
      event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageHeight : 1)
    if (reduced) {
      wheelRemainder += delta
      if (Math.abs(wheelRemainder) >= 60) {
        step(Math.sign(wheelRemainder))
        wheelRemainder = 0
      }
      return
    }
    state.target += Math.max(-1.5, Math.min(1.5, delta / 160))
    state.target = Math.max(state.position - 4, Math.min(state.position + 4, state.target))
    wake()
    window.clearTimeout(snapTimer)
    snapTimer = window.setTimeout(snap, 140)
  }
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchStart =
      captureScroll && event.touches.length === 1 && touch
        ? { x: touch.clientX, y: touch.clientY }
        : null
  }
  const onTouchMove = (event: TouchEvent) => {
    if (touchStart && event.touches.length === 1) event.preventDefault()
  }
  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (!touchStart || !touch) return
    const x = touchStart.x - touch.clientX
    const y = touchStart.y - touch.clientY
    const delta = Math.abs(x) > Math.abs(y) ? x : y
    if (Math.abs(delta) > 28) step(Math.sign(delta))
    touchStart = null
  }
  const onTouchCancel = () => {
    touchStart = null
  }
  const onClick = (event: MouseEvent) => {
    const item = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-kida-dual-wave-item]',
    )
    if (!item || !root.contains(item)) return
    const index = titles.indexOf(item)
    select(index >= 0 ? index : subtitles.indexOf(item))
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target as Element | null
    if (target?.closest('input, select, textarea, [contenteditable="true"]')) return
    const delta = NAVIGATION_KEYS.get(event.key)
    if (delta !== undefined) {
      event.preventDefault()
      step(delta)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      select(event.key === 'Home' ? 0 : count - 1)
    }
  }
  const syncVisibility = () => {
    if (canRun()) wake()
    else {
      cancelAnimationFrame(frame)
      frame = 0
      settle()
    }
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
    syncVisibility()
  })
  const resize = new ResizeObserver(measure)
  const unwatchReducedMotion = watchReducedMotion((next) => {
    reduced = next
    state.position = state.target = Math.round(state.target)
    measure()
  })
  resize.observe(root)
  intersection.observe(root)
  document.fonts?.addEventListener('loadingdone', measure)
  document.addEventListener('visibilitychange', syncVisibility)
  root.addEventListener('wheel', onWheel, { passive: false })
  root.addEventListener('touchstart', onTouchStart, { passive: true })
  root.addEventListener('touchmove', onTouchMove, { passive: false })
  root.addEventListener('touchend', onTouchEnd, { passive: true })
  root.addEventListener('touchcancel', onTouchCancel, { passive: true })
  root.addEventListener('click', onClick)
  root.addEventListener('keydown', onKeyDown)
  for (const image of images) {
    image.addEventListener('load', primeLoaded)
    prime(image)
  }
  root.dataset.state = 'settled'
  measure()

  return {
    select,
    step,
    update(options) {
      applyOptions(options)
      measure()
    },
    destroy() {
      disposed = true
      cancelAnimationFrame(frame)
      window.clearTimeout(snapTimer)
      intersection.disconnect()
      resize.disconnect()
      unwatchReducedMotion()
      document.fonts?.removeEventListener('loadingdone', measure)
      document.removeEventListener('visibilitychange', syncVisibility)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onTouchCancel)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKeyDown)
      for (const image of images) image.removeEventListener('load', primeLoaded)
      delete root.dataset.state
    },
  }
}
