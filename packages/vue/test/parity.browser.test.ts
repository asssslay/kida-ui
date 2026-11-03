import '@kida-ui/styles/kida.css'
import {
  Collapse as ReactCollapse,
  DualWave as ReactDualWave,
  GlowHighlight as ReactGlowHighlight,
  ImageText as ReactImageText,
  Magnetic as ReactMagnetic,
  PhotoPile as ReactPhotoPile,
  Reveal as ReactReveal,
  ScribbleHighlight as ReactScribbleHighlight,
  SpaceType as ReactSpaceType,
  StickerBurst as ReactStickerBurst,
  TextBloom as ReactTextBloom,
} from '@kida-ui/react'
import {
  Collapse,
  DualWave,
  GlowHighlight,
  ImageText,
  Magnetic,
  PhotoPile,
  Reveal,
  ScribbleHighlight,
  SpaceType,
  StickerBurst,
  TextBloom,
} from '@kida-ui/vue'
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { createApp, h, nextTick, type VNode } from 'vue'
import { photos, waveItems } from './fixtures.js'

/** Renders both adapters at the same physical position and compares settled pixels. */
async function expectParity(width: number, react: ReactNode, vue: () => VNode) {
  await page.viewport(width, 844)
  await commands.setReducedMotion(true)
  const containers = ['react', 'vue'].map((adapter) => {
    const container = document.createElement('div')
    container.dataset.parity = adapter
    // Capture both adapters at the same physical position, including Vitest's iframe scale.
    container.style.cssText = `position:absolute;top:0;left:0;width:${Math.min(width - 32, 600)}px;min-height:820px;display:flow-root;background:#fff;color:#241f22;font:16px/20px sans-serif`
    document.body.append(container)
    return container
  })
  const [reactContainer, vueContainer] = containers
  if (!reactContainer || !vueContainer) throw new Error('Parity containers are missing')
  const reactRoot = createRoot(reactContainer)
  const vueApp = createApp({ render: vue })
  try {
    reactRoot.render(react)
    vueApp.mount(vueContainer)
    await nextTick()
    await expect.poll(() => reactContainer.childElementCount).toBeGreaterThan(0)
    await document.fonts.ready
    await Promise.all(
      [...vueContainer.querySelectorAll('img'), ...reactContainer.querySelectorAll('img')].map(
        (image) => image.decode(),
      ),
    )
    // Controllers that wait for decode or measurement must reach the same settled frame.
    await expect
      .poll(() =>
        containers.every((container) =>
          [
            ...container.querySelectorAll<HTMLElement>(
              '[data-kida-image-text], [data-kida-dual-wave], [data-kida-space-type]',
            ),
          ].every(
            (node) =>
              node.dataset.state === 'settled' ||
              node.dataset.state === 'reduced' ||
              node.dataset.state === 'fallback',
          ),
        ),
      )
      .toBe(true)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    expect(await commands.compareAdapters()).toBe(true)
  } finally {
    reactRoot.unmount()
    vueApp.unmount()
    containers.forEach((container) => {
      container.remove()
    })
    await commands.setReducedMotion(false)
    await page.viewport(1280, 720)
  }
}

test.each([390, 1280])(
  'Vue and React render identical settled pixels at viewport width %s',
  async (width) => {
    await expectParity(
      width,
      createElement(
        'main',
        null,
        createElement(ReactReveal, { as: 'section' }, createElement('h2', null, 'Reveal content')),
        createElement(ReactCollapse, { open: true }, createElement('p', null, 'Collapse content')),
        // biome-ignore lint/correctness/noChildrenProp: createElement requires TextBloom's string children in its typed props.
        createElement(ReactTextBloom, { as: 'h2', children: 'Soft text, clearly spoken.' }),
        createElement(
          ReactMagnetic,
          null,
          createElement('button', { type: 'button' }, 'Magnetic action'),
        ),
        createElement(ReactPhotoPile, { photos }),
        createElement(
          'p',
          null,
          createElement(ReactScribbleHighlight, null, 'Underline'),
          ' ',
          createElement(ReactScribbleHighlight, { variant: 'circle' }, 'Circle'),
        ),
        createElement(
          ReactStickerBurst,
          { count: 6, seed: 3 },
          createElement('button', { type: 'button' }, 'Celebrate'),
        ),
      ),
      () =>
        h('main', [
          h(Reveal, { as: 'section' }, () => h('h2', 'Reveal content')),
          h(Collapse, { open: true }, () => h('p', 'Collapse content')),
          h(TextBloom, { text: 'Soft text, clearly spoken.', as: 'h2' }),
          h(Magnetic, {}, () => h('button', { type: 'button' }, 'Magnetic action')),
          h(PhotoPile, { photos }),
          h('p', [
            h(ScribbleHighlight, {}, () => 'Underline'),
            ' ',
            h(ScribbleHighlight, { variant: 'circle' }, () => 'Circle'),
          ]),
          h(StickerBurst, { count: 6, seed: 3 }, () =>
            h('button', { type: 'button' }, 'Celebrate'),
          ),
        ]),
    )
  },
)

test.each([390, 1280])(
  'Vue and React render identical ImageText, SpaceType, and GlowHighlight at %s',
  async (width) => {
    const image = photos[0]?.src ?? ''
    await expectParity(
      width,
      createElement(
        'main',
        null,
        // biome-ignore lint/correctness/noChildrenProp: createElement requires ImageText's string children in its typed props.
        createElement(ReactImageText, { image, children: 'Color between the lines.' }),
        createElement(ReactSpaceType, { text: 'KIDA / ORBIT / ', rows: 2, style: { height: 240 } }),
        createElement(
          'p',
          { style: { fontSize: 28 } },
          'Make it ',
          createElement(ReactGlowHighlight, { trigger: 'manual', active: true }, 'sweet'),
          ' and ',
          createElement(
            ReactGlowHighlight,
            { trigger: 'manual', active: true, finish: 'sticker', palette: 'berry' },
            'bold',
          ),
        ),
      ),
      () =>
        h('main', [
          h(ImageText, { image, text: 'Color between the lines.' }),
          h(SpaceType, { text: 'KIDA / ORBIT / ', rows: 2, style: { height: '240px' } }),
          h('p', { style: { fontSize: '28px' } }, [
            'Make it ',
            h(GlowHighlight, { trigger: 'manual', active: true }, () => 'sweet'),
            ' and ',
            h(
              GlowHighlight,
              { trigger: 'manual', active: true, finish: 'sticker', palette: 'berry' },
              () => 'bold',
            ),
          ]),
        ]),
    )
  },
)

test.each([390, 1280])(
  'Vue and React render identical DualWave mosaic and frame layouts at %s',
  async (width) => {
    const style = { '--kida-dual-wave-height': '380px' } as Record<string, string>
    await expectParity(
      width,
      createElement(
        'main',
        null,
        createElement(ReactDualWave, { items: waveItems, defaultIndex: 1, style }),
        createElement(ReactDualWave, { items: waveItems, layout: 'frame', style }),
      ),
      () =>
        h('main', [
          h(DualWave, { items: waveItems, defaultIndex: 1, style }),
          h(DualWave, { items: waveItems, layout: 'frame', style }),
        ]),
    )
  },
)
