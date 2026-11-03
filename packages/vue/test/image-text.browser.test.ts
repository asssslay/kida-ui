import '@kida-ui/styles/kida.css'
import { ImageText, type ImageTextProps, type KidaElement } from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import { node } from './fixtures.js'

// Original test artwork: no external image request or third-party asset.
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#e94f86"/></svg>')}`
const broken = 'data:image/png,broken'
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// Chromium repeats a single background value once per image layer in computed style.
const layers = (value: string) => [...new Set(value.split(', '))]
// Typed initial props; later rerenders may add any option or native attribute.
const props = (value: ImageTextProps & Record<string, unknown>) => value
const root = () => node('[data-kida-image-text]')

afterEach(async () => {
  vi.restoreAllMocks()
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
})

test('renders one selectable text node and forwards attributes, styles, events, and refs', async () => {
  const exposed = ref<KidaElement | null>(null)
  const click = vi.fn()
  await render(
    defineComponent({
      setup: () => () =>
        h(ImageText, {
          ref: exposed,
          image,
          text: 'A world of color.',
          class: 'custom-image-text',
          style: { '--kida-image-text-selection': 'rgb(1, 2, 3)', fontSize: '40px' },
          onClick: click,
        }),
    }),
  )
  const element = root()
  expect(exposed.value?.element).toBe(element)
  expect(element.tagName).toBe('H2')
  expect(element.className).toBe('custom-image-text')
  expect(element.childNodes).toHaveLength(1)
  expect(element.firstChild?.nodeType).toBe(Node.TEXT_NODE)
  expect(element.querySelectorAll('span, button, img')).toHaveLength(0)
  expect(element.style.getPropertyValue('--kida-image-text-selection')).toBe('rgb(1, 2, 3)')
  expect(element.style.getPropertyValue('--kida-image-text-image')).toContain('data:image/svg+xml')
  expect(getComputedStyle(element).fontSize).toBe('40px')
  element.click()
  expect(click).toHaveBeenCalledOnce()
  await expect.poll(() => element.dataset.state).toBe('moving')
  expect(layers(getComputedStyle(element).backgroundClip)).toEqual(['text'])
  expect((await axe.run(element)).violations).toEqual([])
})

test('controlled pause freezes the current frame and resumes the same animation', async () => {
  const view = await render(ImageText, { props: props({ image, text: 'Stay a while.' }) })
  await expect.poll(() => root().dataset.state).toBe('moving')
  const animation = root().getAnimations()[0]
  await view.rerender({ paused: true })
  expect(root().dataset.paused).toBe('true')
  await expect.poll(() => animation?.playState).toBe('paused')
  await wait(40)
  const time = animation?.currentTime
  await wait(80)
  expect(animation?.currentTime).toBe(time)
  await view.rerender({ paused: false })
  await expect.poll(() => animation?.playState).toBe('running')
  expect(root().getAnimations()[0]).toBe(animation)
})

test('Vue patches keep measured overscan; equivalent crops and attributes keep the controller', async () => {
  const view = await render(ImageText, {
    props: props({ image, text: 'One view.', position: [50, 50] }),
  })
  await expect.poll(() => root().dataset.state).toBe('moving')
  const size = root().style.getPropertyValue('--kida-image-text-size')
  expect(size).not.toBe('')
  const animation = root().getAnimations()[0]
  await view.rerender({ position: [50, 50], title: 'Same view', class: 'updated' })
  expect(root().getAnimations()[0]).toBe(animation)
  expect(root().style.getPropertyValue('--kida-image-text-size')).toBe(size)
  expect(root().dataset.state).toBe('moving')
  await view.rerender({ position: [30, 70] })
  expect(root().style.getPropertyValue('--kida-image-text-position')).toBe('30% 70%')
  expect(root().getAnimations()[0]).toBe(animation)
})

test('content and option changes restart the controller and ignore stale images', async () => {
  const view = await render(ImageText, { props: props({ image, text: 'First thought.' }) })
  await expect.poll(() => root().dataset.state).toBe('moving')
  const old = root().getAnimations()[0]
  await view.rerender({ text: 'A new thought.', zoom: 1.5, duration: 0 })
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().textContent).toBe('A new thought.')
  expect(old?.playState).toBe('idle')
  await view.rerender({ text: 'Next photo.', duration: undefined })
  await view.rerender({ image: broken, text: 'Readable fallback.' })
  await expect.poll(() => root().dataset.state).toBe('fallback')
  await wait(60)
  expect(root().dataset.image).toBe('error')
  expect(getComputedStyle(root()).backgroundImage).toBe('none')
  await view.rerender({ image: '' })
  expect(root().dataset.state).toBe('fallback')
})

test('replacing the semantic root moves the controller and the exposed element', async () => {
  const exposed = ref<KidaElement | null>(null)
  const as = ref<'h2' | 'p'>('h2')
  await render(
    defineComponent({
      setup: () => () => h(ImageText, { ref: exposed, as: as.value, image, text: 'Authored.' }),
    }),
  )
  await expect.poll(() => root().dataset.state).toBe('moving')
  const heading = root()
  as.value = 'p'
  await expect.poll(() => root().tagName).toBe('P')
  expect(exposed.value?.element).toBe(root())
  expect(heading.getAnimations()).toHaveLength(0)
  await expect.poll(() => root().dataset.state).toBe('moving')
})

test('waits offscreen and respects reduced motion', async () => {
  await commands.setReducedMotion(true)
  await render(ImageText, { props: { image, text: 'Hold still.' } })
  await expect.poll(() => root().dataset.state).toBe('settled')
  expect(root().getAnimations()).toHaveLength(0)
  await commands.setReducedMotion(false)
  await expect.poll(() => root().dataset.state).toBe('moving')
})

test('unmount releases observers, the animation, and measured styles', async () => {
  const intersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const resize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const view = await render(ImageText, { props: { image, text: 'Back again.' } })
  const element = root()
  await expect.poll(() => element.dataset.state).toBe('moving')
  const animation = element.getAnimations()[0]
  view.unmount()
  expect(intersection).toHaveBeenCalled()
  expect(resize).toHaveBeenCalled()
  expect(animation?.playState).toBe('idle')
  expect(element.style.getPropertyValue('--kida-image-text-size')).toBe('')
})
