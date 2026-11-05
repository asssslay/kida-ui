import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { defineConfig } from 'vitest/config'
import { serverMarkup } from './test/server-fixture.js'

const channel = existsSync(chromium.executablePath()) ? undefined : 'chrome'

export default defineConfig({
  plugins: [svelte({ configFile: false })],
  optimizeDeps: {
    include: ['@kida-ui/motion > motion', 'react-dom/client', 'axe-core'],
    exclude: ['@kida-ui/svelte'],
  },
  test: {
    include: ['test/**/*.browser.test.ts'],
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        // Software rasterization avoids GPU shadow dithering between the two captures.
        launchOptions: { channel, args: ['--disable-gpu'] },
        contextOptions: { viewport: { width: 1440, height: 1000 } },
      }),
      instances: [{ browser: 'chromium' }],
      commands: {
        setReducedMotion: async ({ page }, reduced: boolean) => {
          await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        },
        serverMarkup: async () => serverMarkup(),
        compareAdapters: async ({ iframe, project }) => {
          const options = { animations: 'disabled', caret: 'hide', scale: 'css' } as const
          const reactRoot = iframe.locator('[data-parity="react"]')
          const svelteRoot = iframe.locator('[data-parity="svelte"]')
          await svelteRoot.evaluate((node) => {
            node.style.opacity = '0'
          })
          const react = await reactRoot.screenshot(options)
          await svelteRoot.evaluate((node) => {
            node.style.opacity = ''
          })
          await reactRoot.evaluate((node) => {
            node.style.opacity = '0'
          })
          const svelteShot = await svelteRoot.screenshot(options)
          const reactPixels = PNG.sync.read(react)
          const sveltePixels = PNG.sync.read(svelteShot)
          const equal =
            reactPixels.width === sveltePixels.width &&
            reactPixels.height === sveltePixels.height &&
            reactPixels.data.equals(sveltePixels.data)
          if (!equal) {
            const directory = `.vitest-attachments/parity/${project.name}-${reactPixels.width}`
            await mkdir(directory, { recursive: true })
            await writeFile(`${directory}/react.png`, react)
            await writeFile(`${directory}/svelte.png`, svelteShot)
          }
          return equal
        },
      },
    },
  },
})
