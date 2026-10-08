import '@kida-ui/styles/kida.css'
import { Collapse, type KidaElement } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'

const query = () => document.querySelector<HTMLElement>('[data-kida-collapse]')
const node = () => {
  const element = query()
  if (!element) throw new Error('Collapse is not mounted')
  return element
}
const content = () => h('div', { style: { height: '40px' } }, 'Collapse content')
const settled = () => expect.poll(() => node().getAnimations().length).toBe(0)

afterEach(async () => {
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('mounts on open, measures content, and animates to natural height', async () => {
  const view = await render(Collapse, { props: { open: false }, slots: { default: content } })
  expect(query()).toBe(null)
  await view.rerender({ open: true })
  expect(node().dataset.state).toBe('open')
  expect(node().getAnimations().length).toBeGreaterThan(0)
  await settled()
  expect(node().getBoundingClientRect().height).toBe(40)
})

test('initially open content skips the enter animation', async () => {
  await render(Collapse, { props: { open: true }, slots: { default: content } })
  expect(node().getAnimations()).toHaveLength(0)
  expect(node().getBoundingClientRect().height).toBe(40)
})

test('holds the node during exit then emits exit-complete exactly once', async () => {
  const onExitComplete = vi.fn()
  const view = await render(Collapse, {
    props: { open: true, onExitComplete },
    slots: { default: content },
  })
  await view.rerender({ open: false })
  expect(node().dataset.state).toBe('closed')
  expect(node().getAnimations().length).toBeGreaterThan(0)
  await expect.poll(query).toBe(null)
  expect(onExitComplete).toHaveBeenCalledOnce()
  expect(view.emitted('exit-complete')).toHaveLength(1)
})

test('rapid reopening cancels exit without emitting exit-complete', async () => {
  const onExitComplete = vi.fn()
  const view = await render(Collapse, {
    props: { open: true, onExitComplete },
    slots: { default: content },
  })
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
    const view = await render(Collapse, {
      props: { open: false },
      attrs: {
        style: {
          boxSizing,
          paddingTop: '10px',
          paddingBottom: '12px',
          borderTop: '3px solid',
          borderBottom: '5px solid',
        },
      },
      slots: { default: content },
    })
    await view.rerender({ open: true })
    await settled()
    const natural = node().getBoundingClientRect().height
    node().style.height = node().style.getPropertyValue('--kida-collapse-height')
    expect(node().getBoundingClientRect().height).toBeCloseTo(natural, 1)
  },
)

test('slot and root style updates remeasure and reopening observes a fresh node', async () => {
  const Host = defineComponent({
    props: { open: { default: true }, padding: { default: 10 }, height: { default: 40 } },
    setup: (props) => () =>
      h(
        Collapse,
        {
          open: props.open,
          style: { boxSizing: 'border-box', paddingTop: `${props.padding}px` },
        },
        () => h('div', { style: { height: `${props.height}px` } }, 'Content'),
      ),
  })
  const view = await render(Host)
  const original = node()
  expect(original.style.getPropertyValue('--kida-collapse-height')).toBe('50px')
  await view.rerender({ padding: 20, height: 80 })
  await expect.poll(() => node().style.getPropertyValue('--kida-collapse-height')).toBe('100px')
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  await view.rerender({ open: true, padding: 15 })
  await settled()
  expect(node()).not.toBe(original)
  expect(node().style.getPropertyValue('--kida-collapse-height')).toBe('95px')
})

test('DOM refs, native attributes and authored events survive the presence lifecycle', async () => {
  const component = ref<KidaElement | null>(null)
  const onClick = vi.fn()
  const Host = defineComponent({
    props: { open: { default: true } },
    setup: (props) => () =>
      h(
        Collapse,
        {
          ref: component,
          open: props.open,
          id: 'details',
          'aria-label': 'Details',
          onClick,
        },
        content,
      ),
  })
  const view = await render(Host)
  expect(component.value?.element).toBe(node())
  expect(node().id).toBe('details')
  expect(node().getAttribute('aria-label')).toBe('Details')
  node().click()
  expect(onClick).toHaveBeenCalledOnce()
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  expect(component.value?.element).toBe(null)
})

test('reduced-motion exit removes content and emits without waiting for animationend', async () => {
  await commands.setReducedMotion(true)
  const onExitComplete = vi.fn()
  const view = await render(Collapse, {
    props: { open: true, onExitComplete },
    slots: { default: content },
  })
  expect(node().getAnimations()).toHaveLength(0)
  await view.rerender({ open: false })
  await expect.poll(query).toBe(null)
  expect(onExitComplete).toHaveBeenCalledOnce()
})

test('unmount disconnects the shared size observer and cancels exit callbacks', async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
  const onExitComplete = vi.fn()
  const view = await render(Collapse, {
    props: { open: true, onExitComplete },
    slots: { default: content },
  })
  await view.rerender({ open: false })
  const element = node()
  await view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
  element.dispatchEvent(
    new AnimationEvent('animationend', { animationName: 'kida-collapse-close' }),
  )
  expect(onExitComplete).not.toHaveBeenCalled()
})
