import { expect, test } from 'vitest'
import { serverMarkup, withServerEntry } from './server-fixture.js'

test('built package renders deterministically in Node without browser globals', async () => {
  expect(typeof window).toBe('undefined')
  const first = await serverMarkup(true)
  expect(await serverMarkup(true)).toBe(first)
  expect(first).toContain('translate3d(0px, 8px, 0) scale(1)')
  expect(first).not.toContain('undefined')
  expect(first).toContain('Reveal content')
  expect(first).toContain('Collapse content')
  expect(first).toContain('data-skip-animation')
  expect(first).toContain('data-kida-text-bloom')
  expect(first).toContain('data-kida-magnetic')
  expect(first).toContain('Magnetic action')
  expect(first).toContain('data-kida-photo-pile')
  expect(first.match(/data-kida-photo-item/g)).toHaveLength(3)
  expect(first).toContain('data-kida-scribble')
  expect(first).toContain('data-kida-sticker-burst')
  expect(first).toContain('data-kida-image-text')
  expect(first).toContain('--kida-image-text-image')
  expect(first).toContain('Image text content')
  expect(first).toContain('data-kida-space-type')
  expect(first).toContain('>Space type content</span>')
  expect(first).toContain('data-kida-glow')
  expect(first.match(/data-kida-glow-content/g)).toHaveLength(1)
  expect(first).toContain('data-kida-dual-wave')
  expect(first).toContain('Item 2 of 3: Project 2, Studio 2.')
  expect(first).toContain('aria-hidden="true"')
  expect(await serverMarkup(false)).not.toContain('Collapse content')
})

test('server output preserves explicit zero and false Reveal options', async () => {
  expect(await withServerEntry((entry) => entry.revealMarkup())).toContain(
    'translate3d(0px, 0px, 0) scale(1)',
  )
})

test('initially closed Collapse does not call its exit callback during SSR', async () => {
  expect(await withServerEntry((entry) => entry.closedCollapseExits())).toBe(0)
})
