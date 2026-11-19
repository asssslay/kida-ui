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
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { mount, tick, unmount } from 'svelte'
import { expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import Parity from './fixtures/Parity.svelte'
import { frames, photos, waveItems } from './fixtures.js'

type Group = 'primitives' | 'surfaces' | 'dual-wave'

async function expectParity(width: number, react: ReactNode, group: Group) {
  await page.viewport(width, 844)
  await commands.setReducedMotion(true)
  const containers = ['react', 'svelte'].map((adapter) => {
    const container = document.createElement('div')
    container.dataset.parity = adapter
    container.style.cssText = `position:absolute;top:0;left:0;width:${Math.min(width - 32, 600)}px;min-height:820px;display:flow-root;background:#fff;color:#241f22;font:16px/20px sans-serif`
    document.body.append(container)
    return container
  })
  const [reactContainer, svelteContainer] = containers
  if (!reactContainer || !svelteContainer) throw new Error('Parity containers are missing')
  const reactRoot = createRoot(reactContainer)
  let app: ReturnType<typeof mount> | undefined
  try {
    app = mount(Parity, { target: svelteContainer, props: { group } })
    reactRoot.render(react)
    await tick()
    await expect.poll(() => reactContainer.childElementCount).toBeGreaterThan(0)
    await document.fonts.ready
    await Promise.all(
      [...svelteContainer.querySelectorAll('img'), ...reactContainer.querySelectorAll('img')].map(
        (image) => image.decode(),
      ),
    )
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
    await frames()
    expect(await commands.compareAdapters()).toBe(true)
  } finally {
    reactRoot.unmount()
    if (app) await unmount(app)
    containers.forEach((container) => {
      container.remove()
    })
    await commands.setReducedMotion(false)
    await page.viewport(1440, 1000)
  }
}

test.each([390, 1280])(
  'Svelte and React render identical settled primitives at viewport width %s',
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
      'primitives',
    )
  },
)

test.each([390, 1280])(
  'Svelte and React render identical ImageText, SpaceType, and GlowHighlight at %s',
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
      'surfaces',
    )
  },
)

test.each([390, 1280])(
  'Svelte and React render identical DualWave mosaic and frame layouts at %s',
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
      'dual-wave',
    )
  },
)
