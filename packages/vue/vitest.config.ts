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
      provider: playwright({ launchOptions: { channel } }),
      instances: [{ browser: 'chromium' }],
      commands: {
        setReducedMotion: async ({ page }, reduced: boolean) => {
          await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        },
        serverMarkup: async (_, open: boolean) => serverMarkup(open),
        compareAdapters: async ({ iframe }) => {
          const options = { animations: 'disabled', caret: 'hide', scale: 'css' } as const
          const reactRoot = iframe.locator('[data-parity="react"]')
          const vueRoot = iframe.locator('[data-parity="vue"]')
          await vueRoot.evaluate((node) => {
            node.style.visibility = 'hidden'
          })
          const react = await reactRoot.screenshot(options)
          await vueRoot.evaluate((node) => {
            node.style.visibility = 'visible'
          })
          await reactRoot.evaluate((node) => {
            node.style.visibility = 'hidden'
          })
          const vue = await vueRoot.screenshot(options)
          const equal = PNG.sync.read(react).data.equals(PNG.sync.read(vue).data)
          if (!equal) {
            await mkdir('.vitest-attachments/parity', { recursive: true })
            await writeFile('.vitest-attachments/parity/react.png', react)
            await writeFile('.vitest-attachments/parity/vue.png', vue)
          }
          return equal
        },
      },
    },
  },
})
