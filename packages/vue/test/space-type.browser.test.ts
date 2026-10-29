import '@kida-ui/styles/kida.css'
import {
  type KidaElement,
  SpaceType,
  type SpaceTypeGeometry,
  type SpaceTypeProps,
} from '@kida-ui/vue'
import axe from 'axe-core'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'
import { node } from './fixtures.js'

const TEXT = 'KIDA-UI / SMALL-DETAILS-BIG-DELIGHT / '
const FRAME = { width: '600px', height: '300px' }
const props = (value: SpaceTypeProps & { style?: Record<string, string> }) => value
const root = () => node('[data-kida-space-type]')
const ring = () => node('[data-kida-space-type-ring]')

function getRingAnimation() {
  const animation = ring().getAnimations()[0]
  if (!animation) throw new Error('The ring animation is not mounted')
  return animation
}

async function measured() {
  await expect.poll(() => root().style.getPropertyValue('--kida-space-type-radius')).not.toBe('')
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('exposes one authored phrase and forwards native attributes, styles, events, and refs', async () => {
  const exposed = ref<KidaElement | null>(null)
  const click = vi.fn()
  await render(
    defineComponent({
      setup: () => () =>
        h(SpaceType, {
          ref: exposed,
          id: 'orbit',
          text: 'Kida 😀',
          rows: 2,
          paused: true,
          class: 'custom-ring',
          style: { height: '240px' },
          onClick: click,
        }),
    }),
  )
  await measured()
  expect(exposed.value?.element).toBe(root())
  expect(root().id).toBe('orbit')
  expect(root().className).toBe('custom-ring')
  expect(root().style.height).toBe('240px')
  expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe('Kida 😀')
  expect(root().querySelectorAll('[data-kida-space-type-row]')).toHaveLength(2)
  expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(12)
  expect(root().querySelector('[data-kida-space-type-space]')?.getAttribute('aria-hidden')).toBe(
    'true',
  )
  root().click()
  expect(click).toHaveBeenCalledOnce()
  const result = await axe.run(root(), { rules: { 'color-contrast': { enabled: false } } })
  expect(result.violations).toEqual([])
})

test('updates content, geometry, colors, and playback without replacing the animation', async () => {
  const view = await render(SpaceType, { props: props({ text: TEXT, style: FRAME }) })
  await measured()
  await expect.poll(() => root().dataset.state).toBe('active')
  const animation = getRingAnimation()
  const fontSize = root().style.getPropertyValue('--kida-space-type-size')
  await view.rerender({
    text: 'NEW WORDS /',
    rows: 3,
    longitude: 70,
    speed: 3,
    color: '#e94f86',
    background: '#211c24',
  })
  await expect.poll(() => animation.playbackRate).toBe(3)
  expect(ring().getAnimations()[0]).toBe(animation)
  expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(33)
  expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe('NEW WORDS /')
  expect(root().style.getPropertyValue('--kida-space-type-color')).toBe('#e94f86')
  expect(root().style.getPropertyValue('--kida-space-type-background')).toBe('#211c24')
  expect(root().style.getPropertyValue('--kida-space-type-longitude')).toBe('70')
  await view.rerender({ speed: 0 })
  await expect.poll(() => animation.playState).toBe('paused')
  await view.rerender({ speed: 2, paused: true })
  expect(ring().getAnimations()[0]).toBe(animation)
  expect(animation.playState).toBe('paused')
  await view.rerender({ paused: false })
  await expect.poll(() => animation.playState).toBe('running')

  await view.rerender({ text: TEXT, rows: 1, longitude: 0, radius: 70 })
  expect(root().style.getPropertyValue('--kida-space-type-size')).toBe(fontSize)
  expect(Number.parseFloat(root().style.getPropertyValue('--kida-space-type-radius'))).toBe(70)
  expect(ring().getAnimations()[0]).toBe(animation)
})

test('emits fitted geometry after measurement and when the frame changes', async () => {
  const geometries: (SpaceTypeGeometry | null)[] = []
  const width = ref(600)
  await render(
    defineComponent({
      setup: () => () =>
        h(SpaceType, {
          text: TEXT,
          paused: true,
          style: { width: `${width.value}px`, height: '300px' },
          onGeometryChange: (geometry: SpaceTypeGeometry | null) => geometries.push(geometry),
        }),
    }),
  )
  await measured()
  expect(geometries[0]).toBe(null)
  await expect.poll(() => geometries.at(-1)?.radius).toBeGreaterThan(0)
  const wide = geometries.at(-1)
  expect(`${wide?.radius}px`).toBe(root().style.getPropertyValue('--kida-space-type-radius'))
  expect(wide?.maxRadius).toBeGreaterThanOrEqual(wide?.minRadius ?? Number.POSITIVE_INFINITY)
  width.value = 342
  await expect.poll(() => geometries.at(-1)?.maxRadius).toBeLessThan(wide?.maxRadius ?? 0)
})

test('handles empty, single-character, and long phrases on one animation', async () => {
  const view = await render(SpaceType, {
    props: { text: '', style: { width: '342px', height: '240px' } },
  })
  await measured()
  await expect.poll(() => root().dataset.state).toBe('paused')
  expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(0)
  const animation = getRingAnimation()
  for (const text of ['😀', 'KIDA / '.repeat(30), '']) {
    await view.rerender({ text })
    await expect.poll(() => root().dataset.state).toBe(text ? 'active' : 'paused')
    expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe(text)
    expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(
      Array.from(text).length,
    )
    expect(getRingAnimation()).toBe(animation)
    expect(root().scrollWidth).toBe(root().clientWidth)
  }
})

test('pauses off-screen and resumes on entry', async () => {
  await render(
    defineComponent({
      setup: () => () => [
        h('div', { style: { height: '150vh' } }),
        h(SpaceType, { text: TEXT }),
        h('div', { style: { height: '150vh' } }),
      ],
    }),
  )
  await expect.poll(() => root().dataset.state).toBe('paused')
  root().scrollIntoView({ block: 'center' })
  await expect.poll(() => root().dataset.state).toBe('active')
  const animation = getRingAnimation()
  window.scrollTo(0, 0)
  await expect.poll(() => root().dataset.state).toBe('paused')
  expect(ring().getAnimations()[0]).toBe(animation)
})

test('reacts to reduced motion and releases animation and observers on unmount', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const disconnectIntersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(SpaceType, { props: { text: TEXT } })
  await expect.poll(() => root().dataset.state).toBe('active')
  const first = getRingAnimation()
  await commands.setReducedMotion(true)
  await expect.poll(() => root().dataset.state).toBe('reduced')
  expect(ring().getAnimations()).toHaveLength(0)
  expect(first.playState).toBe('idle')
  expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe(TEXT)
  await commands.setReducedMotion(false)
  await expect.poll(() => root().dataset.state).toBe('active')
  const resumed = getRingAnimation()
  view.unmount()
  expect(resumed.playState).toBe('idle')
  expect(disconnectResize).toHaveBeenCalled()
  expect(disconnectIntersection).toHaveBeenCalled()
})
