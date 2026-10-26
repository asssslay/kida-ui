import '@fontsource-variable/instrument-sans'
import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ImageText } from './image-text.js'

const photo = new URL('../../../apps/docs/public/demo/image-text/pink-bloom.webp', import.meta.url)
  .href

test.each([390, 1280])('white ImageText geometry and contrast at %spx', async (width) => {
  await page.viewport(width, 900)
  await commands.setReducedMotion(true)
  await render(
    <main
      style={{
        padding: 20,
        background: '#fff',
        fontFamily: '"Instrument Sans Variable", sans-serif',
      }}
    >
      <ImageText image={photo} style={{ fontSize: 'clamp(36px, 8vw, 110px)' }}>
        A little curiosity. A fresh perspective. A world of color, waiting between the lines.
      </ImageText>
    </main>,
  )
  await document.fonts.ready
  const text = document.querySelector<HTMLElement>('[data-kida-image-text]')
  if (!text) throw new Error('ImageText visual fixture is missing')
  await expect.poll(() => text.dataset.image).toBe('ready')
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
  expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth)
  expect(text.getBoundingClientRect().right).toBeLessThanOrEqual(width)
  expect(text.children).toHaveLength(0)
  expect(text.getAnimations()).toHaveLength(0)
  expect(getComputedStyle(text.parentElement as HTMLElement).backgroundColor).toBe(
    'rgb(255, 255, 255)',
  )
  const result = await axe.run(document.body)
  expect(result.violations).toEqual([])
})
