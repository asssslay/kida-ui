import { existsSync } from 'node:fs'
import { playwright } from '@vitest/browser-playwright'
import { chromium } from 'playwright'
import { defineConfig } from 'vitest/config'
import base from './vitest.config.js'

const channel = existsSync(chromium.executablePath()) ? undefined : 'chrome'

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/**/*.touch.test.ts'],
    browser: {
      ...base.test?.browser,
      viewport: { width: 390, height: 844 },
      provider: playwright({
        launchOptions: { channel },
        contextOptions: { hasTouch: true, isMobile: true },
      }),
      instances: [{ browser: 'chromium', name: 'chromium-touch' }],
      commands: {
        ...base.test?.browser?.commands,
        touchDrag: async ({ page, iframe }, selector: string, cancel: boolean) => {
          const target = iframe.locator(selector)
          await target.scrollIntoViewIfNeeded()
          const bounds = await target.boundingBox()
          if (!bounds) throw new Error('Touch target has no bounds')
          const session = await page.context().newCDPSession(page)
          const origin = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
          let active = false
          try {
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ ...origin, id: 1 }],
            })
            active = true
            for (let step = 1; step <= 6; step++) {
              await session.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: origin.x + step * 12, y: origin.y + step * 6, id: 1 }],
              })
              await target.evaluate(
                () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
              )
            }
            const moving = await target.evaluate((node) => {
              const card = node.querySelector('[data-kida-photo-card]')
              if (!card) throw new Error('Photo card is missing')
              const matrix = new DOMMatrix(getComputedStyle(card).transform)
              return { dragging: node.hasAttribute('data-dragging'), x: matrix.m41, y: matrix.m42 }
            })
            await session.send('Input.dispatchTouchEvent', {
              type: cancel ? 'touchCancel' : 'touchEnd',
              touchPoints: [],
            })
            active = false
            return moving
          } finally {
            if (active)
              await session.send('Input.dispatchTouchEvent', {
                type: 'touchCancel',
                touchPoints: [],
              })
            await session.detach()
          }
        },
      },
    },
  },
})
