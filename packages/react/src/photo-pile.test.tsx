import '@kida-ui/styles/kida.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { PhotoPile } from './photo-pile.js'

const photos = [
  {
    id: 'one',
    src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    alt: 'Pink flower',
  },
  {
    id: 'two',
    src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
    alt: 'Orange sky',
  },
]

function parts() {
  const root = document.querySelector<HTMLFieldSetElement>('[data-kida-photo-pile]')
  const items = [...document.querySelectorAll<HTMLButtonElement>('[data-kida-photo-item]')]
  const card = items[0]?.querySelector<HTMLElement>('[data-kida-photo-card]')
  if (!root || items.length !== 2 || !card) throw new Error('PhotoPile is not mounted')
  return { root, items, card }
}

test('renders an accessible group of draggable photos', async () => {
  await render(<PhotoPile photos={photos} aria-label="Travel snapshots" />)

  const { root, items } = parts()
  expect(root.getAttribute('aria-label')).toBe('Travel snapshots')
  expect(items[0]?.getAttribute('aria-label')).toBe('Bring Pink flower to front and drag')
  expect(root.querySelectorAll('img')).toHaveLength(2)
  expect(root.querySelector('img')?.getAttribute('draggable')).toBe('false')
})

test('drags the active photo directly and springs it home', async () => {
  await render(<PhotoPile photos={photos} />)

  const { items, card } = parts()
  const first = items[0]
  if (!first) throw new Error('Photo is not mounted')

  first.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 40,
      clientY: 30,
      pointerId: 4,
      pointerType: 'mouse',
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 78,
      clientY: 52,
      pointerId: 4,
      pointerType: 'mouse',
    }),
  )

  await expect.poll(() => getComputedStyle(card).transform).not.toBe('none')
  expect(first).toHaveProperty('dataset.dragging', '')
  expect(Number(first.style.zIndex)).toBeGreaterThan(2)

  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, pointerType: 'mouse' }))
  await expect.poll(() => card.style.willChange, { timeout: 3000 }).toBe('auto')
  expect(card.style.transform).toBe('none')
  expect(first.dataset.dragging).toBeUndefined()
})

test('brings a keyboard-focused photo to the front', async () => {
  await render(<PhotoPile photos={photos} />)

  const { items } = parts()
  items[0]?.focus()
  await expect.poll(() => Number(items[0]?.style.zIndex)).toBeGreaterThan(2)
})
