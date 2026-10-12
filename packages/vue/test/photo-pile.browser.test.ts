import '@kida-ui/styles/kida.css'
import { type KidaElement, PhotoPile } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
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
  const exposed = ref<KidaElement | null>(null)
  const click = vi.fn()
  await render(
    defineComponent({
      setup: () => () =>
        h(PhotoPile, {
          ref: exposed,
          photos: photos.map((photo) => ({
            ...photo,
            imageProps: {
              loading: 'lazy' as const,
              width: 80,
              class: 'photo',
              src: 'invalid',
              alt: 'invalid',
              draggable: true,
            },
          })),
          'aria-label': 'Travel snapshots',
          onClick: click,
        }),
    }),
  )
  expect(exposed.value?.element).toBe(root())
  expect(root().getAttribute('aria-label')).toBe('Travel snapshots')
  expect(item().getAttribute('aria-label')).toBe('Bring Pink flower to front and drag')
  const image = root().querySelector('img')
  expect(image?.getAttribute('alt')).toBe('Pink flower')
  expect(image?.getAttribute('draggable')).toBe('false')
  expect(image?.getAttribute('loading')).toBe('lazy')
  expect(image?.className).toBe('photo')
  item().click()
  expect(click).toHaveBeenCalledOnce()
})

test.each([
  { width: 480, height: 320 },
  { width: 320, height: 240 },
])(
  'centers cards inside a positioned percentage-height preview at $width px',
  async ({ width, height }) => {
    await render(
      defineComponent({
        setup: () => () =>
          h(
            'div',
            { style: { paddingTop: '240px' } },
            h(
              'div',
              {
                style: {
                  width: `${width}px`,
                  height: `${height}px`,
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                },
              },
              h(PhotoPile, { photos, style: { width: '100%', height: '100%', minHeight: 0 } }),
            ),
          ),
      }),
    )
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
    await render(PhotoPile, { props: { photos } })
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
  const view = await render(PhotoPile, {
    props: { photos } as InstanceType<typeof PhotoPile>['$props'],
  })
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
  const view = await render(PhotoPile, {
    props: { photos } as InstanceType<typeof PhotoPile>['$props'],
  })
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
  const view = await render(PhotoPile, {
    props: { photos } as InstanceType<typeof PhotoPile>['$props'],
  })
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
  await render(PhotoPile, { props: { photos } })
  drag('touch')
  await expect.poll(() => item().dataset.dragging).toBe('')
  expect(Number(item().style.zIndex)).toBeGreaterThan(photos.length)
  pointer(window, 'pointerup', { pointerType: 'touch' })
  expect(card().style.transform).toBe('none')
  expect(card().getAnimations()).toHaveLength(0)
})

test('unmount cancels a return animation and removes window listeners', async () => {
  const view = await render(PhotoPile, { props: { photos } })
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
  const view = await render(PhotoPile, {
    props: { photos: [] } as InstanceType<typeof PhotoPile>['$props'],
  })
  expect(root().getAttribute('aria-label')).toBe('Draggable photo pile')
  expect(root().querySelectorAll('button')).toHaveLength(0)
  await view.rerender({ photos })
  expect(root().querySelectorAll('button')).toHaveLength(3)
  drag()
  await expect.poll(() => card().style.transform).toContain('38px')
})
