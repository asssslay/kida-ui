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
          // CI on pinned Ubuntu is authoritative. Omitting the host platform keeps local runs
          // useful for review instead of creating a second baseline set for every workstation.
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
