import { animate, inView, stagger } from 'motion'
import { prefersReducedMotion } from './reduced-motion.js'

export type TextBloomVoice = 'gentle' | 'pop'

export interface TextBloomOptions {
  /** Motion character. @default 'gentle' */
  voice?: TextBloomVoice
  /** Seconds between segments. @default 0.045 */
  stagger?: number
  /** Seconds before the first segment. @default 0 */
  delay?: number
  /** Seconds per segment. @default 0.55 */
  duration?: number
  /** Animate only on the first viewport entry. @default true */
  once?: boolean
  /** How much of the root must be visible. @default 0.4 */
  amount?: 'some' | 'all' | number
}

const DEFAULTS = {
  voice: 'gentle',
  stagger: 0.045,
  delay: 0,
  duration: 0.55,
  once: true,
  amount: 0.4,
} as const

export function textBloomInitialStyle(voice: TextBloomVoice = 'gentle') {
  return {
    opacity: 0,
    transform:
      voice === 'pop'
        ? 'translate3d(0, 14px, 0) scale(0.9)'
        : 'translate3d(0, 10px, 0) scale(0.98)',
    transformOrigin: '50% 80%',
    willChange: 'transform, opacity',
  } as const
}

export function textBloom(element: HTMLElement, options: TextBloomOptions = {}): () => void {
  const settings = {
    voice: options.voice ?? DEFAULTS.voice,
    stagger: options.stagger ?? DEFAULTS.stagger,
    delay: options.delay ?? DEFAULTS.delay,
    duration: options.duration ?? DEFAULTS.duration,
    once: options.once ?? DEFAULTS.once,
    amount: options.amount ?? DEFAULTS.amount,
  }
  const segments = [...element.querySelectorAll<HTMLElement>('[data-kida-text-bloom-segment]')]
  if (segments.length === 0) return () => {}

  const hide = () => {
    for (const segment of segments)
      Object.assign(segment.style, textBloomInitialStyle(settings.voice))
    element.dataset.state = 'idle'
  }
  const settle = () => {
    for (const segment of segments) {
      segment.style.opacity = '1'
      segment.style.transform = 'none'
      segment.style.transformOrigin = ''
      segment.style.willChange = 'auto'
    }
    element.dataset.state = 'settled'
  }

  if (prefersReducedMotion()) {
    settle()
    return () => {}
  }

  hide()
  let controls: ReturnType<typeof animate> | undefined
  let settleFrame = 0

  const cancelSettle = () => {
    if (!settleFrame) return
    cancelAnimationFrame(settleFrame)
    settleFrame = 0
  }

  const stop = inView(
    element,
    () => {
      cancelSettle()
      element.dataset.state = 'active'
      const pop = settings.voice === 'pop'
      controls = animate(
        segments,
        {
          opacity: [0, 1, 1],
          transform: pop
            ? [
                'translate3d(0, 14px, 0) scale(0.9)',
                'translate3d(0, -2px, 0) scale(1.035)',
                'translate3d(0, 0, 0) scale(1)',
              ]
            : [
                'translate3d(0, 10px, 0) scale(0.98)',
                'translate3d(0, 0, 0) scale(1)',
                'translate3d(0, 0, 0) scale(1)',
              ],
        },
        {
          duration: settings.duration,
          delay: stagger(settings.stagger, { startDelay: settings.delay }),
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.72, 1],
        },
      )

      const currentControls = controls
      void currentControls.finished
        .then(() => {
          // `animate()` creates one animation per property and segment. Wait for the whole
          // group, then move one frame past Motion's final style commits before cleaning up.
          if (controls !== currentControls) return
          settleFrame = requestAnimationFrame(() => {
            settleFrame = 0
            if (controls === currentControls) settle()
          })
        })
        .catch(() => {
          // Cancelling a pass rejects its finished promise; the exit cleanup re-arms it.
        })

      if (settings.once) stop()
      return settings.once
        ? undefined
        : () => {
            cancelSettle()
            controls?.cancel()
            hide()
          }
    },
    { amount: settings.amount },
  )

  return () => {
    stop()
    cancelSettle()
    controls?.cancel()
  }
}
