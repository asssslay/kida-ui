import '@kida-ui/styles/kida.css'
import { type KidaElement, Reveal } from '@kida-ui/vue'
import { afterEach, expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, ref } from 'vue'

const node = () => {
  const element = document.querySelector<HTMLElement>('[data-kida-reveal]')
  if (!element) throw new Error('Reveal is not mounted')
  return element
}

async function offscreen(props = {}) {
  const spacer = document.createElement('div')
  spacer.style.height = '150vh'
  document.body.append(spacer)
  const view = await render(Reveal, { props, slots: { default: () => 'Reveal content' } })
  return { ...view, spacer }
}

afterEach(async () => {
  document.querySelectorAll('body > div[style="height: 150vh;"]').forEach((el) => {
    el.remove()
  })
  window.scrollTo(0, 0)
  await commands.setReducedMotion(false)
  vi.restoreAllMocks()
})

test('default Reveal starts hidden, animates on entry, and stays visible after exit', async () => {
  await offscreen()
  const element = node()
  expect(getComputedStyle(element).opacity).toBe('0')
  expect(getComputedStyle(element).transform).toBe('matrix(1, 0, 0, 1, 0, 8)')
  element.scrollIntoView()
  await expect.poll(() => element.style.willChange).toBe('auto')
  expect(getComputedStyle(element).transform).toBe('none')
  window.scrollTo(0, 0)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(getComputedStyle(element).opacity).toBe('1')
})

test('reactive options reset the controller using new geometry', async () => {
  const view = await offscreen({ x: -32, y: 0, scale: 0.9 })
  expect(getComputedStyle(node()).transform).toBe('matrix(0.9, 0, 0, 0.9, -32, 0)')
  await view.rerender({ x: 24 })
  expect(getComputedStyle(node()).transform).toBe('matrix(0.9, 0, 0, 0.9, 24, 0)')
})

test('once=false re-hides and runs an animation on re-entry', async () => {
  await offscreen({ once: false, duration: 0.4 })
  const element = node()
  element.scrollIntoView()
  await expect.poll(() => element.style.willChange).toBe('auto')
  window.scrollTo(0, 0)
  await expect.poll(() => getComputedStyle(element).opacity).toBe('0')
  element.scrollIntoView()
  await expect.poll(() => element.getAnimations().length, { interval: 10 }).toBeGreaterThan(0)
  await expect.poll(() => element.style.willChange).toBe('auto')
})

test('slot and class updates and equivalent easing tuples preserve the settled state', async () => {
  const Host = defineComponent({
    props: { label: { default: 'Original' }, rootClass: { default: 'first' } },
    setup: (props) => () =>
      h(
        Reveal,
        {
          class: props.rootClass,
          duration: 0.01,
          ease: [0.16, 1, 0.3, 1],
        },
        () => props.label,
      ),
  })
  const view = await render(Host)
  await expect.poll(() => node().style.willChange).toBe('auto')
  await view.rerender({ label: 'Updated', rootClass: 'second' })
  expect(node().textContent).toBe('Updated')
  expect(node().className).toBe('second')
  expect(getComputedStyle(node()).opacity).toBe('1')
  expect(getComputedStyle(node()).transform).toBe('none')
  expect(node().getAnimations()).toHaveLength(0)
})

test('exposes the DOM root and forwards native attributes and authored events', async () => {
  const component = ref<KidaElement | null>(null)
  const onClick = vi.fn()
  const view = await render(
    defineComponent({
      setup: () => () =>
        h(
          Reveal,
          {
            ref: component,
            as: 'section',
            id: 'featured',
            'aria-label': 'Featured content',
            onClick,
          },
          () => 'Content',
        ),
    }),
  )
  expect(component.value?.element).toBe(node())
  expect(node().tagName).toBe('SECTION')
  expect(node().id).toBe('featured')
  expect(node().getAttribute('aria-label')).toBe('Featured content')
  node().click()
  expect(onClick).toHaveBeenCalledOnce()
  await view.unmount()
  expect(component.value).toBe(null)
})

test('changing the semantic root cleans up the old controller and observes the new node', async () => {
  const view = await offscreen({ as: 'div', y: 18 })
  const original = node()
  await view.rerender({ as: 'section' })
  expect(node()).not.toBe(original)
  expect(original.isConnected).toBe(false)
  expect(node().tagName).toBe('SECTION')
  node().scrollIntoView()
  await expect.poll(() => node().style.willChange).toBe('auto')
})

test('unmount cancels active animations and viewport observation', async () => {
  const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
  const view = await render(Reveal, { props: { duration: 2 }, slots: { default: () => 'Content' } })
  const element = node()
  await expect.poll(() => element.getAnimations().length).toBeGreaterThan(0)
  await view.unmount()
  expect(element.getAnimations()).toHaveLength(0)
  expect(disconnect).toHaveBeenCalled()
})

test('reduced motion keeps offscreen content visible without animation', async () => {
  await commands.setReducedMotion(true)
  await offscreen()
  expect(getComputedStyle(node()).opacity).toBe('1')
  expect(getComputedStyle(node()).transform).toBe('none')
  expect(node().getAnimations()).toHaveLength(0)
})
