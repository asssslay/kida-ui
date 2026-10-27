import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import base from './vitest.config.js'

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    // Include responsive geometry, but keep stored screenshots on canonical Chromium only.
    exclude: ['src/**/*.visual.test.{ts,tsx}'],
    fileParallelism: false,
    browser: {
      ...base.test?.browser,
      // Fit the test iframe without fractional scaling or clipping the viewport-entry fixture.
      provider: playwright({ contextOptions: { viewport: { width: 1440, height: 1000 } } }),
      instances: [{ browser: 'firefox' }, { browser: 'webkit' }],
    },
  },
})
