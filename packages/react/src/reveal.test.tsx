import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { Reveal } from './reveal.js'

/** Tall enough that the reveal starts well below the fold whatever the window size. */
function Offscreen({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div style={{ height: '150vh' }} />
      {children}
      <div style={{ height: '150vh' }} />
    </>
  )
}

/** The rendered root. A missing node is a failure whichever assertion comes next. */
function node() {
  const el = document.querySelector<HTMLElement>('[data-kida-reveal]')
  if (!el) throw new Error('no [data-kida-reveal] element is mounted')
  return el
}

test('stays hidden until it is scrolled into view, then settles visible', async () => {
  await render(
    <Offscreen>
      <Reveal duration={0.12}>content</Reveal>
    </Offscreen>,
  )

  const el = node()
  expect(getComputedStyle(el).opacity).toBe('0')

  el.scrollIntoView()
  await expect.poll(() => getComputedStyle(el).opacity).toBe('1')

  // `transform: none` and not an identity matrix, so the element does not become a
  // containing block for fixed-position descendants once it has settled.
  await expect.poll(() => getComputedStyle(el).transform).toBe('none')
  // Guards the regression where animating to the keyword `none` committed
  // `matrix(0, 0, 0, 0, 0, 0)` and collapsed the element to nothing.
  expect(el.getBoundingClientRect().width).toBeGreaterThan(0)
  expect(el.getBoundingClientRect().height).toBeGreaterThan(0)
})

test('the pre-animation transform reflects the options', async () => {
  await render(
    <Offscreen>
      <Reveal x={-32} y={0} scale={0.9}>
        content
      </Reveal>
    </Offscreen>,
  )

  expect(getComputedStyle(node()).transform).toBe('matrix(0.9, 0, 0, 0.9, -32, 0)')
})

test('once: false re-hides on exit and animates again on re-entry', async () => {
  await render(
    <Offscreen>
      <Reveal once={false} duration={0.4}>
        content
      </Reveal>
    </Offscreen>,
  )

  const el = node()
  el.scrollIntoView()
  await expect.poll(() => getComputedStyle(el).opacity).toBe('1')

  window.scrollTo(0, 0)
  await expect.poll(() => getComputedStyle(el).opacity).toBe('0')

  el.scrollIntoView()
  // Not just "ends up visible" — it has to actually animate. The engine caches the last
  // value it animated an element to, and would otherwise resolve the second pass
  // instantly, landing on opacity 1 without a single frame of motion.
  await expect.poll(() => el.getAnimations().length, { interval: 10 }).toBeGreaterThan(0)
  await expect.poll(() => getComputedStyle(el).opacity).toBe('1')
})
