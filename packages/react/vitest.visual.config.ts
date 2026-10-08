import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { defineConfig } from 'vitest/config'

const bundled = (() => {
  try {
    return chromium.executablePath()
  } catch {
    return undefined
  }
})()
const channel = bundled && existsSync(bundled) ? undefined : 'chrome'

const updatingSnapshots = process.argv.some(
  (argument) => argument === '-u' || argument === '--update' || argument.startsWith('--update='),
)
if (updatingSnapshots && process.platform !== 'linux') {
  throw new Error(
    'Visual baselines must be updated in the canonical Ubuntu 24.04 / bundled Chromium environment. See docs/VISUAL_TESTING.md.',
  )
}

export default defineConfig({
  test: {
    include: ['src/**/*.visual.test.{ts,tsx}', 'src/responsive.test.tsx'],
    // Viewport is a browser-page setting. Run files sequentially so one fixture cannot resize
    // another fixture while it is measuring layout or capturing a baseline.
    fileParallelism: false,
    attachmentsDir: '.vitest-attachments/visual',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel } }),
      instances: [{ browser: 'chromium' }],
      screenshotDirectory: '__visual_snapshots__',
      screenshotFailures: false,
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            allowedMismatchedPixelRatio: 0.01,
            threshold: 0.15,
          },
          screenshotOptions: {
            animations: 'disabled',
            caret: 'hide',
            scale: 'css',
          },
          // These shared references are rendered on Ubuntu. Other hosts may produce text
          // differences; the update guard above prevents replacing the CI references locally.
          resolveScreenshotPath: ({ arg, browserName, ext, root, testFileName }) =>
            resolve(root, 'src/__visual_snapshots__', testFileName, `${arg}-${browserName}${ext}`),
        },
      },
      commands: {
        setReducedMotion: async ({ page }, reduced: boolean) => {
          await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
        },
      },
    },
  },
})
