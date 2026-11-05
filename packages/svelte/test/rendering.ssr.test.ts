import { expect, test } from 'vitest'
import { serverMarkup } from './server-fixture.js'

test('built package renders deterministically in Node without browser globals', async () => {
  expect(typeof window).toBe('undefined')
  const first = await serverMarkup()
  expect(await serverMarkup()).toBe(first)
  expect(first).toContain('translate3d(0px, 8px, 0) scale(1)')
  expect(first).not.toContain('undefined')
  expect(first).toContain('Reveal content')
  expect(first).toContain('data-kida-reveal')
  expect(first).toContain('data-kida-magnetic')
  expect(first).toContain('Magnetic action')
})
