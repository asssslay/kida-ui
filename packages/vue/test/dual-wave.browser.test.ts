import '@kida-ui/styles/kida.css'
import { DualWave, type DualWaveItem, type DualWaveProps, type KidaElement } from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import { node } from './fixtures.js'

const COLORS = ['rgb(233,79,134)', 'rgb(167,139,250)', 'rgb(117,201,166)', 'rgb(244,207,99)']
const photo = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40"><rect width="30" height="40" fill="${fill}"/></svg>`,
  )}`

const ITEMS: DualWaveItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: `item-${index}`,
  title: `Project ${index + 1}`,
  subtitle: `Studio ${index + 1}`,
  src: photo(COLORS[index % COLORS.length] ?? 'black'),
  alt: `Photo ${index + 1}`,
}))

// Typed initial props; later rerenders may add any option or native attribute.
const props = (value: DualWaveProps & Record<string, unknown>) => value
const root = () => node('[data-kida-dual-wave]')
const column = (name: string) => [
  ...root().querySelectorAll<HTMLButtonElement>(
    `[data-kida-dual-wave-column="${name}"] [data-kida-dual-wave-item]`,
  ),
]
const titles = () => column('title')
const subtitles = () => column('subtitle')
const tiles = () => [...root().querySelectorAll<HTMLElement>('[data-kida-dual-wave-tile]')]
const images = () => [...root().querySelectorAll<HTMLImageElement>('[data-kida-dual-wave-image]')]
const currentIndex = () => titles().findIndex((title) => title.getAttribute('aria-current'))

async function settled() {
  await expect.poll(() => root().dataset.state).toBe('settled')
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('renders an accessible carousel and forwards native attributes, styles, events, and refs', async () => {
  const exposed = ref<KidaElement | null>(null)
  const focus = vi.fn()
  await render(
    defineComponent({
      setup: () => () =>
        h(DualWave, {
          ref: exposed,
          items: ITEMS.map((item) => ({ ...item, imageProps: { loading: 'lazy' as const } })),
          headings: ['Work', 'Credits'],
          defaultIndex: 2,
          class: 'custom-wave',
          'data-testid': 'wave',
          onFocus: focus,
          style: { '--kida-dual-wave-surface': 'rgb(33, 28, 36)' },
        }),
    }),
  )
  const element = root()
  expect(exposed.value?.element).toBe(element)
  expect(element.tagName).toBe('SECTION')
  expect(element.className).toBe('custom-wave')
  expect(element.dataset.testid).toBe('wave')
  expect(element.dataset.layout).toBe('mosaic')
  expect(getComputedStyle(element).backgroundColor).toBe('rgb(33, 28, 36)')
  expect(element.getAttribute('aria-roledescription')).toBe('carousel')
  expect(element.getAttribute('aria-label')).toBe('Work')
  expect(element.tabIndex).toBe(0)
  const help = document.getElementById(element.getAttribute('aria-describedby') ?? '')
  expect(help?.textContent).toBe('Scroll, swipe, or use arrow keys')
  expect(titles()).toHaveLength(8)
  expect(subtitles()[2]?.getAttribute('aria-current')).toBe('true')
  expect(currentIndex()).toBe(2)
  expect(titles()[2]?.tabIndex).toBe(0)
  expect(titles()[3]?.tabIndex).toBe(-1)
  expect(subtitles().every((subtitle) => subtitle.tabIndex === -1)).toBe(true)
  expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Photo 3')
  expect(images().every((image) => image.alt === '' && !image.draggable)).toBe(true)
  expect(images()[0]?.getAttribute('loading')).toBe('lazy')
  expect(images()[0]?.getAttribute('decoding')).toBe('async')
  expect(tiles()).toHaveLength(12)
  element.focus()
  expect(focus).toHaveBeenCalledOnce()
  const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } })
  expect(result.violations).toEqual([])
})

test('moves with the keyboard, clicks, and v-model:index, emitting each new item', async () => {
  const index = ref<number | undefined>(undefined)
  const changes: number[] = []
  await render(
    defineComponent({
      setup: () => () =>
        h(DualWave, {
          items: ITEMS,
          index: index.value,
          'onUpdate:index': (next: number) => {
            index.value = next
          },
          onIndexChange: (next: number) => changes.push(next),
        }),
    }),
  )
  await settled()
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(1)
  await expect.poll(() => index.value).toBe(1)
  await userEvent.keyboard('{End}')
  await expect.poll(currentIndex).toBe(7)
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(0)
  subtitles()[5]?.click()
  await expect.poll(currentIndex).toBe(5)
  await settled()
  expect(index.value).toBe(5)

  index.value = 3
  await expect.poll(currentIndex).toBe(3)
  await settled()
  expect(changes.at(-1)).toBe(3)
  // Every emitted index is a real item, and the loop goes 7 → 0 instead of backtracking.
  expect(changes.every((value) => value >= 0 && value < ITEMS.length)).toBe(true)
  expect(changes).toContain(0)
  const live = root().querySelector('[aria-live="polite"]')
  expect(live?.textContent).toBe('Item 4 of 8: Project 4, Studio 4.')
})

test('option changes update in place without restarting the controller', async () => {
  const observe = vi.spyOn(IntersectionObserver.prototype, 'observe')
  const view = await render(DualWave, { props: props({ items: ITEMS, strength: 80 }) })
  await settled()
  const before = observe.mock.calls.length
  await view.rerender({ strength: 10, response: 2, captureScroll: false, class: 'updated' })
  expect(observe.mock.calls.length).toBe(before)
  // With scroll capture off, wheel events reach the page.
  const wheel = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(false)
  expect(currentIndex()).toBe(0)
})

test('wheel input moves between items and snaps to a whole item', async () => {
  await render(DualWave, { props: { items: ITEMS } })
  await settled()
  const wheel = new WheelEvent('wheel', { deltaY: 160, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(true)
  await expect.poll(currentIndex).toBe(1)
  await settled()
  const offsets = titles().map((title) => new DOMMatrix(getComputedStyle(title).transform).m42)
  expect(Math.abs(offsets[1] ?? 1)).toBeLessThan(0.5)
})

test('layout, grid, and item changes restart from the item on screen', async () => {
  const observe = vi.spyOn(IntersectionObserver.prototype, 'observe')
  const view = await render(DualWave, { props: props({ items: ITEMS, defaultIndex: 6 }) })
  await settled()
  let restarts = observe.mock.calls.length
  await view.rerender({ layout: 'frame' })
  expect(root().dataset.layout).toBe('frame')
  expect(tiles()).toHaveLength(0)
  expect(observe.mock.calls.length).toBeGreaterThan(restarts)
  expect(currentIndex()).toBe(6)
  restarts = observe.mock.calls.length
  await view.rerender({ layout: 'mosaic', columns: 4 })
  expect(observe.mock.calls.length).toBeGreaterThan(restarts)
  expect(tiles()).toHaveLength(20)
  expect(
    root()
      .querySelector('[data-kida-dual-wave-mosaic]')
      ?.getAttribute('data-kida-dual-wave-columns'),
  ).toBe('4')
  expect(currentIndex()).toBe(6)
  // A shorter list keeps the selection on its last item; the controller follows it.
  await view.rerender({ items: ITEMS.slice(0, 3) })
  expect(currentIndex()).toBe(2)
  root().focus()
  await userEvent.keyboard('{ArrowUp}')
  await expect.poll(currentIndex).toBe(1)
})

test('reduced motion keeps navigation and removes wave travel and tile motion', async () => {
  await commands.setReducedMotion(true)
  await render(DualWave, { props: { items: ITEMS } })
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  await expect.poll(currentIndex).toBe(1)
  expect(root().dataset.state).toBe('settled')
  for (const title of titles()) {
    expect(new DOMMatrix(getComputedStyle(title).transform).m41).toBe(0)
  }
  expect(tiles().every((tile) => tile.style.transform === '')).toBe(true)
})

test('handles empty and single item lists', async () => {
  const view = await render(DualWave, { props: props({ items: [] }) })
  expect(titles()).toHaveLength(0)
  expect(root().querySelector('[role="img"]')).toBe(null)
  await view.rerender({ items: ITEMS.slice(0, 1) })
  await settled()
  expect(currentIndex()).toBe(0)
  const wheel = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true })
  root().dispatchEvent(wheel)
  expect(wheel.defaultPrevented).toBe(false)
})

test('unmount releases observers, listeners, and frames', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const disconnectIntersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(DualWave, { props: { items: ITEMS } })
  root().focus()
  await userEvent.keyboard('{ArrowDown}')
  const frame = vi.spyOn(window, 'requestAnimationFrame')
  view.unmount()
  const scheduled = frame.mock.calls.length
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(frame.mock.calls.length).toBe(scheduled)
  expect(disconnectResize).toHaveBeenCalled()
  expect(disconnectIntersection).toHaveBeenCalled()
})
