import '@kida-ui/styles/kida.css'
import { TextBloom } from '@kida-ui/svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import TextBloomHost from './fixtures/TextBloomHost.svelte'
import { frames, node } from './fixtures.js'

const root = () => node('[data-kida-text-bloom]')
const segment = () => node('[data-kida-text-bloom-segment]')

async function offscreen(props = {}) {
  const spacer = document.createElement('div')
  spacer.dataset.bloomSpacer = ''
  spacer.style.height = '150vh'
  document.body.append(spacer)
  return render(TextBloom, { text: 'Soft motion, clearly spoken.', ...props })
}

afterEach(async () => {
  document.querySelector('[data-bloom-spacer]')?.remove()
  window.scrollTo(0, 0)
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('word segments preserve whitespace and expose authored text exactly once', async () => {
  await offscreen({ text: '  Soft\n motion, clearly spoken.  ' })
  expect(root().textContent).toBe('  Soft\n motion, clearly spoken.  ')
  expect(root().querySelectorAll('[data-kida-text-bloom-segment]')).toHaveLength(4)
  expect(root().querySelector('[aria-hidden]')).toBe(null)
  expect(root().hasAttribute('aria-label')).toBe(false)
  expect(getComputedStyle(segment()).opacity).toBe('0')
})

test('default once=true keeps text visible after the first entry and exit', async () => {
  await offscreen({ duration: 0.08, stagger: 0 })
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('settled')
  window.scrollTo(0, 0)
  await frames()
  expect(getComputedStyle(segment()).opacity).toBe('1')
  expect(getComputedStyle(segment()).transform).toBe('none')
})

test('once=false re-arms segments and animates on a second entry', async () => {
  await offscreen({ once: false, duration: 0.2, stagger: 0 })
  root().scrollIntoView()
  await expect.poll(() => root().dataset.state).toBe('settled')
  window.scrollTo(0, 0)
  await expect.poll(() => getComputedStyle(segment()).opacity).toBe('0')
  root().scrollIntoView()
  await expect.poll(() => segment().getAnimations().length, { interval: 10 }).toBeGreaterThan(0)
  await expect.poll(() => root().dataset.state).toBe('settled')
})

test('replaces an active pass when text, segmentation, and voice change', async () => {
  const view = await render(TextBloom, { text: 'First words', duration: 2 })
  await expect.poll(() => segment().getAnimations().length).toBeGreaterThan(0)
  const old = segment()
  await view.rerender({ text: 'Hi 🐈', by: 'character', voice: 'pop', duration: 0.08, stagger: 0 })
  expect(old.isConnected).toBe(false)
  expect(old.getAnimations()).toHaveLength(0)
  expect(root().textContent).toBe('Hi 🐈')
  expect(root().querySelectorAll('[data-kida-text-bloom-segment]')).toHaveLength(3)
  await expect.poll(() => root().dataset.state).toBe('settled')
})

test('unrelated attributes preserve settled state and styles', async () => {
  const view = await render(TextBloom, { text: 'Kept visible', duration: 0.05, stagger: 0 })
  await expect.poll(() => root().dataset.state).toBe('settled')
  const original = segment()
  await view.rerender({ class: 'updated' })
  expect(root().className).toBe('updated')
  expect(segment()).toBe(original)
  expect(root().dataset.state).toBe('settled')
  expect(getComputedStyle(segment()).opacity).toBe('1')
  expect(getComputedStyle(segment()).transform).toBe('none')
  expect(segment().getAnimations()).toHaveLength(0)
})

test.each(['gentle', 'pop'] as const)(
  '%s has a distinct visible trajectory and settles cleanly',
  async (voice) => {
    const view = await render(TextBloom, { text: 'Bloom', voice, duration: 1 })
    const first = segment()
    await expect.poll(() => first.getAnimations().length).toBeGreaterThan(0)
    const animations = first.getAnimations()
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = 450
    }
    const peak = new DOMMatrixReadOnly(getComputedStyle(first).transform)
    expect(Number(getComputedStyle(first).opacity)).toBeGreaterThan(0.95)
    if (voice === 'pop') {
      expect(peak.a).toBeGreaterThan(1.06)
      expect(peak.m42).toBeLessThan(-3)
      for (const animation of animations) animation.currentTime = 720
      const recoil = new DOMMatrixReadOnly(getComputedStyle(first).transform)
      expect(recoil.a).toBeLessThan(1)
      expect(recoil.m42).toBeGreaterThan(0)
    } else {
      expect(peak.a).toBeLessThanOrEqual(1)
      expect(peak.m42).toBeGreaterThanOrEqual(0)
    }
    for (const animation of animations) animation.finish()
    await expect.poll(() => root().dataset.state).toBe('settled')
    expect(first.style.transform).toBe('none')
    expect(first.style.opacity).toBe('1')
    await view.unmount()
  },
)

test('changing only the voice replaces the active trajectory', async () => {
  const view = await render(TextBloom, { text: 'Same text', voice: 'gentle', duration: 1 })
  await expect.poll(() => segment().getAnimations().length).toBeGreaterThan(0)
  const old = segment()
  await view.rerender({ voice: 'pop' })
  expect(old.getAnimations()).toHaveLength(0)
  expect(root().textContent).toBe('Same text')
  const first = segment()
  await expect.poll(() => first.getAnimations().length).toBeGreaterThan(0)
  for (const animation of first.getAnimations()) {
    animation.pause()
    animation.currentTime = 450
  }
  expect(new DOMMatrixReadOnly(getComputedStyle(first).transform).a).toBeGreaterThan(1.06)
})

test('semantic root replacement updates the bound element and forwards events', async () => {
  const sink: { current: HTMLElement | null } = { current: null }
  const onclick = vi.fn()
  const view = await render(TextBloomHost, { sink, as: 'h2', text: 'Heading', onclick })
  const old = root()
  expect(sink.current).toBe(old)
  expect(old.tagName).toBe('H2')
  await view.rerender({ as: 'p' })
  expect(root().tagName).toBe('P')
  expect(old.isConnected).toBe(false)
  await expect.poll(() => sink.current).toBe(root())
  root().click()
  expect(onclick).toHaveBeenCalledOnce()
})

test('unmount cancels active animations and viewport observation', async () => {
  const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(TextBloom, { text: 'Long running', duration: 2 })
  const old = segment()
  await expect.poll(() => old.getAnimations().length).toBeGreaterThan(0)
  await view.unmount()
  expect(old.getAnimations()).toHaveLength(0)
  expect(disconnect).toHaveBeenCalled()
})

test.each(['gentle', 'pop'] as const)(
  'reduced motion preserves offscreen %s text and empty text updates',
  async (voice) => {
    await commands.setReducedMotion(true)
    const view = await offscreen({ voice })
    expect(getComputedStyle(segment()).opacity).toBe('1')
    expect(getComputedStyle(segment()).transform).toBe('none')
    await view.rerender({ text: '' })
    expect(root().textContent).toBe('')
    expect(root().querySelectorAll('[data-kida-text-bloom-segment]')).toHaveLength(0)
    await view.rerender({ text: 'Restored' })
    expect(getComputedStyle(segment()).opacity).toBe('1')
  },
)
