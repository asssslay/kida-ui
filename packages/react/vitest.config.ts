import { existsSync } from 'node:fs'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { defineConfig } from 'vitest/config'

/**
 * These components are only meaningful in a browser: they depend on layout, on
 * `IntersectionObserver`, on `ResizeObserver` and on real CSS animations. jsdom has none
 * of those, so a passing jsdom test here would prove nothing.
 */

// Playwright no longer ships a bundled Chromium for macOS 13, where `playwright install`
// refuses outright. Falling back to the system Chrome keeps the suite runnable on those
// machines; anywhere the bundled build exists — CI included — it is used as normal.
const bundled = (() => {
  try {
    return chromium.executablePath()
  } catch {
    return undefined
  }
})()
const channel = bundled && existsSync(bundled) ? undefined : 'chrome'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel } }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
