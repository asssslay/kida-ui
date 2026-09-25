import '@kida-ui/styles/kida.css'
import { createRef } from 'react'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { Collapse } from './collapse.js'

/** The collapse root, or `null` when presence has unmounted it. */
const query = () => document.querySelector<HTMLElement>('[data-kida-collapse]')

/** The collapse root, asserted present — a missing node is a failure either way. */
function node() {
  const el = query()
  if (!el) throw new Error('no [data-kida-collapse] element is mounted')
  return el
}

const CONTENT = (
  <>
    <p style={{ margin: 0, lineHeight: '20px' }}>first line</p>
    <p style={{ margin: 0, lineHeight: '20px' }}>second line</p>
  </>
)

test('mounts on open and animates its height', async () => {
  const { rerender } = await render(<Collapse open={false}>{CONTENT}</Collapse>)
  expect(query()).toBe(null)

  await rerender(<Collapse open>{CONTENT}</Collapse>)

  const el = node()
  expect(el.dataset.state).toBe('open')
  expect(el.getAnimations().length).toBeGreaterThan(0)

  await expect.poll(() => el.getAnimations().length).toBe(0)
  expect(el.getBoundingClientRect().height).toBe(40)
})

test('stays mounted through the exit animation, then unmounts', async () => {
  const onExitComplete = vi.fn()
  const { rerender } = await render(
    <Collapse open onExitComplete={onExitComplete}>
      {CONTENT}
    </Collapse>,
  )
  await expect.poll(() => node().getAnimations().length).toBe(0)

  await rerender(
    <Collapse open={false} onExitComplete={onExitComplete}>
      {CONTENT}
    </Collapse>,
  )

  // The whole point of ADR D5: presence holds the node while the close keyframes play.
  const el = node()
  expect(el.dataset.state).toBe('closed')
  expect(el.getAnimations().length).toBeGreaterThan(0)

  await expect.poll(query).toBe(null)
  expect(onExitComplete).toHaveBeenCalledTimes(1)
})

test('cancels a pending exit when reopened before the close animation finishes', async () => {
  const onExitComplete = vi.fn()
  const view = await render(
    <Collapse open onExitComplete={onExitComplete}>
      {CONTENT}
    </Collapse>,
  )
  await expect.poll(() => node().getAnimations().length).toBe(0)

  await view.rerender(
    <Collapse open={false} onExitComplete={onExitComplete}>
      {CONTENT}
    </Collapse>,
  )
  expect(node().dataset.state).toBe('closed')

  await view.rerender(
    <Collapse open onExitComplete={onExitComplete}>
      {CONTENT}
    </Collapse>,
  )
  await expect.poll(() => node().getAnimations().length).toBe(0)
  expect(node().dataset.state).toBe('open')
  expect(node().getBoundingClientRect().height).toBe(40)
  expect(onExitComplete).not.toHaveBeenCalled()
})

test('forwards native attributes, events, and its ref through the presence lifecycle', async () => {
  const ref = createRef<HTMLDivElement>()
  const onClick = vi.fn()
  const { rerender } = await render(
    <Collapse open ref={ref} id="details-panel" aria-label="Details" onClick={onClick}>
      {CONTENT}
    </Collapse>,
  )

  const el = node()
  expect(el.id).toBe('details-panel')
  expect(el.getAttribute('aria-label')).toBe('Details')
  expect(ref.current).toBe(el)

  el.click()
  expect(onClick).toHaveBeenCalledOnce()

  await rerender(
    <Collapse open={false} ref={ref} id="details-panel" onClick={onClick}>
      {CONTENT}
    </Collapse>,
  )
  await expect.poll(query).toBe(null)
  expect(ref.current).toBe(null)
})

// `border-box` is what every CSS reset sets, but a bare page is `content-box`, and the
// two disagree about what `height` even means. The measurement has to hold in both.
test.each(['border-box', 'content-box'] as const)(
  'the measured height reproduces the natural height under %s',
  async (boxSizing) => {
    const style = { boxSizing, borderTop: '3px solid', borderBottom: '3px solid' }
    const { rerender } = await render(
      <Collapse open={false} style={style}>
        {CONTENT}
      </Collapse>,
    )
    await rerender(
      <Collapse open style={style}>
        {CONTENT}
      </Collapse>,
    )

    const el = node()
    await expect.poll(() => el.getAnimations().length).toBe(0)

    // The animation has ended, so the height is back to `auto`: this is what the panel is
    // supposed to look like. Pinning it to the value the keyframes animate towards must
    // not change it by a single pixel, or the panel visibly jumps as the animation ends.
    const natural = el.getBoundingClientRect().height
    el.style.height = getComputedStyle(el).getPropertyValue('--kida-collapse-height')
    expect(el.getBoundingClientRect().height).toBeCloseTo(natural, 1)
  },
)
