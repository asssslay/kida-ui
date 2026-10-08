interface Frame {
  paddingTop: number
  paddingBottom: number
  borderTopWidth: number
  borderBottomWidth: number
  borderBox: boolean
}

export interface CollapseSizeObserver {
  /** Remeasure after the adapter updates root styles or content. */
  measure(): void
  /** Stop observation when presence removes the node or the adapter unmounts. */
  disconnect(): void
}

/**
 * Measure the natural content height and root frame into the shared Collapse CSS variables.
 * The adapter owns presence; this helper owns layout and container-size observation.
 */
export function observeCollapseSize(root: HTMLElement, content: HTMLElement): CollapseSizeObserver {
  let frame: Frame | undefined
  let active = true

  const readFrame = (): Frame => {
    // Opening keyframes zero the root's frame. Suppress them across this read so we measure
    // authored padding/borders rather than the animated values.
    const restore = root.style.animationName
    root.style.animationName = 'none'
    try {
      const style = getComputedStyle(root)
      return {
        paddingTop: Number.parseFloat(style.paddingTop),
        paddingBottom: Number.parseFloat(style.paddingBottom),
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
        borderBox: style.boxSizing === 'border-box',
      }
    } finally {
      root.style.animationName = restore
    }
  }

  const measure = () => {
    if (!active) return
    // Keep the frame cached during motion: suppressing a running animation to read it would
    // restart the animation. Refresh when settled so authored style changes still take effect.
    if (!frame || root.getAnimations().length === 0) frame = readFrame()

    // CSS height uses the root's box-sizing. Only border-box includes the root's own frame.
    let height = content.getBoundingClientRect().height
    if (frame.borderBox) {
      height +=
        frame.paddingTop + frame.paddingBottom + frame.borderTopWidth + frame.borderBottomWidth
    }

    root.style.setProperty('--kida-collapse-height', `${height}px`)
    root.style.setProperty('--kida-collapse-padding-top', `${frame.paddingTop}px`)
    root.style.setProperty('--kida-collapse-padding-bottom', `${frame.paddingBottom}px`)
    root.style.setProperty('--kida-collapse-border-top-width', `${frame.borderTopWidth}px`)
    root.style.setProperty('--kida-collapse-border-bottom-width', `${frame.borderBottomWidth}px`)
  }

  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(content)

  return {
    measure,
    disconnect() {
      active = false
      observer.disconnect()
    },
  }
}
