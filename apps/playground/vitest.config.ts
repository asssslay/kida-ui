import { existsSync } from 'node:fs'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

/**
 * ImageText tests run in a real browser for CSS background animation,
 * image decoding, ResizeObserver, and IntersectionObserver.
 */

// Same fallback as @kida-ui/react: macOS 13 has no bundled Chromium, so use system Chrome.
const bundled = (() => {
  try {
    return chromium.executablePath()
  } catch {
    return undefined
  }
})()
const channel = bundled && existsSync(bundled) ? undefined : 'chrome'

export default mergeConfig(
  viteConfig,
  defineConfig({
    optimizeDeps: { include: ['react-dom/client'] },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({ launchOptions: { channel } }),
        instances: [{ browser: 'chromium' }],
        commands: {
          setReducedMotion: async ({ page }, reduced: boolean) => {
            await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
          },
        },
      },
    },
  }),
)
