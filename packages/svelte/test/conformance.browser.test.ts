import '@kida-ui/styles/kida.css'
import { Magnetic as ReactMagnetic, Reveal as ReactReveal } from '@kida-ui/react'
import axe from 'axe-core'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { hydrate, mount, tick, unmount } from 'svelte'
import { afterEach, expect, test, vi } from 'vitest'
import { commands, page } from 'vitest/browser'
import Parity from './fixtures/Parity.svelte'
import Showcase from './fixtures/Showcase.svelte'

afterEach(async () => {
  await commands.setReducedMotion(false)
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

test('hydrates Node-rendered markup without errors or replaced nodes', async () => {
  const errors = vi.spyOn(console, 'error')
  const warnings = vi.spyOn(console, 'warn')
  const target = document.createElement('div')
  target.innerHTML = await commands.serverMarkup()
  document.body.append(target)
  const reveal = target.querySelector<HTMLElement>('[data-kida-reveal]')
  const magnetic = target.querySelector('[data-kida-magnetic]')
  expect(reveal?.style.opacity).toBe('0')
  const app = hydrate(Showcase, { target })
  await tick()
  expect(target.querySelector('[data-kida-reveal]')).toBe(reveal)
  expect(target.querySelector('[data-kida-magnetic]')).toBe(magnetic)
  await expect.poll(() => reveal?.style.willChange).toBe('auto')
  expect(errors).not.toHaveBeenCalled()
  expect(warnings).not.toHaveBeenCalled()
  await unmount(app)
})

test('Reveal stays visible in server markup with reduced motion before hydration', async () => {
  await commands.setReducedMotion(true)
  const target = document.createElement('div')
  target.innerHTML = await commands.serverMarkup()
  document.body.append(target)
  const reveal = target.querySelector<HTMLElement>('[data-kida-reveal]')
  if (!reveal) throw new Error('Reveal is missing')
  expect(getComputedStyle(reveal).opacity).toBe('1')
  expect(getComputedStyle(reveal).transform).toBe('none')
})

test('the showcase has no serious axe violations, including color contrast', async () => {
  await commands.setReducedMotion(true)
  const target = document.createElement('div')
  document.body.append(target)
  const app = mount(Showcase, { target })
  await tick()
  const { violations } = await axe.run(target, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  })
  expect(violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual(
    [],
  )
  await unmount(app)
})

test.each([390, 1280])(
  'Svelte and React render identical settled pixels at viewport width %s',
  async (width) => {
    await page.viewport(width, 844)
    await commands.setReducedMotion(true)
    const containers = ['react', 'svelte'].map((adapter) => {
      const container = document.createElement('div')
      container.dataset.parity = adapter
      container.style.cssText = `position:absolute;top:0;left:0;width:${Math.min(width - 32, 600)}px;min-height:320px;display:flow-root;background:#fff;color:#241f22;font:16px/20px sans-serif`
      document.body.append(container)
      return container
    })
    const [reactContainer, svelteContainer] = containers
    if (!reactContainer || !svelteContainer) throw new Error('Parity containers are missing')
    const react = createRoot(reactContainer)
    react.render(
      createElement(
        'main',
        null,
        createElement(ReactReveal, { as: 'section' }, createElement('h2', null, 'Reveal content')),
        createElement(
          ReactMagnetic,
          null,
          createElement('button', { type: 'button' }, 'Magnetic action'),
        ),
      ),
    )
    const app = mount(Parity, { target: svelteContainer })
    await tick()
    await expect
      .poll(() => reactContainer.querySelector('[data-kida-magnetic]') !== null)
      .toBe(true)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    expect(reactContainer.querySelector('main')?.children).toHaveLength(2)
    expect(await commands.compareAdapters()).toBe(true)
    react.unmount()
    await unmount(app)
  },
)
