import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import base from './vitest.config.js'

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    browser: {
      ...base.test?.browser,
      provider: playwright({ contextOptions: { viewport: { width: 1440, height: 1000 } } }),
      instances: [
        { browser: 'firefox' },
        { browser: 'webkit' },
        {
          browser: 'webkit',
          name: 'webkit-touch',
          include: ['test/input.touch.test.ts'],
          viewport: { width: 390, height: 844 },
          provider: playwright({ contextOptions: { hasTouch: true, isMobile: true } }),
        },
      ],
    },
  },
})
