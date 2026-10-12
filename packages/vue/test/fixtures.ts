import type { PhotoPilePhoto } from '@kida-ui/vue'

export const photos = [
  { id: 'flower', alt: 'Pink flower', color: '#ed719e' },
  { id: 'sunset', alt: 'Orange sky', color: '#f4a261' },
  { id: 'pool', alt: 'Mint pool', color: '#75c9a6' },
].map(({ id, alt, color }) => ({
  id,
  alt,
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="${color}"/></svg>`)}`,
})) satisfies readonly PhotoPilePhoto[]

export function node<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

export function pointer(target: EventTarget, type: string, init: PointerEventInit = {}) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerType: 'mouse', pointerId: 4, ...init }),
  )
}
