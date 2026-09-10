import '@kida-ui/styles/kida.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { StickerBurst } from './sticker-burst.js'

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-sticker-burst]')
  if (!element) throw new Error('StickerBurst is not mounted')
  return element
}

test('keeps decorative burst pieces out of the accessibility tree', async () => {
  await render(
    <StickerBurst count={6} stickers={['✦', '♥']}>
      <button type="button">Celebrate</button>
    </StickerBurst>,
  )

  const element = root()
  expect(element.textContent).toContain('Celebrate')
  expect(element.querySelector('[data-kida-sticker-layer]')?.getAttribute('aria-hidden')).toBe(
    'true',
  )
  expect(element.querySelectorAll('[data-kida-sticker-layer] > span')).toHaveLength(6)
})

test('bursts on native clicks without swallowing the authored handler', async () => {
  const onClick = vi.fn()
  await render(
    <StickerBurst onClick={onClick}>
      <button type="button">Celebrate</button>
    </StickerBurst>,
  )

  const element = root()
  const button = element.querySelector('button')
  if (!button) throw new Error('Trigger is not mounted')
  button.click()

  expect(onClick).toHaveBeenCalledOnce()
  expect(element.dataset.state).toBe('active')
  await expect
    .poll(() => element.querySelector('[data-kida-sticker-layer] > span')?.getAnimations().length)
    .toBeGreaterThan(0)
})
