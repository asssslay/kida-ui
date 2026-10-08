import { observeCollapseSize } from '@kida-ui/motion'
import { afterEach, expect, test } from 'vitest'

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

function fixture(boxSizing: 'border-box' | 'content-box') {
  const root = document.createElement('div')
  const content = document.createElement('div')
  root.style.cssText = `box-sizing:${boxSizing};padding:10px 0 12px;border-top:3px solid;border-bottom:5px solid`
  content.style.height = '40px'
  root.append(content)
  document.body.append(root)
  cleanups.push(() => root.remove())
  const size = observeCollapseSize(root, content)
  cleanups.push(() => size.disconnect())
  return { root, content, size }
}

test.each(['border-box', 'content-box'] as const)(
  'the shared observer preserves natural height with padding and borders under %s',
  (boxSizing) => {
    const { root } = fixture(boxSizing)
    const natural = root.getBoundingClientRect().height
    root.style.height = root.style.getPropertyValue('--kida-collapse-height')
    expect(root.getBoundingClientRect().height).toBeCloseTo(natural, 1)
  },
)

test('remeasures content and settled root styles without an adapter', async () => {
  const { root, content, size } = fixture('border-box')
  content.style.height = '80px'
  await expect.poll(() => root.style.getPropertyValue('--kida-collapse-height')).toBe('110px')

  root.style.paddingTop = '20px'
  size.measure()
  expect(root.style.getPropertyValue('--kida-collapse-height')).toBe('120px')
})

test('keeps the authored frame during animation without restarting it', async () => {
  const { root, content, size } = fixture('border-box')
  const animation = root.animate({ paddingTop: ['0px', '10px'] }, { duration: 10000 })
  cleanups.push(() => animation.cancel())
  animation.pause()
  await animation.ready
  animation.currentTime = 100

  content.style.height = '80px'
  size.measure()
  expect(root.style.getPropertyValue('--kida-collapse-height')).toBe('110px')
  expect(animation.currentTime).toBe(100)
  expect(animation.playState).toBe('paused')
})

test('disconnect prevents queued observer callbacks and later measurements from changing styles', async () => {
  const { root, content, size } = fixture('border-box')
  expect(root.style.getPropertyValue('--kida-collapse-height')).toBe('70px')
  size.disconnect()
  content.style.height = '80px'
  size.measure()
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(root.style.getPropertyValue('--kida-collapse-height')).toBe('70px')
})
