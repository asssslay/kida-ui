import '@kida-ui/styles/kida.css'
import { Collapse as ReactCollapse, Reveal as ReactReveal } from '@kida-ui/react'
import { Collapse, Reveal } from '@kida-ui/vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { createApp, h, nextTick } from 'vue'

test.each([390, 1280])(
  'Vue and React render identical settled pixels at viewport width %s',
  async (width) => {
    await page.viewport(width, 844)
    await commands.setReducedMotion(true)
    const containers = ['react', 'vue'].map((adapter) => {
      const container = document.createElement('div')
      container.dataset.parity = adapter
      // Capture both adapters at the same physical position, including Vitest's iframe scale.
      container.style.cssText =
        'position:absolute;top:0;left:0;width:320px;height:220px;display:flow-root;background:#fff;color:#241f22;font:16px/20px sans-serif'
      document.body.append(container)
      return container
    })
    const [reactContainer, vueContainer] = containers
    if (!reactContainer || !vueContainer) throw new Error('Parity containers are missing')
    const react = createRoot(reactContainer)
    const vue = createApp({
      render: () =>
        h('main', [
          h(Reveal, { as: 'section' }, () => h('h2', 'Reveal content')),
          h(Collapse, { open: true }, () => h('p', 'Collapse content')),
        ]),
    })
    try {
      react.render(
        createElement(
          'main',
          null,
          createElement(
            ReactReveal,
            { as: 'section' },
            createElement('h2', null, 'Reveal content'),
          ),
          createElement(
            ReactCollapse,
            { open: true },
            createElement('p', null, 'Collapse content'),
          ),
        ),
      )
      vue.mount(vueContainer)
      await nextTick()
      await expect.poll(() => reactContainer.querySelector('[data-kida-collapse]')).not.toBe(null)
      await document.fonts.ready
      expect(await commands.compareAdapters()).toBe(true)
    } finally {
      react.unmount()
      vue.unmount()
      containers.forEach((container) => {
        container.remove()
      })
      await commands.setReducedMotion(false)
      await page.viewport(1280, 720)
    }
  },
)
