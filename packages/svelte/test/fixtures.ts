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
