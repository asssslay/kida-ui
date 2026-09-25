import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { act, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Collapse } from './collapse.js'
import { Magnetic } from './magnetic.js'
import { PhotoPile, type PhotoPilePhoto } from './photo-pile.js'
import { Reveal } from './reveal.js'
import { ScribbleHighlight } from './scribble-highlight.js'
import { StickerBurst } from './sticker-burst.js'
import { TextBloom } from './text-bloom.js'

const photos: readonly PhotoPilePhoto[] = [
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

function Showcase({ collapseOpen = true }: { collapseOpen?: boolean }) {
  return (
    <main>
      <Reveal duration={0.01}>Reveal content</Reveal>
      <Collapse open={collapseOpen}>
        <p>Collapse content</p>
      </Collapse>
      <TextBloom duration={0.01} stagger={0}>
        Text bloom content
      </TextBloom>
      <Magnetic>
        <button type="button">Magnetic action</button>
      </Magnetic>
      <PhotoPile photos={photos} aria-label="Travel snapshots" />
      <p>
        <ScribbleHighlight>Highlighted content</ScribbleHighlight>
      </p>
      <StickerBurst>
        <button type="button">Celebrate</button>
      </StickerBurst>
    </main>
  )
}

afterEach(async () => {
  await commands.setReducedMotion(false)
})

test('preserves content and interaction when reduced motion is requested', async () => {
  await commands.setReducedMotion(true)
  const view = await render(<Showcase />)

  const reveal = document.querySelector<HTMLElement>('[data-kida-reveal]')
  const bloom = document.querySelector<HTMLElement>('[data-kida-text-bloom]')
  const magnetic = document.querySelector<HTMLElement>('[data-kida-magnetic]')
  const magneticTarget = document.querySelector<HTMLElement>('[data-kida-magnetic-target]')
  const scribble = document.querySelector<HTMLElement>('[data-kida-scribble]')
  const sticker = document.querySelector<HTMLElement>('[data-kida-sticker-burst]')
  const photo = document.querySelector<HTMLButtonElement>('[data-kida-photo-item]')
  const card = photo?.querySelector<HTMLElement>('[data-kida-photo-card]')
  if (
    !reveal ||
    !bloom ||
    !magnetic ||
    !magneticTarget ||
    !scribble ||
    !sticker ||
    !photo ||
    !card
  ) {
    throw new Error('The conformance showcase did not mount every component')
  }

  expect(getComputedStyle(reveal).opacity).toBe('1')
  expect(getComputedStyle(reveal).transform).toBe('none')
  expect(bloom.dataset.state).toBe('settled')
  for (const segment of bloom.querySelectorAll<HTMLElement>('[data-kida-text-bloom-segment]')) {
    expect(getComputedStyle(segment).opacity).toBe('1')
    expect(getComputedStyle(segment).transform).toBe('none')
  }
  expect(scribble.dataset.state).toBe('settled')

  const bounds = magnetic.getBoundingClientRect()
  magnetic.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  magnetic.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerType: 'mouse',
      clientX: bounds.right,
      clientY: bounds.bottom,
    }),
  )
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(getComputedStyle(magneticTarget).transform).toBe('none')

  sticker.querySelector('button')?.click()
  expect(sticker.dataset.state).toBe('idle')

  photo.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 20,
      pointerId: 9,
      pointerType: 'mouse',
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 50,
      clientY: 40,
      pointerId: 9,
      pointerType: 'mouse',
    }),
  )
  await expect.poll(() => card.style.transform).not.toBe('none')
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'mouse' }))
  expect(card.style.transform).toBe('none')
  expect(photo.dataset.dragging).toBeUndefined()

  await view.rerender(<Showcase collapseOpen={false} />)
  await expect.poll(() => document.querySelector('[data-kida-collapse]')).toBe(null)
})

test('has no automated accessibility violations in the complete component showcase', async () => {
  await render(<Showcase />)

  const results = await axe.run(document.body, {
    rules: {
      // Color contrast depends on the consumer's page surface and belongs in visual fixtures.
      'color-contrast': { enabled: false },
    },
  })

  expect(results.violations).toEqual([])
})

test('all components survive the Strict Mode setup-cleanup-setup cycle', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const view = await render(
    <StrictMode>
      <Showcase />
    </StrictMode>,
  )

  expect(document.querySelectorAll('[data-kida-reveal]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-collapse]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-text-bloom]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-magnetic]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-photo-pile]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-scribble]')).toHaveLength(1)
  expect(document.querySelectorAll('[data-kida-sticker-burst]')).toHaveLength(1)

  await view.unmount()
  expect(error).not.toHaveBeenCalled()
  error.mockRestore()
})

test('server markup is deterministic and hydrates without recoverable errors', async () => {
  const first = renderToString(<Showcase />)
  const second = renderToString(<Showcase />)
  expect(second).toBe(first)

  const container = document.createElement('div')
  container.innerHTML = first
  document.body.append(container)
  const recoverableErrors: unknown[] = []
  let root: ReturnType<typeof hydrateRoot> | undefined
  const actEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean
  }
  const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

  await act(async () => {
    root = hydrateRoot(container, <Showcase />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    })
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })

  expect(recoverableErrors).toEqual([])
  expect(container.querySelectorAll('[data-kida-photo-item]')).toHaveLength(2)
  expect(container.querySelectorAll('[data-kida-sticker-layer] > span')).toHaveLength(8)

  await act(async () => root?.unmount())
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment
  container.remove()
})
