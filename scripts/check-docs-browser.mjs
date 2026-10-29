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
  'space-type',
  'glow-highlight',
  'image-text',
  'dual-wave',
]
// The first live demo on each page; playground pages have no basic demo.
const primaryDemo = (name) =>
  ({
    'space-type': 'space-type-playground',
    'glow-highlight': 'glow-highlight-playground',
    'dual-wave': 'dual-wave-playground',
  })[name] ?? `${name}-basic`
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
  let documentRequests = 0
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++
  })

  async function open(path) {
    if (page.url().startsWith(origin))
      await page.evaluate(() => localStorage.removeItem('kida-ui:framework'))
    const response = await page.goto(`${origin}${path}`)
    assert([200, 304].includes(response?.status()), `${path}: HTTP ${response?.status()}`)
    await page.waitForFunction(
      () => !!document.querySelector('[data-framework-choice]:not(:disabled)'),
    )
    await page.waitForURL(`${origin}${path.replace('/docs/vue/', '/docs/')}`)
  }

  async function switchTo(framework) {
    const url = page.url()
    const historyLength = await page.evaluate(() => history.length)
    const requests = documentRequests
    const button = page.locator(`[data-framework-choice="${framework}"]`)
    await button.focus()
    await button.click()
    await page.waitForFunction(
      (framework) =>
        document.querySelector('[data-framework-content]')?.getAttribute('data-framework') ===
          framework &&
        !document.querySelector('[data-framework-content]')?.hasAttribute('aria-busy'),
      framework,
    )
    assert.equal(await button.getAttribute('aria-pressed'), 'true')
    assert.equal(page.url(), url, 'Framework selection changed the URL')
    assert.equal(
      await page.evaluate(() => history.length),
      historyLength,
      'Framework selection added a history entry',
    )
    assert.equal(documentRequests, requests, 'Framework selection requested another document')
  }

  async function hydrated(name) {
    const stage = page.locator(`[data-demo="${name}"] .demo-stage`)
    await stage.scrollIntoViewIfNeeded()
    try {
      await page.waitForFunction((name) => {
        const islands = [...document.querySelectorAll(`[data-demo="${name}"] astro-island`)]
        return islands.length > 0 && islands.every((island) => !island.hasAttribute('ssr'))
      }, name)
    } catch (error) {
      console.error(
        await page.evaluate(() => ({
          url: location.href,
          defined: !!customElements.get('astro-island'),
          directives: Object.keys(window.Astro ?? {}),
          islands: [...document.querySelectorAll('astro-island')].map((node) => ({
            ssr: node.hasAttribute('ssr'),
            component: node.getAttribute('component-url'),
            bounds: node.getBoundingClientRect().toJSON(),
            client: node.getAttribute('client'),
          })),
          scripts: [...document.querySelectorAll('script')].map((node) => ({
            type: node.type,
            src: node.src,
            start: node.textContent.slice(0, 80),
          })),
        })),
      )
      throw error
    }
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
            // Unrendered nodes such as SVG filter definitions report an all-zero rect; keep it
            // zero rather than offsetting it by the stage's page position.
            bounds:
              rect.left || rect.top || rect.width || rect.height
                ? [rect.left - origin.left, rect.top - origin.top, rect.width, rect.height]
                : [0, 0, 0, 0],
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
        window.__docsDocument = document
        window.__docsHeader = document.querySelector('.docs-prose-head')
        window.__docsStages = [...document.querySelectorAll('.demo-stage')]
        window.__docsIslands = [...document.querySelectorAll('astro-island')]
        window.__docsHydrates = 0
        document.addEventListener('astro:hydrate', () => window.__docsHydrates++, true)
      })
      await switchTo('vue')
      assert(
        await page.evaluate(
          () =>
            window.__docsDocument === document &&
            window.__docsHeader === document.querySelector('.docs-prose-head'),
        ),
      )
      assert(
        await page.evaluate(
          () =>
            window.__docsStages.every(
              (stage, index) => stage === document.querySelectorAll('.demo-stage')[index],
            ) && window.__docsIslands.every((island) => island.isConnected),
        ),
      )
      assert.equal(await page.locator('[data-distribution]').getAttribute('data-framework'), 'vue')
      assert(
        (await page.locator('[data-framework-article]').innerText()).includes('shadcn-vue@2.8.2'),
      )
      assert(
        !(await page.locator('[data-framework-article]').innerText()).includes(
          'npx shadcn@latest add',
        ),
      )
      for (const demo of demoNames)
        await compare(demo, width, reactDemos.get(demo), await capture(demo))
      await switchTo('react')
      assert.equal(
        await page.evaluate(() => window.__docsHydrates),
        0,
        'Framework selection rehydrated a live preview',
      )
      assert(
        await page.evaluate(() =>
          [...document.querySelectorAll('[id]')].every(
            (node, index, all) => all.findIndex((candidate) => candidate.id === node.id) === index,
          ),
        ),
        'Duplicate active IDs',
      )

      // The compatibility entry renders the real Vue adapter initially. Compare it
      // independently; selecting Vue on the canonical page deliberately keeps the live preview.
      await open(`/docs/vue/${name}`)
      assert.deepEqual(
        await page
          .locator('.demo[data-demo]')
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.demo)),
        demoNames,
      )
      for (const demo of demoNames)
        await compare(demo, width, reactDemos.get(demo), await capture(demo))
      if (name === 'reveal') {
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
        assert.deepEqual(states[0], states[1], 'Reveal initial geometry differs by framework')
      }
      if (name === 'collapse') {
        await page.locator('[data-demo="collapse-basic"] button').click()
        await page.waitForFunction(() => !!document.querySelector('[data-kida-collapse]'))
        const expandedVue = await capture(basic)
        await open('/docs/collapse')
        await hydrated(basic)
        await page.locator('[data-demo="collapse-basic"] button').click()
        await page.waitForFunction(() => !!document.querySelector('[data-kida-collapse]'))
        await compare('collapse-expanded', width, await capture(basic), expandedVue)
      }
    }
  }

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open('/docs/collapse')
  await hydrated('collapse-basic')
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-demo="collapse-basic"] button')
        ?.getAttribute('aria-expanded') === 'true',
  )
  await page.evaluate(() => {
    window.__openPanel = document.querySelector('[data-kida-collapse]')
    window.__previewButton = document.querySelector('[data-demo="collapse-basic"] button')
    window.__retainedDocument = document
    window.__stateHydrates = 0
    document.addEventListener('astro:hydrate', () => window.__stateHydrates++, true)
    window.scrollTo({ top: 140, behavior: 'instant' })
  })
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const framework of ['vue', 'react']) {
      await switchTo(framework)
      assert.equal(await page.evaluate(() => window.scrollY), 140)
      assert(
        await page.evaluate(
          () =>
            window.__openPanel === document.querySelector('[data-kida-collapse]') &&
            window.__previewButton ===
              document.querySelector('[data-demo="collapse-basic"] button'),
        ),
      )
      assert.equal(
        await page.locator('[data-demo="collapse-basic"] button').getAttribute('aria-expanded'),
        'true',
      )
    }
  }
  assert.equal(await page.evaluate(() => window.__stateHydrates), 0)
  await switchTo('vue')
  assert.equal(
    await page.locator('[data-framework-choice]:focus').getAttribute('data-framework-choice'),
    'vue',
  )
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
  await page.waitForFunction(() => window.__copiedDocsText.includes('shadcn-vue'))
  assert.equal(await page.locator('[data-copy]').first().textContent(), 'Copied')
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(() => !document.querySelector('[data-kida-collapse]'))
  assert(await page.evaluate(() => window.__retainedDocument === document))

  // Preference survives ordinary page navigation and refresh, without framework routes.
  await page.locator('.sidebar a[href="/docs/text-bloom"]').click()
  await page.waitForURL(`${origin}/docs/text-bloom`)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-framework-content]')?.getAttribute('data-framework') === 'vue',
  )
  assert(
    (await page.locator('[data-framework-article] table').first().innerText()).includes('text'),
  )
  await page.reload()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-framework-choice="vue"]')?.getAttribute('aria-pressed') ===
      'true',
  )
  await page.locator('[data-framework-choice="react"]').focus()
  await page.keyboard.press('Space')
  assert.equal(
    await page.locator('[data-framework-choice="react"]').getAttribute('aria-pressed'),
    'true',
  )
  await page.locator('[data-framework-choice="vue"]').focus()
  await page.keyboard.press('Enter')
  assert.equal(
    await page.locator('[data-framework-choice="vue"]').getAttribute('aria-pressed'),
    'true',
  )
  assert.equal(page.url(), `${origin}/docs/text-bloom`)
  assert(
    await page.evaluate(() =>
      [...document.querySelectorAll('.toc a')].every((link) =>
        document.getElementById(link.hash.slice(1)),
      ),
    ),
  )
  await page.locator('.sidebar a[href="/docs/installation"]').click()
  await page.waitForURL(`${origin}/docs/installation`)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-framework-content]')?.getAttribute('data-framework') === 'vue',
  )
  assert((await page.locator('[data-framework-article]').innerText()).includes('vue-ts'))
  await switchTo('react')
  assert(!(await page.locator('[data-framework-article]').innerText()).includes('vue-ts'))

  // Keep an active drag and the photo's focus, not just settled markup. Trigger
  // the selector without releasing the pointer, as a keyboard/assistive action can.
  await open('/docs/photo-pile')
  await hydrated('photo-pile-basic')
  const photo = page.locator('[data-demo="photo-pile-basic"] [data-kida-photo-item]').last()
  await photo.scrollIntoViewIfNeeded()
  await photo.focus()
  const bounds = await photo.boundingBox()
  assert(bounds, 'Missing draggable photo')
  const pointer = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(pointer.x, pointer.y)
  await page.mouse.down()
  await page.mouse.move(pointer.x + 40, pointer.y + 20)
  await page.waitForFunction(() =>
    document
      .querySelector('[data-kida-photo-item][data-dragging] [data-kida-photo-card]')
      ?.style.transform.includes('40px'),
  )
  await page.evaluate(() => {
    window.__draggedPhoto = document.querySelector('[data-kida-photo-item][data-dragging]')
    window.__draggedCard = window.__draggedPhoto.querySelector('[data-kida-photo-card]')
    window.__draggedTransform = window.__draggedCard.style.transform
    document.querySelector('[data-framework-choice="vue"]').click()
  })
  await page.waitForFunction(
    () => document.querySelector('[data-framework-content]')?.dataset.framework === 'vue',
  )
  assert(
    await page.evaluate(
      () =>
        window.__draggedPhoto === document.querySelector('[data-kida-photo-item][data-dragging]') &&
        window.__draggedPhoto === document.activeElement &&
        window.__draggedCard.style.transform === window.__draggedTransform,
    ),
    'Framework selection interrupted the drag or lost photo focus',
  )
  await page.mouse.move(pointer.x + 56, pointer.y + 32)
  await page.waitForFunction(() => window.__draggedCard.style.transform.includes('56px'))
  await page.mouse.up()
  await page.waitForFunction(
    () =>
      window.__draggedCard.style.transform === 'none' &&
      !window.__draggedPhoto.hasAttribute('data-dragging'),
  )

  // A failed request leaves the current docs and open demo usable, and retrying
  // the same choice loads it normally rather than caching the failure.
  await open('/docs/collapse')
  await hydrated('collapse-basic')
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(() => !!document.querySelector('[data-kida-collapse]'))
  const vueURL = `${origin}/docs/vue/collapse`
  await page.route(vueURL, (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.locator('[data-framework-choice="vue"]').click()
  await page.waitForFunction(() =>
    document.querySelector('[data-framework-status]')?.textContent.includes('Could not load'),
  )
  assert.equal(
    await page.locator('[data-framework-choice="react"]').getAttribute('aria-pressed'),
    'true',
  )
  assert.equal(
    await page.locator('[data-demo="collapse-basic"] button').getAttribute('aria-expanded'),
    'true',
  )
  assert.equal(page.url(), `${origin}/docs/collapse`)
  await page.unroute(vueURL)
  await switchTo('vue')
  assert.equal(
    await page.locator('[data-demo="collapse-basic"] button').getAttribute('aria-expanded'),
    'true',
  )

  // Selecting React while Vue is loading must win even if the old response
  // arrives later. No framework request is a document navigation.
  await open('/docs/collapse')
  let release
  const held = new Promise((resolve) => {
    release = resolve
  })
  await page.route(vueURL, async (route) => {
    await held
    await route.continue()
  })
  await page.locator('[data-framework-choice="vue"]').click()
  await page.waitForFunction(() =>
    document.querySelector('[data-framework-content]')?.hasAttribute('aria-busy'),
  )
  await switchTo('react')
  const response = page.waitForResponse(vueURL)
  release()
  await (await response).finished()
  await page.evaluate(() => new Promise(requestAnimationFrame))
  assert.equal(
    await page.locator('[data-framework-content]').getAttribute('data-framework'),
    'react',
  )
  assert.equal(
    await page.locator('[data-framework-choice="react"]').getAttribute('aria-pressed'),
    'true',
  )
  await page.unroute(vueURL)
  await switchTo('vue')

  // The selected framework and navigation shell must never flash back to the
  // server's React default while moving between component pages.
  await page.evaluate(() => {
    window.__navigationDocument = document
    window.__navigationHeader = document.querySelector('.site-header')
    window.__navigationSidebar = document.querySelector('.sidebar')
    window.__navigationSwitcher = document.querySelector('.framework-switcher')
    window.__shellNodes = new Map(
      [
        'html',
        'head',
        'body',
        '.skip-link',
        '.site-header',
        '.site-header .wordmark',
        '.site-nav',
        '.docs',
        '.sidebar',
        '.sidebar h2',
        '.sidebar ul',
        'main.prose',
        '.docs-prose-head',
        '.docs-prose-head h1',
        '.docs-prose-head .lede',
        '.framework-switcher',
        '[data-framework-choice="react"]',
        '[data-framework-choice="vue"]',
        '.framework-preview-note',
        '[data-framework-status]',
        '[data-framework-content]',
        '[data-framework-article]',
        '.toc',
        '.toc h2',
        '.toc ul',
        '.site-footer',
      ].map((selector) => [selector, document.querySelector(selector)]),
    )
    window.__shellRemovals = []
    window.__shellObserver = new MutationObserver((records) => {
      for (const record of records)
        for (const removed of record.removedNodes) {
          for (const [selector, node] of window.__shellNodes) {
            if (removed === node || removed.contains(node)) window.__shellRemovals.push(selector)
          }
        }
    })
    window.__shellObserver.observe(document.documentElement, { subtree: true, childList: true })
    window.__navigationFrames = []
    window.__samplingNavigation = true
    const sample = () => {
      if (!window.__samplingNavigation) return
      window.__navigationFrames.push({
        url: location.pathname,
        framework: document.querySelector('[data-framework-choice][aria-pressed="true"]')?.dataset
          .frameworkChoice,
        shellStable: [...window.__shellNodes].every(
          ([selector, node]) => node?.isConnected && node === document.querySelector(selector),
        ),
        transitionTargets: [
          ...new Set(
            document
              .getAnimations()
              .map((animation) => animation.effect?.pseudoElement)
              .filter((pseudo) => pseudo?.startsWith('::view-transition'))
              .map((pseudo) => pseudo.match(/\(([^)]*)\)/)?.[1] ?? ''),
          ),
        ],
      })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  const navigationRequests = documentRequests
  async function sidebar(name, framework = 'vue') {
    await page.locator(`.sidebar a[href="/docs/${name}"]`).click()
    await page.waitForURL(`${origin}/docs/${name}`)
    await page.waitForFunction(
      ({ name, framework }) =>
        document.querySelector('.framework-switcher')?.getAttribute('data-framework-page') ===
          name &&
        document.querySelector('[data-framework-content]')?.getAttribute('data-framework') ===
          framework,
      { name, framework },
    )
    assert(
      await page.evaluate(
        () =>
          window.__navigationDocument === document &&
          window.__navigationHeader === document.querySelector('.site-header') &&
          window.__navigationSidebar === document.querySelector('.sidebar') &&
          window.__navigationSwitcher === document.querySelector('.framework-switcher'),
      ),
      'Sidebar navigation replaced the document or navigation controls',
    )
    assert.equal(
      await page.locator('.sidebar a[aria-current="page"]').getAttribute('href'),
      `/docs/${name}`,
    )
    assert.equal(
      await page.locator(`[data-framework-choice="${framework}"]`).getAttribute('aria-pressed'),
      'true',
    )
    assert.equal(await page.locator('[data-framework-status]').textContent(), '')
    assert(
      (await page.locator('.astro-route-announcer').count()) <= 1,
      'Route announcers accumulated in the persistent body',
    )
    assert.equal(
      await page.locator('.framework-preview-note').evaluate((node) => node.hidden),
      name === 'installation' ||
        (await page.locator(`.sidebar a[href="/docs/${name}"]`).getAttribute('data-frameworks')) ===
          'react',
    )
    assert.equal(await page.title(), `${await page.locator('h1').textContent()} — Kida UI`)
    assert(
      await page.evaluate(() =>
        [...window.__shellNodes].every(
          ([selector, node]) => node?.isConnected && node === document.querySelector(selector),
        ),
      ),
      'A route change replaced part of the persistent page shell',
    )
  }

  // Hold the next Vue document to make the original flicker easy to reproduce.
  // Keep the old page visible until the selected framework's new page is ready.
  let releaseNavigation
  let navigationStarted
  const navigationHeld = new Promise((resolve) => {
    releaseNavigation = resolve
  })
  const navigationRequested = new Promise((resolve) => {
    navigationStarted = resolve
  })
  const delayedURL = `${origin}/docs/vue/photo-pile`
  await page.route(delayedURL, async (route) => {
    navigationStarted()
    await navigationHeld
    await route.continue()
  })
  await page.locator('.sidebar a[href="/docs/photo-pile"]').click()
  await navigationRequested
  assert.equal(page.url(), `${origin}/docs/collapse`)
  assert.equal(await page.locator('h1').textContent(), 'Collapse')
  assert.equal(
    await page.locator('[data-framework-choice="vue"]').getAttribute('aria-pressed'),
    'true',
  )
  releaseNavigation()
  await page.waitForURL(`${origin}/docs/photo-pile`)
  await hydrated('photo-pile-basic')
  await page.unroute(delayedURL)
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const name of [...components, 'installation']) {
      await sidebar(name)
      if (name !== 'installation') await hydrated(primaryDemo(name))
      else assert((await page.locator('[data-framework-article]').innerText()).includes('vue-ts'))
    }
  }
  await sidebar('collapse')
  await hydrated('collapse-basic')
  await page.locator('[data-demo="collapse-basic"] button').click()
  await page.waitForFunction(() => !!document.querySelector('[data-kida-collapse]'))
  await page.evaluate(() => {
    window.__samePagePanel = document.querySelector('[data-kida-collapse]')
  })
  await sidebar('collapse')
  assert(
    await page.evaluate(
      () => window.__samePagePanel === document.querySelector('[data-kida-collapse]'),
    ),
    'Clicking the current sidebar item reset the preview',
  )
  await page.locator('.toc a').first().click()
  await page.waitForURL(/\/docs\/collapse#.+/)
  await page.locator('.sidebar a[href="/docs/collapse"]').click()
  await page.waitForTimeout(500)
  assert(
    await page.evaluate(
      () => window.__samePagePanel === document.querySelector('[data-kida-collapse]'),
    ),
    'Clicking the current sidebar item from a section anchor reset the preview',
  )

  await page.evaluate(() => {
    window.__centerIslands = [...document.querySelectorAll('[data-framework-article] astro-island')]
    window.__centerUnmounts = 0
    for (const island of window.__centerIslands) {
      island.addEventListener(
        'astro:unmount',
        () => {
          window.__centerUnmounts++
        },
        { once: true },
      )
    }
  })
  await sidebar('text-bloom')
  await page.waitForFunction(
    () =>
      window.__centerIslands.length > 0 &&
      window.__centerUnmounts === window.__centerIslands.length,
  )
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: 'instant' }))
  await sidebar('collapse')
  await page.goBack()
  await page.waitForURL(`${origin}/docs/text-bloom`)
  await page.waitForFunction(() => window.scrollY === 180)
  await page.goForward()
  await page.waitForURL(`${origin}/docs/collapse`)
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goBack()
    await page.waitForFunction(
      () =>
        document.querySelector('.framework-switcher')?.getAttribute('data-framework-page') ===
        'text-bloom',
    )
    await page.goForward()
    await page.waitForFunction(
      () =>
        document.querySelector('.framework-switcher')?.getAttribute('data-framework-page') ===
        'collapse',
    )
  }
  assert.equal(
    documentRequests,
    navigationRequests,
    'Sidebar or history traversal reloaded the document',
  )
  const frames = await page.evaluate(() => {
    window.__samplingNavigation = false
    window.__shellObserver.disconnect()
    return window.__navigationFrames
  })
  assert(frames.length > 0)
  assert(
    frames.every((frame) => frame.framework === 'vue'),
    `Framework flashed during navigation: ${JSON.stringify(frames)}`,
  )
  assert(
    frames.every((frame) => frame.shellStable),
    'Navigation detached the persistent shell',
  )
  assert(
    frames.every((frame) => frame.transitionTargets.length === 0),
    `Navigation ran a page transition: ${JSON.stringify(frames)}`,
  )
  assert.deepEqual(
    await page.evaluate(() => window.__shellRemovals),
    [],
    'Navigation removed or reparented persistent shell nodes',
  )
  // The newest Vue adapters keep the saved Vue choice through sidebar and direct loads.
  async function savedVue(target) {
    assert(await target.locator('[data-framework-choice="vue"]').isVisible())
    assert.equal(
      await target.locator('[data-framework-choice="vue"]').getAttribute('aria-pressed'),
      'true',
    )
    assert.equal(await target.evaluate(() => localStorage.getItem('kida-ui:framework')), 'vue')
  }
  for (const [name, demo] of [
    ['image-text', 'image-text-basic'],
    ['space-type', 'space-type-playground'],
    ['glow-highlight', 'glow-highlight-playground'],
    ['dual-wave', 'dual-wave-playground'],
  ]) {
    await sidebar(name)
    await savedVue(page)
    await hydrated(demo)
  }
  const direct = await context.newPage()
  direct.on('pageerror', (error) => errors.push({ message: error.message, url: direct.url() }))
  const directResponse = await direct.goto(`${origin}/docs/space-type`)
  // Firefox can report the validated cache entry from the earlier visit as a 304.
  assert(
    [200, 304].includes(directResponse?.status()),
    `/docs/space-type: HTTP ${directResponse?.status()}`,
  )
  await direct.waitForFunction(
    () =>
      document.querySelector('[data-framework-content]')?.getAttribute('data-framework') ===
        'vue' && !document.documentElement.hasAttribute('data-framework-pending'),
  )
  await savedVue(direct)
  await direct.close()

  // With Vue saved, a direct load hides the server-rendered React text until the
  // Vue article replaces it, then lands on the requested section of the Vue text.
  const anchored = await context.newPage()
  anchored.on('pageerror', (error) => errors.push({ message: error.message, url: anchored.url() }))
  let releaseVue
  const vueHeld = new Promise((resolve) => {
    releaseVue = resolve
  })
  const heldVueURL = `${origin}/docs/vue/scribble-highlight`
  await anchored.route(heldVueURL, async (route) => {
    await vueHeld
    await route.continue()
  })
  await anchored.goto(`${origin}/docs/scribble-highlight#api`)
  await anchored.waitForFunction(() =>
    document.querySelector('[data-framework-content]')?.hasAttribute('aria-busy'),
  )
  const visibility = (selector) =>
    anchored.evaluate(
      (selector) => getComputedStyle(document.querySelector(selector)).visibility,
      selector,
    )
  assert.equal(
    await visibility('[data-framework-article] > :not([data-demo])'),
    'hidden',
    'React text showed before the saved Vue documentation',
  )
  assert.equal(await visibility('.toc ul'), 'hidden')
  assert.equal(await visibility('[data-demo] .demo-stage'), 'visible')
  releaseVue()
  await anchored.waitForFunction(
    () =>
      document.querySelector('[data-framework-content]')?.getAttribute('data-framework') ===
        'vue' && !document.documentElement.hasAttribute('data-framework-pending'),
  )
  assert.equal(await visibility('[data-framework-article] > :not([data-demo])'), 'visible')
  const landing = await anchored.evaluate(() => ({
    top: document.getElementById('api').getBoundingClientRect().top,
    padding: Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    bottom: scrollY + innerHeight >= document.documentElement.scrollHeight - 1,
  }))
  assert(
    Math.abs(landing.top - landing.padding) <= 2 || landing.bottom,
    `#api landed at ${landing.top}px instead of ${landing.padding}px`,
  )
  await anchored.close()
  await sidebar('collapse')
  assert(await page.locator('[data-framework-choice="vue"]').isVisible())
  await hydrated('collapse-basic')

  await switchTo('react')
  await sidebar('text-bloom', 'react')
  assert.equal(await page.locator('[data-distribution]').getAttribute('data-framework'), 'react')
  await switchTo('vue')
  assert(
    (await page.locator('[data-framework-article] table').first().innerText()).includes('text'),
  )
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.astro-route-announcer').length === 1 &&
      document.querySelector('.astro-route-announcer').textContent === document.title,
  )
  assert.deepEqual(errors, [], 'Documentation browser errors')
  console.log(
    `✓ ${engine}: matching React/Vue demos; framework selection preserves previews; sidebar/history navigation retains the shell and selected framework without a reload or React flash`,
  )
} finally {
  await browser?.close()
  await server.stop()
}
