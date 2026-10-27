import '@kida-ui/styles/kida.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { ImageTextPlayground } from './image-text-playground'

test('the approved playground is white and text-only and uses the promoted React component', async () => {
  await render(<ImageTextPlayground standalone />)
  const element = document.querySelector<HTMLElement>('[data-kida-image-text]')
  if (!element) throw new Error('ImageText did not mount')
  expect(document.querySelectorAll('span, button, input, select, textarea')).toHaveLength(0)
  expect(element.children).toHaveLength(0)
  expect(element.textContent).toContain('A little curiosity.')
  const surface = document.querySelector('.demo-image-text')
  if (!surface) throw new Error('White surface is missing')
  expect(getComputedStyle(surface).backgroundColor).toBe('rgb(255, 255, 255)')
  await expect.poll(() => element.dataset.state).toBe('moving')
})
