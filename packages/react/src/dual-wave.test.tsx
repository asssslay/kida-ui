import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { act, type CSSProperties, createRef, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { DualWave, type DualWaveItem } from './dual-wave.js'

const COLORS = ['rgb(233,79,134)', 'rgb(167,139,250)', 'rgb(117,201,166)', 'rgb(244,207,99)']

function photo(fill: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40"><rect width="30" height="40" fill="${fill}"/></svg>`,
  )}`
}

const ITEMS: DualWaveItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: `item-${index}`,
  title: `Project ${index + 1}`,
  subtitle: `Studio ${index + 1}`,
  src: photo(COLORS[index % COLORS.length] ?? 'black'),
  alt: `Photo ${index + 1}`,
}))

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-dual-wave]')
  if (!element) throw new Error('DualWave is not mounted')
  return element
}

const titles = () => [
  ...root().querySelectorAll<HTMLButtonElement>(
    '[data-kida-dual-wave-column="title"] [data-kida-dual-wave-item]',
  ),
]
const subtitles = () => [
  ...root().querySelectorAll<HTMLButtonElement>(
    '[data-kida-dual-wave-column="subtitle"] [data-kida-dual-wave-item]',
  ),
]
const tiles = () => [...root().querySelectorAll<HTMLElement>('[data-kida-dual-wave-tile]')]
const images = () => [...root().querySelectorAll<HTMLImageElement>('[data-kida-dual-wave-image]')]
const currentIndex = () => titles().findIndex((title) => title.getAttribute('aria-current'))

async function settled() {
  await expect.poll(() => root().dataset.state).toBe('settled')
}

/** Waits until every photo has been decoded, so swaps are visible immediately. */
async function decoded() {
  await expect
    .poll(() => images().every((image) => image.complete && image.naturalWidth > 0))
    .toBe(true)
  await Promise.all(images().map((image) => image.decode()))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  await page.viewport(1280, 720)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('renders an accessible carousel and forwards native attributes, styles, events, and refs', async () => {
  const ref = createRef<HTMLElement>()
  const focus = vi.fn()
  await render(
    <DualWave
      ref={ref}
      items={ITEMS}
      headings={['Work', 'Credits']}
      defaultIndex={2}
      className="custom-wave"
      data-testid="wave"
      onFocus={focus}
      style={{ '--kida-dual-wave-surface': 'rgb(33, 28, 36)' } as CSSProperties}
    />,
  )

  const element = root()
  expect(ref.current).toBe(element)
  expect(element.tagName).toBe('SECTION')
  expect(element.className).toBe('custom-wave')
  expect(element.dataset.testid).toBe('wave')
  expect(getComputedStyle(element).backgroundColor).toBe('rgb(33, 28, 36)')
  expect(element.getAttribute('aria-roledescription')).toBe('carousel')
  expect(element.getAttribute('aria-label')).toBe('Work')
  expect(titles()).toHaveLength(8)
  expect(subtitles()[2]?.getAttribute('aria-current')).toBe('true')
  expect(currentIndex()).toBe(2)
  expect(titles()[2]?.tabIndex).toBe(0)
  expect(titles()[3]?.tabIndex).toBe(-1)
  expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Photo 3')
  expect(images().every((image) => image.alt === '' && image.draggable === false)).toBe(true)
  element.focus()
  expect(focus).toHaveBeenCalledOnce()

  const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } })
  expect(result.violations).toEqual([])
})

test('moves with the keyboard, clicks, and a changed index, reporting each new item', async () => {
  const onIndexChange = vi.fn()
  const screen = await render(<DualWave items={ITEMS} onIndexChange={onIndexChange} />)
  await settled()

  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(1)
  await userEvent.keyboard('{End}')
  await expect.poll(currentIndex).toBe(7)
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(0)

  subtitles()[5]?.click()
  await expect.poll(currentIndex).toBe(5)

  await screen.rerender(<DualWave items={ITEMS} index={3} onIndexChange={onIndexChange} />)
  await expect.poll(currentIndex).toBe(3)
  await settled()
  expect(onIndexChange).toHaveBeenLastCalledWith(3)
  // Every reported index is a real item, and the loop goes 7 → 0 instead of backtracking.
  const reported = onIndexChange.mock.calls.map(([index]) => index as number)
  expect(reported.every((index) => index >= 0 && index < ITEMS.length)).toBe(true)
  expect(reported).toContain(0)
})

test('mosaic tiles cascade and part while moving, then settle into one seamless photo', async () => {
  await render(<DualWave items={ITEMS} columns={4} />)
  await decoded()
  expect(tiles()).toHaveLength(4 * 5)
  expect(root().dataset.layout).toBe('mosaic')

  const transforms: string[] = []
  const record = () => {
    transforms.push(...tiles().map((tile) => tile.style.transform))
    if (root().dataset.state === 'moving') requestAnimationFrame(record)
  }
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  requestAnimationFrame(record)
  await settled()

  expect(transforms.some((transform) => transform.includes('translate3d'))).toBe(true)
  expect(tiles().every((tile) => tile.style.transform === '')).toBe(true)
  // At rest, every tile shows the same photo: the new item's.
  const source = images()[1]?.src ?? 'missing'
  for (const tile of tiles()) {
    const [from, to] = tile.querySelectorAll<HTMLElement>('[data-kida-dual-wave-layer]')
    const shown = to?.style.opacity === '1' ? to : from
    expect(shown?.style.backgroundImage).toContain(source)
  }
})

test('switching layouts keeps the current photo on screen from the first frame', async () => {
  const screen = await render(<DualWave items={ITEMS} defaultIndex={4} />)
  await decoded()
  const source = images()[4]?.src ?? ''

  await screen.rerender(<DualWave items={ITEMS} defaultIndex={4} layout="frame" />)
  // Checked synchronously after the commit: the layout effect has already painted the frame.
  expect(tiles()).toHaveLength(0)
  const front = images().filter((image) => image.style.zIndex === '1')
  expect(front.map((image) => image.src)).toEqual([source])
  expect(front[0]?.style.opacity).toBe('1')

  await screen.rerender(<DualWave items={ITEMS} defaultIndex={4} layout="mosaic" />)
  expect(tiles().length).toBeGreaterThan(0)
  expect(
    getComputedStyle(root().querySelector('[data-kida-dual-wave-images]') as Element).opacity,
  ).toBe('0')
  for (const tile of tiles()) {
    const from = tile.querySelector<HTMLElement>('[data-kida-dual-wave-layer]')
    expect(from?.style.backgroundImage).toContain(source.slice(0, 40))
  }
})

test('frame swaps photos instantly and never shows a partially faded photo', async () => {
  await render(<DualWave items={ITEMS} layout="frame" />)
  await decoded()
  const samples: string[] = []
  const record = () => {
    const shown = images().filter((image) => image.style.zIndex === '1')
    samples.push(shown.map((image) => image.style.opacity).join(','))
    if (root().dataset.state === 'moving') requestAnimationFrame(record)
  }
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  requestAnimationFrame(record)
  await settled()
  expect(samples.length).toBeGreaterThan(0)
  expect(samples.every((sample) => sample === '1')).toBe(true)
  expect(
    images().filter((image) => image.style.visibility === 'visible').length,
  ).toBeLessThanOrEqual(2)
})

test('option changes update in place without restarting the controller', async () => {
  const observe = vi.spyOn(IntersectionObserver.prototype, 'observe')
  const screen = await render(<DualWave items={ITEMS} strength={80} />)
  await settled()
  const before = observe.mock.calls.length

  await screen.rerender(<DualWave items={ITEMS} strength={10} response={2} captureScroll={false} />)
  expect(observe.mock.calls.length).toBe(before)

  // With scroll capture off, wheel events reach the page.
  const wheel = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(false)
  expect(currentIndex()).toBe(0)
})

test('wheel input moves between items and snaps to a whole item', async () => {
  await render(<DualWave items={ITEMS} />)
  await settled()
  const wheel = new WheelEvent('wheel', { deltaY: 160, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(true)
  await expect.poll(currentIndex).toBe(1)
  await settled()
  const offsets = titles().map((title) => new DOMMatrix(getComputedStyle(title).transform).m42)
  expect(Math.abs(offsets[1] ?? 1)).toBeLessThan(0.5)
})

test('reduced motion keeps navigation and removes wave travel and tile motion', async () => {
  await commands.setReducedMotion(true)
  await render(<DualWave items={ITEMS} />)
  await decoded()
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(1)
  expect(root().dataset.state).toBe('settled')
  for (const title of titles()) {
    expect(new DOMMatrix(getComputedStyle(title).transform).m41).toBe(0)
  }
  expect(tiles().every((tile) => tile.style.transform === '')).toBe(true)
})

test('handles empty, single, and long item lists', async () => {
  const screen = await render(<DualWave items={[]} />)
  expect(titles()).toHaveLength(0)

  await screen.rerender(<DualWave items={ITEMS.slice(0, 1)} />)
  await settled()
  expect(currentIndex()).toBe(0)
  const wheel = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(false)

  const long = Array.from({ length: 60 }, (_, index) => ({
    ...(ITEMS[index % ITEMS.length] as DualWaveItem),
    id: `long-${index}`,
    title: `A deliberately long project title number ${index + 1}`,
  }))
  await screen.rerender(<DualWave items={long} defaultIndex={59} />)
  await settled()
  const bounds = root().getBoundingClientRect()
  const visible = titles().filter((title) => getComputedStyle(title).visibility === 'visible')
  expect(visible.length).toBeLessThan(long.length)
  for (const title of visible) {
    const rect = title.getBoundingClientRect()
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 0.5)
    expect(rect.right).toBeLessThanOrEqual(bounds.right + 0.5)
  }
})

test('releases observers, listeners, and frames in Strict Mode and on unmount', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const disconnectIntersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const screen = await render(
    <StrictMode>
      <DualWave items={ITEMS} />
    </StrictMode>,
  )
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  const frame = vi.spyOn(window, 'requestAnimationFrame')
  await screen.unmount()
  const scheduled = frame.mock.calls.length
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(frame.mock.calls.length).toBe(scheduled)
  expect(disconnectResize.mock.calls.length).toBeGreaterThanOrEqual(2)
  expect(disconnectIntersection.mock.calls.length).toBeGreaterThanOrEqual(2)
})

test.each([false, true])(
  'SSR is deterministic and hydrates without errors (reduce: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const element = <DualWave items={ITEMS} defaultIndex={1} />
    const html = renderToString(element)
    expect(renderToString(element)).toBe(html)
    expect(html).not.toContain('undefined')
    expect(html).toContain('Project 2')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const errors: unknown[] = []
    let hydrated: ReturnType<typeof hydrateRoot> | undefined
    const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const previousEnvironment = environment.IS_REACT_ACT_ENVIRONMENT
    environment.IS_REACT_ACT_ENVIRONMENT = true
    try {
      // Before hydration the current title and photo are already visible.
      const current = container.querySelector('[data-kida-dual-wave-item][aria-current="true"]')
      expect(current && getComputedStyle(current).opacity).toBe('1')
      await act(async () => {
        hydrated = hydrateRoot(container, element, {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      })
      expect(errors).toEqual([])
      expect(currentIndex()).toBe(1)
    } finally {
      await act(async () => hydrated?.unmount())
      environment.IS_REACT_ACT_ENVIRONMENT = previousEnvironment
      container.remove()
    }
  },
)

test.each([
  [390, 760],
  [1280, 720],
])('keeps every part inside the stage at %s px', async (width, height) => {
  await page.viewport(width, height)
  await render(
    <div style={{ padding: 16 }}>
      <DualWave items={ITEMS} />
    </div>,
  )
  await settled()
  const bounds = root().getBoundingClientRect()
  const media = root().querySelector('[data-kida-dual-wave-media]')?.getBoundingClientRect()
  const headings = root().querySelector('[data-kida-dual-wave-headings]')?.getBoundingClientRect()
  for (const rect of [media, headings]) {
    expect(rect).toBeDefined()
    if (!rect) continue
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left)
    expect(rect.right).toBeLessThanOrEqual(bounds.right)
    expect(rect.top).toBeGreaterThanOrEqual(bounds.top)
    expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom)
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth,
  )
})
