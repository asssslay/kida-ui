import '@kida-ui/styles/kida.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { TextBloom } from './text-bloom.js'

function Offscreen({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{ height: '150vh' }} />
      {children}
      <div style={{ height: '150vh' }} />
    </>
  )
}

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-text-bloom]')
  if (!element) throw new Error('TextBloom root is not mounted')
  return element
}

test('keeps its authored text accessible while rendering animated word segments', async () => {
  await render(
    <Offscreen>
      <TextBloom>Soft motion, clearly spoken.</TextBloom>
    </Offscreen>,
  )

  expect(root().hasAttribute('aria-label')).toBe(false)
  expect(root().querySelector('[aria-hidden="true"]')).toBe(null)
  expect(root().querySelectorAll('[data-kida-text-bloom-segment]')).toHaveLength(4)
  expect(root().textContent).toBe('Soft motion, clearly spoken.')
})

test('blooms on viewport entry and settles without a transform', async () => {
  await render(
    <Offscreen>
      <TextBloom voice="pop" duration={0.15} stagger={0.01}>
        Three sweet words
      </TextBloom>
    </Offscreen>,
  )

  const element = root()
  const first = element.querySelector<HTMLElement>('[data-kida-text-bloom-segment]')
  if (!first) throw new Error('TextBloom segment is not mounted')
  expect(getComputedStyle(first).opacity).toBe('0')

  element.scrollIntoView()
  await expect.poll(() => element.dataset.state).toBe('active')
  await expect.poll(() => element.dataset.state).toBe('settled')
  expect(getComputedStyle(first).opacity).toBe('1')
  expect(getComputedStyle(first).transform).toBe('none')
})

test('rebuilds the controller when the rendered text segments change', async () => {
  const view = await render(
    <TextBloom duration={1} stagger={0.1}>
      First words
    </TextBloom>,
  )

  await expect.poll(() => root().dataset.state).toBe('active')

  await view.rerender(
    <TextBloom by="character" voice="pop" duration={0.08} stagger={0}>
      New text
    </TextBloom>,
  )

  const element = root()
  expect(element.textContent).toBe('New text')
  expect(element.querySelectorAll('[data-kida-text-bloom-segment]')).toHaveLength(7)
  await expect.poll(() => element.dataset.state).toBe('settled')

  for (const segment of element.querySelectorAll<HTMLElement>('[data-kida-text-bloom-segment]')) {
    expect(getComputedStyle(segment).opacity).toBe('1')
    expect(getComputedStyle(segment).transform).toBe('none')
  }
})
