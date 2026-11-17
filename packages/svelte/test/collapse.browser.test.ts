import '@kida-ui/styles/kida.css'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-svelte'
import CollapseHost from './fixtures/CollapseHost.svelte'

const query = () => document.querySelector<HTMLElement>('[data-kida-collapse]')
const node = () => {
  const element = query()
  if (!element) throw new Error('Collapse is not mounted')
  return element
}
const settled = () => expect.poll(() => node().getAnimations().length).toBe(0)
const frameStyle = (padding: number) => `box-sizing: border-box; padding-top: ${padding}px`

afterEach(async () => {
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('mounts on open, measures content, and animates to natural height', async () => {
  const view = await render(CollapseHost, { open: false })
  expect(query()).toBe(null)
  await view.rerender({ open: true })
  expect(node().dataset.state).toBe('open')
  expect(node().getAnimations().length).toBeGreaterThan(0)
  await settled()
  expect(node().getBoundingClientRect().height).toBe(40)
})

test('initially open content skips the enter animation', async () => {
  await render(CollapseHost, { open: true })
  expect(node().getAnimations()).toHaveLength(0)
  expect(node().getBoundingClientRect().height).toBe(40)
})

test('holds the node during exit then calls onExitComplete exactly once', async () => {
  const onExitComplete = vi.fn()
  const view = await render(CollapseHost, { open: true, onExitComplete })
  await view.rerender({ open: false })
  expect(node().dataset.state).toBe('closed')
  expect(node().getAnimations().length).toBeGreaterThan(0)
  await expect.poll(query).toBe(null)
  expect(onExitComplete).toHaveBeenCalledOnce()
})

test('rapid reopening cancels exit without calling onExitComplete', async () => {
  const onExitComplete = vi.fn()
  const view = await render(CollapseHost, { open: true, onExitComplete })
  await view.rerender({ open: false })
  expect(node().dataset.state).toBe('closed')
  await view.rerender({ open: true })
  await settled()
  expect(node().dataset.state).toBe('open')
  expect(node().getBoundingClientRect().height).toBe(40)
  expect(onExitComplete).not.toHaveBeenCalled()
})

test.each(['border-box', 'content-box'] as const)(
  'measured height matches natural height under %s',
  async (boxSizing) => {
    const view = await render(CollapseHost, {
      open: false,
      style: `box-sizing: ${boxSizing}; padding-top: 10px; padding-bottom: 12px; border-top: 3px solid; border-bottom: 5px solid`,
    })
    await view.rerender({ open: true })
    await settled()
    const natural = node().getBoundingClientRect().height
    node().style.height = node().style.getPropertyValue('--kida-collapse-height')
    expect(node().getBoundingClientRect().height).toBeCloseTo(natural, 1)
  },
)

test('content and root style updates remeasure and reopening observes a fresh node', async () => {
  const view = await render(CollapseHost, { open: true, style: frameStyle(10), label: 'Content' })
  const original = node()
  expect(original.style.getPropertyValue('--kida-collapse-height')).toBe('50px')
  await view.rerender({ style: frameStyle(20), height: 80 })
  await expect.poll(() => node().style.getPropertyValue('--kida-collapse-height')).toBe('100px')
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  await view.rerender({ open: true, style: frameStyle(15) })
  await settled()
  expect(node()).not.toBe(original)
  expect(node().style.getPropertyValue('--kida-collapse-height')).toBe('95px')
})

test('bound element, native attributes and authored events survive the presence lifecycle', async () => {
  const sink: { current: HTMLDivElement | null } = { current: null }
  const onclick = vi.fn()
  const view = await render(CollapseHost, {
    sink,
    open: true,
    id: 'details',
    'aria-label': 'Details',
    onclick,
  })
  expect(sink.current).toBe(node())
  expect(node().id).toBe('details')
  expect(node().getAttribute('aria-label')).toBe('Details')
  node().click()
  expect(onclick).toHaveBeenCalledOnce()
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  await expect.poll(() => sink.current).toBe(null)
})

test('reduced-motion exit removes content and calls back without waiting for animationend', async () => {
  await commands.setReducedMotion(true)
  const onExitComplete = vi.fn()
  const view = await render(CollapseHost, { open: true, onExitComplete })
  expect(node().getAnimations()).toHaveLength(0)
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  expect(onExitComplete).toHaveBeenCalledOnce()
})

test('unmount disconnects the shared size observer and cancels exit callbacks', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const onExitComplete = vi.fn()
  const view = await render(CollapseHost, { open: true, onExitComplete })
  await view.rerender({ open: false })
  const element = node()
  await view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
  element.dispatchEvent(
    new AnimationEvent('animationend', { animationName: 'kida-collapse-close' }),
  )
  expect(onExitComplete).not.toHaveBeenCalled()
})
