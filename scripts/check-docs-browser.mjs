#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const docs = join(root, 'apps/docs')
const docsRequire = createRequire(join(docs, 'package.json'))
const reactRequire = createRequire(join(root, 'packages/react/package.json'))
const { preview } = await import(pathToFileURL(docsRequire.resolve('astro')).href)
const engines = reactRequire('playwright')
const engine = process.env.KIDA_TEST_BROWSER ?? 'chromium'
assert(['chromium', 'firefox', 'webkit'].includes(engine), `Unknown browser: ${engine}`)
const components = [
  'reveal',
  'collapse',
  'text-bloom',
  'magnetic',
  'photo-pile',
  'scribble-highlight',
  'sticker-burst',
]
const server = await preview({
  root: docs,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
})
let browser
try {
  browser = await engines[engine].launch({
    headless: true,
    ...(engine === 'chromium'
      ? {
          channel: existsSync(engines.chromium.executablePath()) ? undefined : 'chrome',
          args: ['--disable-gpu'],
        }
      : {}),
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.setDefaultNavigationTimeout(30000)
  const errors = []
  page.on('pageerror', (error) => {
    const detail = { message: error.message, url: page.url(), stack: error.stack }
    errors.push(detail)
    console.error('Documentation browser error:', detail)
  })
  const origin = `http://127.0.0.1:${server.port}`

  async function open(path) {
    const response = await page.goto(`${origin}${path}`)
    // Firefox exposes the 304 from a validated cache entry on repeat navigations.
    // The rendered page and hydrated demos are still checked below.
    assert([200, 304].includes(response?.status()), `${path}: HTTP ${response?.status()}`)
    await page.waitForFunction(
      () => !!document.querySelector('[name="astro-view-transitions-enabled"]'),
    )
  }

  async function switchTo(framework, name) {
    const path = `/docs/${framework === 'vue' ? 'vue/' : ''}${name}`
    const link = page.locator(`.framework-switcher a[href="${path}"]`)
    await link.focus()
    await link.click()
    await page.waitForURL(`${origin}${path}`)
    await page.waitForFunction(
      (path) =>
        document
          .querySelector(`.framework-switcher a[href="${path}"]`)
          ?.getAttribute('aria-current') === 'page',
      path,
    )
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute('data-astro-transition'),
    )
  }

  async function hydrated(name) {
    const stage = page.locator(`[data-demo="${name}"] .demo-stage`)
    await stage.scrollIntoViewIfNeeded()
    await page.waitForFunction((name) => {
      const islands = [...document.querySelectorAll(`[data-demo="${name}"] astro-island`)]
      return islands.length > 0 && islands.every((island) => !island.hasAttribute('ssr'))
    }, name)
    await page.evaluate(() => document.fonts.ready)
    await stage
      .locator('img')
      .evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
    return stage
  }

  async function capture(name) {
    const stage = await hydrated(name)
    // Compare the same resting state: scrolling can leave the pointer over only one
    // framework's button after opening Collapse, especially in WebKit.
    await page.mouse.move(0, 0)
    await stage.evaluate((node) => {
      const focused = document.activeElement
      if (focused instanceof HTMLElement && node.contains(focused)) focused.blur()
    })
    const tree = await stage.evaluate((stage) => {
      const origin = stage.getBoundingClientRect()
      const properties = [
        'display',
        'position',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'lineHeight',
        'color',
        'backgroundColor',
        'borderColor',
        'borderWidth',
        'borderRadius',
        'padding',
        'gap',
        'opacity',
        'transform',
      ]
      function describe(node) {
        // Astro's hydration wrapper has display:contents and differs by renderer.
        if (node.tagName === 'ASTRO-ISLAND') return [...node.children].flatMap(describe)
        if (['STYLE', 'SCRIPT'].includes(node.tagName)) return []
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        return [
          {
            tag: node.tagName,
            class: node.getAttribute('class') ?? '',
            text: node.textContent.replace(/\s+/g, ' ').trim(),
            attributes: Object.fromEntries(
              [
                'role',
                'aria-label',
                'aria-hidden',
                'aria-expanded',
                'alt',
                'src',
                'd',
                'viewBox',
              ].map((name) => [name, node.getAttribute(name)]),
            ),
            style: Object.fromEntries(properties.map((name) => [name, style[name]])),
            bounds: [rect.left - origin.left, rect.top - origin.top, rect.width, rect.height],
            children: [...node.children].flatMap(describe),
          },
        ]
      }
      return [...stage.children].flatMap(describe)
    })
    return {
      tree,
      screenshot: await stage.screenshot({ animations: 'disabled', caret: 'hide', scale: 'css' }),
    }
  }

  async function compare(name, width, react, vue) {
    function compareNodes(a, b, path = name) {
      assert.equal(a.length, b.length, `${path}: element count`)
      for (let index = 0; index < a.length; index++) {
        const { bounds: boundsA, children: childrenA, ...nodeA } = a[index]
        const { bounds: boundsB, children: childrenB, ...nodeB } = b[index]
        const label = `${path}/${nodeA.tag}[${index}]`
        assert.deepEqual(nodeA, nodeB, `${label}: content, markup, or computed styles`)
        for (let axis = 0; axis < 4; axis++) {
          assert(
            Math.abs(boundsA[axis] - boundsB[axis]) <= 0.05,
            `${label}: layout axis ${axis}: ${boundsA[axis]} versus ${boundsB[axis]}`,
          )
        }
        compareNodes(childrenA, childrenB, label)
      }
    }
    try {
      compareNodes(react.tree, vue.tree)
    } catch (error) {
      const directory = join(docs, '.vitest-attachments/framework', `${engine}-${name}-${width}`)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'react.png'), react.screenshot)
      await writeFile(join(directory, 'vue.png'), vue.screenshot)
      await writeFile(
        join(directory, 'rendered.json'),
        JSON.stringify({ react: react.tree, vue: vue.tree }, null, 2),
      )
      throw error
    }
  }

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const name of components) {
      console.log(`Checking ${engine}: ${name} at ${width}px`)
      await open(`/docs/${name}`)
      const basic = `${name}-basic`
      const demoNames = await page
        .locator('.demo[data-demo]')
        .evaluateAll((nodes) => nodes.map((node) => node.dataset.demo))
      const reactDemos = new Map()
      for (const demo of demoNames) reactDemos.set(demo, await capture(demo))
      await page.evaluate(() => {
        window.__docsParityDocument = document
        window.__docsParityHeader = document.querySelector('.docs-prose-head')
        window.__docsParitySidebar = document.querySelector('.sidebar')
      })
      await switchTo('vue', name)
      assert(
        await page.evaluate(() => window.__docsParityDocument === document),
        'Framework switch reloaded the document',
      )
      assert(
        await page.evaluate(
          () => window.__docsParityHeader === document.querySelector('.docs-prose-head'),
        ),
        'Framework switch replaced the page heading',
      )
      assert(
        await page.evaluate(
          () => window.__docsParitySidebar === document.querySelector('.sidebar'),
        ),
        'Framework switch replaced the sidebar',
      )
      assert.equal(
        await page.locator('.sidebar a[aria-current="page"]').getAttribute('href'),
        `/docs/vue/${name}`,
      )
      assert.deepEqual(
        await page
          .locator('.demo[data-demo]')
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.demo)),
        demoNames,
        'Framework pages must offer the same demo variants',
      )
      for (const demo of demoNames) {
        await compare(demo, width, reactDemos.get(demo), await capture(demo))
      }

      if (name === 'reveal') {
        // Settled layout alone cannot detect changed entrance travel.
        const states = []
        for (const prefix of ['/docs', '/docs/vue']) {
          const html = await (await fetch(`${origin}${prefix}/reveal`)).text()
          states.push(
            await page.evaluate((html) => {
              const document = new DOMParser().parseFromString(html, 'text/html')
              return [...document.querySelectorAll('[data-kida-reveal]')].map((node) => ({
                tag: node.tagName,
                class: node.className,
                opacity: node.style.opacity,
                transform: node.style.transform,
              }))
            }, html),
          )
        }
        assert.deepEqual(states[0], states[1], 'Reveal demo initial geometry differs by framework')
      }
      if (name === 'collapse') {
        await page.locator('[data-demo="collapse-basic"] button').click()
        await page.waitForFunction(
          () => !!document.querySelector('[data-demo="collapse-basic"] [data-kida-collapse]'),
        )
        const expandedVue = await capture(basic)
        await switchTo('react', name)
        await hydrated(basic)
        await page.locator('[data-demo="collapse-basic"] button').click()
        await page.waitForFunction(
          () => !!document.querySelector('[data-demo="collapse-basic"] [data-kida-collapse]'),
        )
        await compare('collapse-expanded', width, await capture(basic), expandedVue)
      }
    }
  }

  await open('/docs/reveal')
  await hydrated('reveal-basic')
  await page.evaluate(() => window.scrollTo({ top: 140, behavior: 'instant' }))
  const before = await page.evaluate(() => window.scrollY)
  await switchTo('vue', 'reveal')
  assert(
    Math.abs((await page.evaluate(() => window.scrollY)) - before) <= 1,
    'Framework switch changed scroll position',
  )
  assert.equal(
    await page.locator('.framework-switcher a:focus').getAttribute('href'),
    '/docs/vue/reveal',
  )
  // Repeat without waiting for island hydration to finish between traversals.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goBack()
    await page.waitForURL(`${origin}/docs/reveal`)
    await page.waitForFunction(
      () =>
        document
          .querySelector('.framework-switcher a[href="/docs/reveal"]')
          ?.getAttribute('aria-current') === 'page',
    )
    await page.goForward()
    await page.waitForURL(`${origin}/docs/vue/reveal`)
    await page.waitForFunction(
      () =>
        document
          .querySelector('.framework-switcher a[href="/docs/vue/reveal"]')
          ?.getAttribute('aria-current') === 'page',
    )
  }
  // Clipboard is stubbed only at the host boundary; the actual post-navigation Copy handler runs.
  await page.evaluate(() => {
    window.__copiedDocsText = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedDocsText = text
        },
      },
    })
  })
  await page.locator('[data-copy]').first().click()
  await page.waitForFunction(() => window.__copiedDocsText.length > 0)
  assert.equal(await page.locator('[data-copy]').first().textContent(), 'Copied')

  // Exercise the routed island lifecycle with real motion as well as settled comparisons.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open('/docs/reveal')
  async function settledReveal() {
    await hydrated('reveal-basic')
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-demo="reveal-basic"] [data-kida-reveal]')
      const style = getComputedStyle(element)
      return style.opacity === '1' && style.transform === 'none'
    })
  }
  await settledReveal()
  await page.evaluate(() => {
    window.__motionDocument = document
  })
  await switchTo('vue', 'reveal')
  await settledReveal()
  assert(await page.evaluate(() => window.__motionDocument === document))
  // Clicking the already-selected framework is inert, including its scroll position.
  await page.evaluate(() => window.scrollTo({ top: 140, behavior: 'instant' }))
  const historyLength = await page.evaluate(() => history.length)
  await switchTo('vue', 'reveal')
  assert.equal(await page.evaluate(() => history.length), historyLength)
  assert.equal(await page.evaluate(() => window.scrollY), 140)
  await page.locator('.sidebar a[href="/docs/vue/collapse"]').click()
  await page.waitForURL(`${origin}/docs/vue/collapse`)
  await hydrated('collapse-basic')
  assert.equal(await page.locator('h1').textContent(), 'Collapse')
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-demo="collapse-basic"] button')
    return (
      button.getAttribute('aria-expanded') === 'true' &&
      document.getElementById(button.getAttribute('aria-controls'))
    )
  })
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(
    () => !document.querySelector('[data-demo="collapse-basic"] [data-kida-collapse]'),
  )
  await page.locator('.sidebar a[href="/docs/vue/installation"]').click()
  await page.waitForURL(`${origin}/docs/vue/installation`)
  await switchTo('react', 'installation')
  assert(await page.evaluate(() => window.__motionDocument === document))
  await page.locator('.sidebar a[href="/docs"]').click()
  await page.waitForURL(`${origin}/docs`)
  await page.waitForFunction(
    () =>
      document.querySelector('.docs-catalog') &&
      document.querySelector('.site-nav a[href="/docs"]')?.getAttribute('aria-current') === 'page',
  )
  // Catalog and marketing pages retain native navigation; only reference pages need
  // client navigation for framework selection.
  assert(
    await page.evaluate(() => !document.querySelector('[name="astro-view-transitions-enabled"]')),
  )
  await page.locator('.wordmark').click()
  await page.waitForURL(`${origin}/`)
  assert.equal(await page.locator('.site-nav a[href="/docs"]').getAttribute('aria-current'), null)
  assert.deepEqual(errors, [], 'Documentation browser errors')
  console.log(
    `✓ ${engine}: actual React/Vue demos match at mobile/desktop sizes; framework navigation preserves the document, shell, scroll, focus, history, and Copy behavior`,
  )
} finally {
  await browser?.close()
  await server.stop()
}
