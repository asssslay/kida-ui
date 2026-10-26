import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { afterEach, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Collapse } from './collapse.js'
import { PhotoPile, type PhotoPilePhoto } from './photo-pile.js'
import { SpaceType } from './space-type.js'
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

afterEach(async () => {
  await commands.setReducedMotion(false)
  await page.viewport(1280, 720)
})

test.each([false, true])(
  'SpaceType fits light and dark surfaces after resizing (reduced motion: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const view = await render(
      <main style={{ width: 760, maxWidth: '100%' }}>
        <h1>SpaceType surface checks</h1>
        <SpaceType
          text="KIDA / MADE-TO-MOVE / "
          rows={2}
          longitude={100}
          paused
          radius={Number.MAX_VALUE}
          style={{ height: 260 }}
        />
        <SpaceType
          text="KIDA / AFTER-HOURS / "
          rows={2}
          longitude={100}
          paused
          radius={Number.MAX_VALUE}
          color="#fffafb"
          background="#211c24"
          style={{ height: 260 }}
        />
      </main>,
    )
    const roots = [...document.querySelectorAll<HTMLElement>('[data-kida-space-type]')]
    expect(roots).toHaveLength(2)
    for (const root of roots) {
      await expect.poll(() => root.style.getPropertyValue('--kida-space-type-radius')).not.toBe('')
    }
    const wideRadius = Number.parseFloat(
      roots[0]?.style.getPropertyValue('--kida-space-type-radius') ?? '',
    )
    for (const width of [1280, 390]) {
      await page.viewport(width, width === 390 ? 844 : 900)
      if (width === 390) {
        await expect
          .poll(() =>
            Number.parseFloat(roots[0]?.style.getPropertyValue('--kida-space-type-radius') ?? ''),
          )
          .toBeLessThan(wideRadius)
      }
      for (const root of roots) {
        const bounds = root.getBoundingClientRect()
        expect(root.dataset.state).toBe(reduced ? 'reduced' : 'paused')
        for (const face of root.querySelectorAll<HTMLElement>('[data-kida-space-type-face]')) {
          const box = face.getBoundingClientRect()
          expect(box.left).toBeGreaterThanOrEqual(bounds.left)
          expect(box.right).toBeLessThanOrEqual(bounds.right)
          expect(box.top).toBeGreaterThanOrEqual(bounds.top)
          expect(box.bottom).toBeLessThanOrEqual(bounds.bottom)
        }
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      )
    }
    const dark = roots[1]
    if (!dark) throw new Error('Dark surface is missing')
    expect(getComputedStyle(dark).backgroundColor).toBe('rgb(33, 28, 36)')
    const front = dark.querySelector<HTMLElement>('[data-kida-space-type-face="front"]')
    if (!front) throw new Error('Dark surface text is missing')
    expect(getComputedStyle(front).color).toBe('rgb(255, 250, 251)')
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
    await view.unmount()
  },
)

test('PhotoPile applies its compact layout without page-level overflow', async () => {
  await page.viewport(1280, 720)
  const view = await render(
    <div style={{ width: '560px', maxWidth: '100%' }}>
      <PhotoPile photos={photos} />
    </div>,
  )
  const desktopRoot = document.querySelector<HTMLElement>('[data-kida-photo-pile]')
  const desktopItem = document.querySelector<HTMLElement>('[data-kida-photo-item]')
  if (!desktopRoot || !desktopItem) throw new Error('Desktop PhotoPile is not mounted')
  const desktopWidth = desktopItem.getBoundingClientRect().width
  expect(desktopRoot.getBoundingClientRect().height).toBeGreaterThanOrEqual(352)

  await page.viewport(390, 844)
  await view.rerender(
    <div style={{ width: '100%' }}>
      <PhotoPile photos={photos} />
    </div>,
  )
  const mobileRoot = document.querySelector<HTMLElement>('[data-kida-photo-pile]')
  const mobileItem = document.querySelector<HTMLElement>('[data-kida-photo-item]')
  if (!mobileRoot || !mobileItem) throw new Error('Mobile PhotoPile is not mounted')

  await expect.poll(() => mobileItem.getBoundingClientRect().width).toBeLessThan(desktopWidth)
  expect(mobileRoot.getBoundingClientRect().height).toBeGreaterThanOrEqual(288)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth,
  )

  mobileItem.focus()
  expect(document.activeElement).toBe(mobileItem)
  expect(getComputedStyle(mobileItem).outlineStyle).not.toBe('none')
})

test('Collapse remeasures wrapped content after its container narrows', async () => {
  const content = (
    <p style={{ margin: 0, lineHeight: '20px' }}>
      Responsive content grows taller when the available inline space becomes substantially
      narrower.
    </p>
  )
  const view = await render(
    <div style={{ width: 360 }}>
      <Collapse open>{content}</Collapse>
    </div>,
  )
  const root = document.querySelector<HTMLElement>('[data-kida-collapse]')
  if (!root) throw new Error('Collapse is not mounted')
  const wideHeight = root.getBoundingClientRect().height

  await view.rerender(
    <div style={{ width: 150 }}>
      <Collapse open>{content}</Collapse>
    </div>,
  )
  await expect.poll(() => root.getBoundingClientRect().height).toBeGreaterThan(wideHeight)
  const narrowHeight = root.getBoundingClientRect().height
  await expect
    .poll(() => Number.parseFloat(root.style.getPropertyValue('--kida-collapse-height')))
    .toBeCloseTo(narrowHeight, 1)

  await view.rerender(
    <div style={{ width: 150 }}>
      <Collapse open={false}>{content}</Collapse>
    </div>,
  )
  await expect.poll(() => document.querySelector('[data-kida-collapse]')).toBe(null)

  await view.rerender(
    <div style={{ width: 150 }}>
      <Collapse open>{content}</Collapse>
    </div>,
  )
  const reopened = document.querySelector<HTMLElement>('[data-kida-collapse]')
  if (!reopened) throw new Error('Collapse did not reopen')
  await expect.poll(() => reopened.getAnimations().length).toBe(0)
  expect(reopened.getBoundingClientRect().height).toBeCloseTo(narrowHeight, 1)
})

test('TextBloom wraps at narrow widths without changing or overflowing its text', async () => {
  await page.viewport(390, 844)
  await render(
    <div data-testid="text-frame" style={{ width: 160, overflow: 'auto' }}>
      <TextBloom duration={0.01} stagger={0}>
        Soft motion remains readable on narrow screens
      </TextBloom>
    </div>,
  )

  const frame = document.querySelector<HTMLElement>('[data-testid="text-frame"]')
  const bloom = document.querySelector<HTMLElement>('[data-kida-text-bloom]')
  const text = bloom?.firstElementChild
  if (!frame || !bloom || !text) throw new Error('TextBloom is not mounted')
  await expect.poll(() => bloom.dataset.state).toBe('settled')

  expect(bloom.textContent).toBe('Soft motion remains readable on narrow screens')
  expect(text.getClientRects().length).toBeGreaterThan(1)
  expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth)
})
