import '@kida-ui/styles/kida.css'
import { PhotoPile, type PhotoPilePhoto } from '@kida-ui/svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import PhotoPileFrame from './fixtures/PhotoPileFrame.svelte'
import PhotoPileHost from './fixtures/PhotoPileHost.svelte'
import { node, photos, pointer } from './fixtures.js'

const root = () => node<HTMLFieldSetElement>('[data-kida-photo-pile]')
const item = () => node<HTMLButtonElement>('[data-kida-photo-item]')
const card = () => node('[data-kida-photo-card]')

function drag(pointerType = 'mouse') {
  pointer(item(), 'pointerdown', { clientX: 40, clientY: 30, pointerType })
  pointer(window, 'pointermove', { clientX: 78, clientY: 52, pointerType })
}

afterEach(async () => {
  pointer(window, 'pointercancel')
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('renders a labeled group and forwards image attributes and DOM refs', async () => {
  const sink: { current: HTMLFieldSetElement | null } = { current: null }
  const onclick = vi.fn()
  await render(PhotoPileHost, {
    sink,
    photos: photos.map((photo) => ({
      ...photo,
      imageProps: {
        loading: 'lazy',
        width: 80,
        class: 'photo',
        src: 'invalid',
        alt: 'invalid',
        draggable: true,
      } as PhotoPilePhoto['imageProps'],
    })),
    'aria-label': 'Travel snapshots',
    onclick,
  })
  expect(sink.current).toBe(root())
  expect(root().getAttribute('aria-label')).toBe('Travel snapshots')
  expect(item().getAttribute('aria-label')).toBe('Bring Pink flower to front and drag')
  const image = root().querySelector('img')
  expect(image?.getAttribute('alt')).toBe('Pink flower')
  expect(image?.getAttribute('draggable')).toBe('false')
  expect(image?.getAttribute('loading')).toBe('lazy')
  expect(image?.className).toBe('photo')
  item().click()
  expect(onclick).toHaveBeenCalledOnce()
})

test.each([
  { width: 480, height: 320 },
  { width: 320, height: 240 },
])(
  'centers cards inside a positioned percentage-height preview at $width px',
  async ({ width, height }) => {
    await render(PhotoPileFrame, { photos, width, height })
    const bounds = root().getBoundingClientRect()
    expect(bounds.height).toBeCloseTo(height, 1)
    expect(node('[data-kida-photo-stage]').getBoundingClientRect().height).toBeCloseTo(height, 1)
    for (const photo of root().querySelectorAll<HTMLElement>('[data-kida-photo-item]')) {
      const rect = photo.getBoundingClientRect()
      expect(rect.left + rect.width / 2).toBeCloseTo(
        bounds.left +
          bounds.width / 2 +
          Number.parseFloat(photo.style.getPropertyValue('--kida-photo-x')),
        1,
      )
      expect(rect.top + rect.height / 2).toBeCloseTo(
        bounds.top +
          bounds.height / 2 +
          Number.parseFloat(photo.style.getPropertyValue('--kida-photo-y')),
        1,
      )
    }
  },
)

test.each(['pointerup', 'pointercancel'])(
  'drag follows the pointer and springs home on %s',
  async (end) => {
    await render(PhotoPile, { photos })
    drag()
    await expect.poll(() => card().style.transform).toContain('38px, 22px')
    expect(Number(item().style.zIndex)).toBeGreaterThan(photos.length)
    expect(item().dataset.dragging).toBe('')
    pointer(window, end)
    await expect.poll(() => card().style.willChange, { timeout: 3000 }).toBe('auto')
    expect(card().style.transform).toBe('none')
    expect(item().dataset.dragging).toBeUndefined()
  },
)

test('keyboard focus raises the photo and unrelated updates preserve that layer', async () => {
  const view = await render(PhotoPile, { photos })
  item().focus()
  const layer = Number(item().style.zIndex)
  expect(layer).toBeGreaterThan(photos.length)
  await view.rerender({
    class: 'updated',
    spread: 0.5,
    photos: photos.map((photo) => ({ ...photo, alt: `${photo.alt} updated` })),
  })
  expect(Number(item().style.zIndex)).toBe(layer)
  expect(item().getAttribute('aria-label')).toContain('updated')
  expect(item().style.getPropertyValue('--kida-photo-x')).toBe('-27px')
  expect(document.activeElement).toBe(item())
})

test('collection replacement during drag cancels old behavior and binds new photos', async () => {
  const view = await render(PhotoPile, { photos })
  const oldItem = item()
  const oldCard = card()
  drag()
  await expect.poll(() => oldCard.style.transform).toContain('38px')
  await view.rerender({ photos: [photos[2], photos[1]].filter((photo) => photo !== undefined) })
  expect(oldItem.isConnected).toBe(false)
  expect(oldCard.style.transform).toBe('none')
  expect(oldItem.dataset.dragging).toBeUndefined()
  expect(item().getAttribute('aria-label')).toContain('Mint pool')
  drag()
  await expect.poll(() => card().style.transform).toContain('38px')
  pointer(window, 'pointerup')
  await expect.poll(() => card().style.willChange, { timeout: 3000 }).toBe('auto')
})

test('reordering and new drag options use fresh collection order and controller', async () => {
  const view = await render(PhotoPile, { photos })
  await view.rerender({ photos: [...photos].reverse(), dragScale: 1.1, tilt: 0.1 })
  expect(item().getAttribute('aria-label')).toContain('Mint pool')
  expect(
    [...root().querySelectorAll<HTMLElement>('[data-kida-photo-item]')].map(
      (photo) => photo.style.zIndex,
    ),
  ).toEqual(['1', '2', '3'])
  drag()
  await expect.poll(() => card().style.transform).toContain('rotate(3.8')
  expect(card().style.transform).toContain('scale(1.1)')
})

test('reduced motion retains touch activation and settles without a spring', async () => {
  await commands.setReducedMotion(true)
  await render(PhotoPile, { photos })
  drag('touch')
  await expect.poll(() => item().dataset.dragging).toBe('')
  expect(Number(item().style.zIndex)).toBeGreaterThan(photos.length)
  pointer(window, 'pointerup', { pointerType: 'touch' })
  expect(card().style.transform).toBe('none')
  expect(card().getAnimations()).toHaveLength(0)
})

test('unmount cancels a return animation and removes window listeners', async () => {
  const view = await render(PhotoPile, { photos })
  const old = card()
  const remove = vi.spyOn(window, 'removeEventListener')
  drag()
  await expect.poll(() => old.style.transform).toContain('38px')
  pointer(window, 'pointerup')
  await expect.poll(() => old.getAnimations().length).toBeGreaterThan(0)
  await view.unmount()
  expect(old.getAnimations()).toHaveLength(0)
  expect(old.style.transform).toBe('none')
  expect(remove.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(3)
})

test('empty collections remain labeled and can receive photos later', async () => {
  const view = await render(PhotoPile, { photos: [] })
  expect(root().getAttribute('aria-label')).toBe('Draggable photo pile')
  expect(root().querySelectorAll('button')).toHaveLength(0)
  await view.rerender({ photos })
  expect(root().querySelectorAll('button')).toHaveLength(3)
  drag()
  await expect.poll(() => card().style.transform).toContain('38px')
})
