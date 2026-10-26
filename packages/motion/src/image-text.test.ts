import { expect, test } from 'vitest'
import { imageTextStyle } from './image-text.js'

test('produces deterministic, bounded crops and a properly quoted image URL', () => {
  const options = { image: '/photo with spaces.webp', position: [90, 10] as const, duration: 1200 }
  const style = imageTextStyle(options)
  expect(style).toEqual(imageTextStyle({ ...options }))
  expect(style['--kida-image-text-image']).toBe('url("/photo with spaces.webp")')
  expect(style['--kida-image-text-position']).toBe('90% 10%')
  expect(style['--kida-image-text-crop-one']).toBe('100% 0%')
  expect(style['--kida-image-text-crop-two']).toBe('64% 28%')
  expect(style['--kida-image-text-duration']).toBe('1200ms')
})

test('handles empty images, non-finite options and zero-duration static playback', () => {
  expect(imageTextStyle({ image: ' ', duration: -1 })['--kida-image-text-image']).toBe('none')
  expect(imageTextStyle({ image: 'photo', duration: -1 })['--kida-image-text-duration']).toBe('0ms')
  const style = imageTextStyle({
    image: 'photo',
    position: [Number.NaN, Number.POSITIVE_INFINITY],
    duration: Number.NaN,
  })
  expect(style['--kida-image-text-position']).toBe('50% 50%')
  expect(style['--kida-image-text-duration']).toBe('9600ms')
})
