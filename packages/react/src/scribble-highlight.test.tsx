import '@kida-ui/styles/kida.css'
import { afterEach, expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ScribbleHighlight } from './scribble-highlight.js'

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-scribble]')
  if (!element) throw new Error('ScribbleHighlight is not mounted')
  return element
}

afterEach(async () => {
  await commands.setReducedMotion(false)
})

test('reduced motion renders a complete path without an active CSS animation', async () => {
  await commands.setReducedMotion(true)
  await render(<ScribbleHighlight>Visible immediately</ScribbleHighlight>)
  const path = root().querySelector('path')
  if (!path) throw new Error('Path is missing')
  expect(root().dataset.state).toBe('settled')
  expect(getComputedStyle(path).strokeDashoffset).toBe('0px')
  expect(path.getAnimations()).toHaveLength(0)
})

test('keeps readable content and exposes no decorative SVG to assistive technology', async () => {
  await render(<ScribbleHighlight variant="circle">Worth circling</ScribbleHighlight>)

  expect(root().textContent).toBe('Worth circling')
  expect(root().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  expect(root().querySelector('path')?.getAttribute('pathLength')).toBe('1')
})

test('draws when scrolled into view', async () => {
  await render(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight>Drawn in</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )

  const element = root()
  expect(element.dataset.state).toBe('idle')
  element.scrollIntoView()
  await expect.poll(() => element.dataset.state).toBe('active')
  expect(element.querySelector('path')?.getAnimations().length).toBeGreaterThan(0)
})

test('re-arms viewport behavior when its motion options change', async () => {
  const view = await render(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight once>Drawn again</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )

  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('active')

  await view.rerender(
    <>
      <div style={{ height: '150vh' }} />
      <ScribbleHighlight once={false}>Drawn again</ScribbleHighlight>
      <div style={{ height: '150vh' }} />
    </>,
  )
  await expect.poll(() => root().dataset.state).toBe('active')

  window.scrollTo(0, 0)
  await expect.poll(() => root().dataset.state).toBe('idle')
})
