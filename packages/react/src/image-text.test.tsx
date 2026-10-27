import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { act, createRef, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { ImageText } from './image-text.js'

// Original test artwork: no external image request or third-party asset.
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#e94f86"/></svg>')}`
const broken = 'data:image/png,broken'
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// Chromium repeats a single background value once per image layer in computed
// style ("text, text"); Firefox and WebKit report it once. Compare distinct values.
const layers = (value: string) => [...new Set(value.split(', '))]
function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-image-text]')
  if (!element) throw new Error('ImageText did not mount')
  return element
}
afterEach(async () => {
  vi.restoreAllMocks()
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
})

test('renders one selectable text node, without spans, images or controls', async () => {
  await render(<ImageText image={image}>A world of color.</ImageText>)
  const element = root()
  expect(element.tagName).toBe('H2')
  expect(element.childNodes).toHaveLength(1)
  expect(element.firstChild?.nodeType).toBe(Node.TEXT_NODE)
  expect(element.querySelectorAll('span, button, img')).toHaveLength(0)
  expect(element.hasAttribute('aria-label')).toBe(false)
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  selection?.removeAllRanges()
  selection?.addRange(range)
  expect(selection?.toString()).toBe('A world of color.')
  selection?.removeAllRanges()
  await expect.poll(() => element.dataset.state).toBe('moving')
  expect(layers(getComputedStyle(element).backgroundClip)).toEqual(['text'])
})

test('moves the crop in both directions without moving letters, and joins the loop', async () => {
  await render(
    <ImageText image={image} duration={400}>
      Color keeps moving.
    </ImageText>,
  )
  const element = root()
  await expect.poll(() => element.dataset.state).toBe('moving')
  const animation = element.getAnimations()[0]
  if (!animation) throw new Error('Animation is missing')
  const bounds = element.getBoundingClientRect().toJSON()
  animation.pause()
  animation.currentTime = 0
  const initial = getComputedStyle(element).backgroundPosition
  animation.currentTime = 100
  expect(layers(getComputedStyle(element).backgroundPosition)).toEqual(['80% 34%'])
  expect(element.getBoundingClientRect().toJSON()).toEqual(bounds)
  animation.currentTime = 400
  expect(getComputedStyle(element).backgroundPosition).toBe(initial)
  expect(animation.effect?.getTiming().iterations).toBe(Number.POSITIVE_INFINITY)
})

test('controlled pause freezes the current frame and resumes the same animation', async () => {
  const view = await render(<ImageText image={image}>Stay a while.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('moving')
  const animation = root().getAnimations()[0]
  await view.rerender(
    <ImageText image={image} paused>
      Stay a while.
    </ImageText>,
  )
  await expect.poll(() => animation?.playState).toBe('paused')
  await wait(40)
  const time = animation?.currentTime
  await wait(80)
  expect(animation?.currentTime).toBe(time)
  await view.rerender(<ImageText image={image}>Stay a while.</ImageText>)
  await expect.poll(() => animation?.playState).toBe('running')
  expect(root().getAnimations()[0]).toBe(animation)
})

test('waits offscreen, then pauses and resumes across viewport changes', async () => {
  await render(
    <>
      <div style={{ height: '160vh' }} />
      <ImageText image={image}>Room to grow.</ImageText>
      <div style={{ height: '160vh' }} />
    </>,
  )
  const element = root()
  await expect.poll(() => element.dataset.image).toBe('ready')
  expect(element.dataset.state).toBe('pending')
  expect(element.getAnimations()).toHaveLength(0)
  element.scrollIntoView({ block: 'center' })
  await expect.poll(() => element.dataset.state).toBe('moving')
  const animation = element.getAnimations()[0]
  window.scrollTo(0, 0)
  await expect.poll(() => animation?.playState).toBe('paused')
  element.scrollIntoView({ block: 'center' })
  await expect.poll(() => animation?.playState).toBe('running')
  expect(element.getAnimations()[0]).toBe(animation)
})

test('pauses while hidden and resumes when the document is visible', async () => {
  await render(<ImageText image={image}>Take a breath.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('moving')
  const animation = root().getAnimations()[0]
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  await expect.poll(() => animation?.playState).toBe('paused')
  hidden.mockReturnValue(false)
  document.dispatchEvent(new Event('visibilitychange'))
  await expect.poll(() => animation?.playState).toBe('running')
})

test('respects initial and live reduced motion', async () => {
  await commands.setReducedMotion(true)
  await render(<ImageText image={image}>Quiet color.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().getAnimations()).toHaveLength(0)
  expect(layers(getComputedStyle(root()).backgroundPosition)).toEqual(['50% 50%'])
  await commands.setReducedMotion(false)
  await expect.poll(() => root().dataset.state).toBe('moving')
  await commands.setReducedMotion(true)
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().getAnimations()).toHaveLength(0)
})

test('keeps failed and empty images readable and recovers on replacement', async () => {
  const view = await render(<ImageText image={broken}>Still here.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('fallback')
  expect(getComputedStyle(root()).color).not.toBe('rgba(0, 0, 0, 0)')
  expect(getComputedStyle(root()).backgroundImage).toBe('none')
  await view.rerender(
    <ImageText image={image} duration={0}>
      Still here.
    </ImageText>,
  )
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().dataset.image).toBe('ready')
  await view.rerender(<ImageText image="">Still here.</ImageText>)
  expect(root().dataset.state).toBe('fallback')
})

test('updates content/options and rejects stale image completions', async () => {
  const view = await render(<ImageText image={image}>First thought.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('moving')
  const old = root().getAnimations()[0]
  await view.rerender(
    <ImageText image={image} zoom={1.5} duration={0}>
      A new thought.
    </ImageText>,
  )
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().textContent).toBe('A new thought.')
  expect(old?.playState).toBe('idle')
  await view.rerender(<ImageText image={image}>Next photo.</ImageText>)
  await view.rerender(<ImageText image={broken}>Readable fallback.</ImageText>)
  await expect.poll(() => root().dataset.state).toBe('fallback')
  await wait(60)
  expect(root().dataset.image).toBe('error')
})

test('native attributes and equivalent crops preserve the controller; changed crops update CSS', async () => {
  const view = await render(
    <ImageText image={image} position={[50, 50]}>
      One view.
    </ImageText>,
  )
  await expect.poll(() => root().dataset.state).toBe('moving')
  const animation = root().getAnimations()[0]
  await view.rerender(
    <ImageText image={image} position={[50, 50]} title="Same view">
      One view.
    </ImageText>,
  )
  expect(root().getAnimations()[0]).toBe(animation)
  await view.rerender(
    <ImageText image={image} position={[30, 70]}>
      One view.
    </ImageText>,
  )
  expect(root().style.getPropertyValue('--kida-image-text-position')).toBe('30% 70%')
  expect(root().getAnimations()[0]).toBe(animation)
})

test('forwards refs/events and supports replacing the semantic root', async () => {
  const ref = createRef<HTMLElement>()
  const click = vi.fn()
  const view = await render(
    <ImageText ref={ref} onClick={click} image={image}>
      Authored text.
    </ImageText>,
  )
  expect(ref.current).toBe(root())
  root().click()
  expect(click).toHaveBeenCalledOnce()
  const heading = root()
  await view.rerender(
    <ImageText as="p" ref={ref} image={image}>
      Authored text.
    </ImageText>,
  )
  expect(root().tagName).toBe('P')
  expect(ref.current).toBe(root())
  expect(root()).not.toBe(heading)
  expect(heading.getAnimations()).toHaveLength(0)
  await expect.poll(() => root().dataset.image).toBe('ready')
})

test('remeasures overscan after wrapping and handles empty, single and long text instances', async () => {
  const view = await render(
    <div style={{ width: 400 }}>
      {['', 'K', 'Averylongunbrokenwordthatmustwrapsafely', 'Color in every word.'].map((text) => (
        <ImageText key={text} image={image} style={{ fontSize: 32 }}>
          {text}
        </ImageText>
      ))}
    </div>,
  )
  const elements = [...document.querySelectorAll<HTMLElement>('[data-kida-image-text]')]
  await expect.poll(() => elements.every((e) => e.dataset.image === 'ready')).toBe(true)
  expect(elements[0]?.dataset.state).toBe('settled')
  const element = elements[3]
  const parent = element?.parentElement
  if (!element || !parent) throw new Error('Resize fixture is missing')
  const before = element.style.getPropertyValue('--kida-image-text-size')
  parent.style.width = '160px'
  await expect.poll(() => element.style.getPropertyValue('--kida-image-text-size')).not.toBe(before)
  const [width = 0, height = 0] = element.style
    .getPropertyValue('--kida-image-text-size')
    .split(' ')
    .map(Number.parseFloat)
  expect(width).toBeGreaterThanOrEqual(element.clientWidth * 1.28)
  expect(height).toBeGreaterThanOrEqual(element.clientHeight * 1.28)
  for (const item of elements) expect(item.scrollWidth).toBeLessThanOrEqual(160)
  view.unmount()
  for (const item of elements) expect(item.getAnimations()).toHaveLength(0)
})

test('cleans up observers and animations through Strict Mode and unmount', async () => {
  const intersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const resize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(
    <StrictMode>
      <ImageText image={image}>Back again.</ImageText>
    </StrictMode>,
  )
  const element = root()
  await expect.poll(() => element.dataset.state).toBe('moving')
  const animation = element.getAnimations()[0]
  view.unmount()
  expect(intersection).toHaveBeenCalled()
  expect(resize).toHaveBeenCalled()
  expect(animation?.playState).toBe('idle')
  expect(element.style.getPropertyValue('--kida-image-text-size')).toBe('')
})

test.each([false, true])(
  'SSR is deterministic/readable and hydrates without errors (reduced: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const content = <ImageText image={image}>Readable before hydration.</ImageText>
    const markup = renderToString(content)
    expect(renderToString(content)).toBe(markup)
    const container = document.createElement('main')
    container.innerHTML = markup
    document.body.append(container)
    expect(container.querySelector('h2')?.children).toHaveLength(0)
    expect(getComputedStyle(container.querySelector('h2') as HTMLElement).color).not.toBe(
      'rgba(0, 0, 0, 0)',
    )
    const errors: unknown[] = []
    const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const previous = environment.IS_REACT_ACT_ENVIRONMENT
    environment.IS_REACT_ACT_ENVIRONMENT = true
    let hydrated: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        hydrated = hydrateRoot(container, content, { onRecoverableError: (e) => errors.push(e) })
      })
      await expect
        .poll(() => container.querySelector<HTMLElement>('h2')?.dataset.image)
        .toBe('ready')
      expect(errors).toEqual([])
      if (reduced) expect(container.querySelector('h2')?.getAnimations()).toHaveLength(0)
    } finally {
      await act(async () => hydrated?.unmount())
      container.remove()
      environment.IS_REACT_ACT_ENVIRONMENT = previous
    }
  },
)

test('has no automated accessibility violations on the white surface', async () => {
  await render(
    <main style={{ background: '#fff' }}>
      <ImageText as="h1" image={image} paused>
        A little curiosity.
      </ImageText>
    </main>,
  )
  await expect.poll(() => root().dataset.image).toBe('ready')
  const result = await axe.run(document.body)
  expect(result.violations).toEqual([])
})
