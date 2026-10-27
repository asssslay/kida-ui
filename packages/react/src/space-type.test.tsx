import '@kida-ui/styles/kida.css'
import axe from 'axe-core'
import { act, createRef, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { SpaceType } from './space-type.js'

const TEXT = 'KIDA-UI / SMALL-DETAILS-BIG-DELIGHT / '

function root() {
  const element = document.querySelector<HTMLElement>('[data-kida-space-type]')
  if (!element) throw new Error('SpaceType is not mounted')
  return element
}

function ring() {
  const element = root().querySelector<HTMLElement>('[data-kida-space-type-ring]')
  if (!element) throw new Error('The ring is not mounted')
  return element
}

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
  await page.viewport(1280, 720)
  window.scrollTo(0, 0)
  vi.restoreAllMocks()
})

test('exposes one authored phrase and forwards native attributes, styles, events, and refs', async () => {
  const ref = createRef<HTMLDivElement>()
  const click = vi.fn()
  await render(
    <SpaceType
      ref={ref}
      id="orbit"
      text="Kida 😀"
      rows={2}
      paused
      className="custom-ring"
      style={{ height: 240 }}
      onClick={click}
    />,
  )
  await measured()
  expect(ref.current).toBe(root())
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
  const view = await render(<SpaceType text={TEXT} style={{ width: 600, height: 300 }} />)
  await measured()
  await expect.poll(() => root().dataset.state).toBe('active')
  const animation = getRingAnimation()
  expect(animation).toBeDefined()
  await view.rerender(
    <SpaceType
      text="NEW WORDS /"
      rows={3}
      longitude={70}
      speed={3}
      color="#e94f86"
      background="#211c24"
      style={{ width: 600, height: 300 }}
    />,
  )
  await expect.poll(() => animation.playbackRate).toBe(3)
  expect(ring().getAnimations()[0]).toBe(animation)
  expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(33)
  expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe('NEW WORDS /')
  expect(root().style.getPropertyValue('--kida-space-type-color')).toBe('#e94f86')
  expect(root().style.getPropertyValue('--kida-space-type-background')).toBe('#211c24')
  await view.rerender(
    <SpaceType text="NEW WORDS /" speed={0} style={{ width: 600, height: 300 }} />,
  )
  await expect.poll(() => animation.playState).toBe('paused')
  await expect.poll(() => animation.pending).toBe(false)
  const time = animation.currentTime
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(animation.currentTime).toBe(time)
  await view.rerender(
    <SpaceType text="NEW WORDS /" speed={2} paused style={{ width: 600, height: 300 }} />,
  )
  expect(ring().getAnimations()[0]).toBe(animation)
  expect(animation.playState).toBe('paused')
  await view.rerender(
    <SpaceType text="NEW WORDS /" speed={2} style={{ width: 600, height: 300 }} />,
  )
  await expect.poll(() => animation.playState).toBe('running')
})

test('supports compact radius changes without changing font size', async () => {
  const view = await render(<SpaceType text={TEXT} paused style={{ width: 600, height: 300 }} />)
  await measured()
  const fontSize = root().style.getPropertyValue('--kida-space-type-size')
  const originalRadius = Number.parseFloat(
    root().style.getPropertyValue('--kida-space-type-radius'),
  )
  const animation = getRingAnimation()
  await view.rerender(
    <SpaceType text={TEXT} paused radius={70} style={{ width: 600, height: 300 }} />,
  )
  expect(root().style.getPropertyValue('--kida-space-type-size')).toBe(fontSize)
  expect(Number.parseFloat(root().style.getPropertyValue('--kida-space-type-radius'))).toBeLessThan(
    originalRadius / 2,
  )
  expect(ring().getAnimations()[0]).toBe(animation)
})

test('longitude pulses the cylinder and tilts its letter surface without resizing type or restarting', async () => {
  const view = await render(
    <SpaceType text={TEXT} paused radius={140} style={{ width: 600, height: 300 }} />,
  )
  await measured()
  const animation = getRingAnimation()
  const fontSize = root().style.getPropertyValue('--kida-space-type-size')
  const letter = root().querySelector<HTMLElement>('[data-kida-space-type-letter]')
  if (!letter) throw new Error('The letter surface is not mounted')
  const transformAt = (time: number) => {
    animation.currentTime = time
    return new DOMMatrix(getComputedStyle(letter).transform)
  }
  expect(transformAt(0).m23).toBeCloseTo(0)
  await view.rerender(
    <SpaceType
      text={TEXT}
      paused
      radius={140}
      longitude={100}
      style={{ width: 600, height: 300 }}
    />,
  )
  expect(getRingAnimation()).toBe(animation)
  expect(root().style.getPropertyValue('--kida-space-type-size')).toBe(fontSize)
  const expanding = transformAt(0)
  const widest = transformAt(750)
  const contracting = transformAt(1500)
  const narrowest = transformAt(2250)
  expect(expanding.m23).toBeGreaterThan(0.1)
  expect(contracting.m23).toBeLessThan(-0.1)
  expect(widest.m23).toBeCloseTo(0)
  expect(widest.m43).toBeGreaterThan(expanding.m43)
  expect(narrowest.m43).toBeLessThan(expanding.m43)
  expect(transformAt(3000).m23).toBeCloseTo(expanding.m23)
  expect(transformAt(3000).m43).toBeCloseTo(expanding.m43)
})

test.each([undefined, 70, Number.MAX_VALUE])(
  'longitude keeps the base radius and playback position fixed (radius: %s)',
  async (radius) => {
    const view = await render(
      <SpaceType text={TEXT} paused radius={radius} style={{ width: 600, height: 300 }} />,
    )
    await measured()
    const originalRadius = root().style.getPropertyValue('--kida-space-type-radius')
    const fontSize = root().style.getPropertyValue('--kida-space-type-size')
    const animation = getRingAnimation()
    animation.currentTime = 4123
    for (const longitude of [25, 100, 0]) {
      await view.rerender(
        <SpaceType
          text={TEXT}
          paused
          radius={radius}
          longitude={longitude}
          style={{ width: 600, height: 300 }}
        />,
      )
      expect(root().style.getPropertyValue('--kida-space-type-radius')).toBe(originalRadius)
      expect(root().style.getPropertyValue('--kida-space-type-size')).toBe(fontSize)
      expect(getRingAnimation()).toBe(animation)
      expect(animation.currentTime).toBe(4123)
    }
  },
)

test('pauses off-screen and resumes on entry', async () => {
  await render(
    <>
      <div style={{ height: '150vh' }} />
      <SpaceType text={TEXT} />
      <div style={{ height: '150vh' }} />
    </>,
  )
  await expect.poll(() => root().dataset.state).toBe('paused')
  root().scrollIntoView({ block: 'center' })
  await expect.poll(() => root().dataset.state).toBe('active')
  const animation = getRingAnimation()
  window.scrollTo(0, 0)
  await expect.poll(() => root().dataset.state).toBe('paused')
  expect(ring().getAnimations()[0]).toBe(animation)
})

test('handles empty, single-character, and long phrases without losing the accessible text', async () => {
  const view = await render(<SpaceType text="" style={{ width: 342, height: 240 }} />)
  await measured()
  await expect.poll(() => root().dataset.state).toBe('paused')
  expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(0)
  const animation = getRingAnimation()
  for (const text of ['😀', 'KIDA / '.repeat(30), '']) {
    await view.rerender(<SpaceType text={text} style={{ width: 342, height: 240 }} />)
    await expect.poll(() => root().dataset.state).toBe(text ? 'active' : 'paused')
    expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe(text)
    expect(root().querySelectorAll('[data-kida-space-type-letter]')).toHaveLength(
      Array.from(text).length,
    )
    expect(getRingAnimation()).toBe(animation)
    expect(root().scrollWidth).toBe(root().clientWidth)
    for (const face of root().querySelectorAll<HTMLElement>('[data-kida-space-type-face]')) {
      const box = face.getBoundingClientRect()
      const bounds = root().getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(bounds.left)
      expect(box.right).toBeLessThanOrEqual(bounds.right)
    }
  }
})

test('instances keep independent playback and suspend while the document is hidden', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  const view = await render(
    <>
      <SpaceType id="playing" text="FIRST / " style={{ height: 180 }} />
      <SpaceType id="still" text="SECOND / " speed={0} style={{ height: 180 }} />
    </>,
  )
  const playing = document.querySelector<HTMLElement>('#playing')
  const still = document.querySelector<HTMLElement>('#still')
  if (!playing || !still) throw new Error('SpaceType instances are missing')
  await expect.poll(() => playing.dataset.state).toBe('active')
  await expect.poll(() => still.dataset.state).toBe('paused')
  const first = playing.querySelector('[data-kida-space-type-ring]')?.getAnimations()[0]
  const second = still.querySelector('[data-kida-space-type-ring]')?.getAnimations()[0]
  if (!first || !second) throw new Error('Instance animations are missing')
  expect(first).not.toBe(second)
  hidden.mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(playing.dataset.state).toBe('paused')
  expect(first.playState).toBe('paused')
  hidden.mockReturnValue(false)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(playing.dataset.state).toBe('active')
  expect(first.playState).toBe('running')
  expect(second.playState).toBe('paused')
  await view.unmount()
  expect(first.playState).toBe('idle')
  expect(second.playState).toBe('idle')
})

test('reacts to reduced motion and releases all animation and observer resources in Strict Mode', async () => {
  const disconnectResize = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const disconnectIntersection = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(
    <StrictMode>
      <SpaceType text={TEXT} />
    </StrictMode>,
  )
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
  await view.unmount()
  expect(resumed.playState).toBe('idle')
  expect(disconnectResize.mock.calls.length).toBeGreaterThanOrEqual(2)
  expect(disconnectIntersection.mock.calls.length).toBeGreaterThanOrEqual(2)
})

test.each([false, true])(
  'SSR is deterministic and hydrates without errors (reduce: %s)',
  async (reduced) => {
    await commands.setReducedMotion(reduced)
    const element = <SpaceType text={TEXT} rows={2} />
    const html = renderToString(element)
    expect(renderToString(element)).toBe(html)
    expect(html).not.toContain('undefined')
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const errors: unknown[] = []
    let hydrated: ReturnType<typeof hydrateRoot> | undefined
    const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const previousEnvironment = environment.IS_REACT_ACT_ENVIRONMENT
    environment.IS_REACT_ACT_ENVIRONMENT = true
    try {
      await act(async () => {
        hydrated = hydrateRoot(container, element, {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      // Hydration must commit before awaiting ResizeObserver's first delivery.
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      })
      await measured()
      expect(errors).toEqual([])
      expect(root().querySelector('[data-kida-space-type-text]')?.textContent).toBe(TEXT)
    } finally {
      await act(async () => hydrated?.unmount())
      environment.IS_REACT_ACT_ENVIRONMENT = previousEnvironment
      container.remove()
    }
  },
)

test.each([342, 912])(
  'keeps the full wave inside the frame at minimum and maximum radius (%s px)',
  async (width) => {
    const view = await render(
      <SpaceType
        text={TEXT}
        rows={6}
        longitude={100}
        paused
        radius={Number.MAX_VALUE}
        style={{ width, height: 300 }}
      />,
    )
    await measured()
    for (const radius of [Number.MAX_VALUE, 0]) {
      await view.rerender(
        <SpaceType
          text={TEXT}
          rows={6}
          longitude={100}
          paused
          radius={radius}
          style={{ width, height: 300 }}
        />,
      )
      const bounds = root().getBoundingClientRect()
      const animation = getRingAnimation()
      for (let time = 0; time < 24000; time += 250) {
        animation.currentTime = time
        for (const face of root().querySelectorAll<HTMLElement>('[data-kida-space-type-face]')) {
          const box = face.getBoundingClientRect()
          expect(box.left).toBeGreaterThanOrEqual(bounds.left)
          expect(box.right).toBeLessThanOrEqual(bounds.right)
          expect(box.top).toBeGreaterThanOrEqual(bounds.top)
          expect(box.bottom).toBeLessThanOrEqual(bounds.bottom)
        }
      }
      expect(root().scrollWidth).toBe(root().clientWidth)
      expect(root().scrollHeight).toBe(root().clientHeight)
    }
  },
)
