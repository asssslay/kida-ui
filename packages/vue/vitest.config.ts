import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { defineConfig } from 'vitest/config'
import { serverMarkup } from './test/server-fixture.js'

const channel = existsSync(chromium.executablePath()) ? undefined : 'chrome'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: [
      'vue',
      '@zag-js/vue',
      '@zag-js/presence',
      '@kida-ui/motion > motion',
      'react-dom/client',
    ],
    exclude: ['@kida-ui/vue'],
  },
  test: {
    include: ['test/**/*.browser.test.ts'],
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      // Keep both parity viewports at 1:1 CSS scale inside Vitest's iframe.
      provider: playwright({
        // Software rasterization avoids GPU shadow dithering between the two captures.
        launchOptions: { channel, args: ['--disable-gpu'] },
        contextOptions: { viewport: { width: 1440, height: 1000 } },
      }),
      instances: [{ browser: 'chromium' }],
      commands: {
        touchTap: async ({ iframe }, selector: string) => {
          await iframe.locator(selector).tap()
        },
        setReducedMotion: async ({ page }, reduced: boolean) => {
          await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        },
        serverMarkup: async (_, open: boolean) => serverMarkup(open),
        compareAdapters: async ({ iframe, project }) => {
          const options = { animations: 'disabled', caret: 'hide', scale: 'css' } as const
          const reactRoot = iframe.locator('[data-parity="react"]')
          const vueRoot = iframe.locator('[data-parity="vue"]')
          // Hide the other adapter with opacity: engines write `visibility: visible` on nodes
          // (DualWave rows, GlowHighlight layers), which would show through a hidden ancestor.
          await vueRoot.evaluate((node) => {
            node.style.opacity = '0'
          })
          const react = await reactRoot.screenshot(options)
          await vueRoot.evaluate((node) => {
            node.style.opacity = ''
          })
          await reactRoot.evaluate((node) => {
            node.style.opacity = '0'
          })
          const vue = await vueRoot.screenshot(options)
          const reactPixels = PNG.sync.read(react)
          const vuePixels = PNG.sync.read(vue)
          const bounds = await reactRoot.evaluate((node) => ({
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
          }))
          if (
            reactPixels.width !== Math.round(bounds.width) ||
            reactPixels.height !== Math.round(bounds.height)
          ) {
            throw new Error(
              'Adapter parity requires a 1:1 CSS-pixel capture; check the host viewport.',
            )
          }
          const equal =
            reactPixels.width === vuePixels.width &&
            reactPixels.height === vuePixels.height &&
            reactPixels.data.equals(vuePixels.data)
          if (!equal) {
            // Keep artifacts from parallel engines and viewport cases separate.
            const width = await iframe
              .locator('[data-parity="react"]')
              .evaluate((node) => node.getBoundingClientRect().width)
            const directory = `.vitest-attachments/parity/${project.name}-${width}`
            await mkdir(directory, { recursive: true })
            await writeFile(`${directory}/react.png`, react)
            await writeFile(`${directory}/vue.png`, vue)
            const geometry = await iframe.locator('[data-parity]').evaluateAll((roots) =>
              roots.map((root) => ({
                adapter: root.getAttribute('data-parity'),
                nodes: [
                  ...root.querySelectorAll(
                    '[data-kida-magnetic], [data-kida-photo-pile], [data-kida-photo-stage], [data-kida-photo-item], [data-kida-photo-card], img, [data-kida-scribble]',
                  ),
                ].map((node) => ({
                  tag: node.tagName,
                  html: node.outerHTML.slice(0, 180),
                  bounds: node.getBoundingClientRect().toJSON(),
                  style: (node as HTMLElement).style.cssText,
                  height: getComputedStyle(node).height,
                })),
              })),
            )
            await writeFile(`${directory}/geometry.json`, JSON.stringify(geometry, null, 2))
          }
          return equal
        },
      },
    },
  },
})
