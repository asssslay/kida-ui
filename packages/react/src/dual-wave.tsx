'use client'

import {
  type DualWaveControls,
  type DualWaveLayout,
  type DualWaveOptions,
  dualWave,
  getDualWaveMosaicRows,
} from '@kida-ui/motion'
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { composeRefs } from './compose-refs.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export type { DualWaveLayout } from '@kida-ui/motion'

export interface DualWaveItem {
  /** Stable key for this item. */
  id: string
  /** Shown in the left column, for example a project name. */
  title: string
  /** Shown in the right column, for example a client or credit. */
  subtitle: string
  src: string
  alt: string
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'draggable'>
}

export interface DualWaveProps
  extends DualWaveOptions,
    Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  items: readonly DualWaveItem[]
  /** Labels for the title and subtitle columns. @default ['Projects', 'Clients'] */
  headings?: readonly [string, string]
  /** How the photo changes between items. @default 'mosaic' */
  layout?: DualWaveLayout
  /** Mosaic columns, from 2 to 5. Rows follow the 3:4 frame. @default 3 */
  columns?: number
  /** Item shown first. @default 0 */
  defaultIndex?: number
  /** Travels to this item whenever the value changes. */
  index?: number
  /** Called when the item nearest the center changes. */
  onIndexChange?: (index: number) => void
}

const DEFAULT_HEADINGS = ['Projects', 'Clients'] as const

const toIndex = (value: number | undefined, count: number) =>
  count && value !== undefined && Number.isFinite(value)
    ? ((Math.round(value) % count) + count) % count
    : 0

export const DualWave = forwardRef<HTMLElement, DualWaveProps>(function DualWave(
  {
    items,
    headings = DEFAULT_HEADINGS,
    layout = 'mosaic',
    columns = 3,
    defaultIndex = 0,
    index,
    onIndexChange,
    strength,
    response,
    captureScroll,
    'aria-label': ariaLabel,
    style,
    ...props
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLElement>(null)
  const controlsRef = useRef<DualWaveControls | null>(null)
  const count = items.length
  const [selected, setActive] = useState(() => toIndex(index ?? defaultIndex, count))
  // A shorter item list keeps the selection on its last item.
  const active = count ? Math.min(selected, count - 1) : 0
  const activeRef = useRef(active)
  activeRef.current = active
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange
  const helpId = useId()
  const current = items[active]
  const gridColumns = Number.isFinite(columns) ? Math.max(2, Math.min(5, Math.round(columns))) : 3
  const gridRows = getDualWaveMosaicRows(gridColumns)
  const itemKey = items
    .map((item) => [item.id, item.src, item.title, item.subtitle].join('\u0001'))
    .join('\u0000')

  // Structure changes restart the controller from the item on screen; options update in place.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const controls = dualWave(root, {
      index: activeRef.current,
      strength,
      response,
      captureScroll,
      onIndexChange(next) {
        activeRef.current = next
        setActive(next)
        onIndexChangeRef.current?.(next)
      },
    })
    controlsRef.current = controls
    return () => {
      controls.destroy()
      controlsRef.current = null
    }
  }, [itemKey, layout, gridColumns])

  useIsomorphicLayoutEffect(() => {
    controlsRef.current?.update({ strength, response, captureScroll })
  }, [strength, response, captureScroll])

  useEffect(() => {
    if (index === undefined || !count) return
    const next = toIndex(index, count)
    if (next !== activeRef.current) controlsRef.current?.select(next)
  }, [index, count])

  return (
    <section
      {...props}
      ref={composeRefs(rootRef, forwardedRef)}
      data-kida-dual-wave=""
      data-layout={layout}
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? headings[0]}
      aria-describedby={props['aria-describedby'] ?? helpId}
      // Focus scopes arrow-key navigation to this carousel without global key handlers.
      tabIndex={props.tabIndex ?? 0}
      style={style}
    >
      <div data-kida-dual-wave-headings="" aria-hidden="true">
        <span>{headings[0]}</span>
        <span>{headings[1]}</span>
      </div>
      <div data-kida-dual-wave-field="">
        <fieldset data-kida-dual-wave-column="title" aria-label={headings[0]}>
          {items.map((item, itemIndex) => (
            <button
              type="button"
              key={item.id}
              data-kida-dual-wave-item=""
              aria-label={`Show ${item.title}, ${item.subtitle}`}
              aria-current={itemIndex === active ? 'true' : undefined}
              tabIndex={itemIndex === active ? 0 : -1}
            >
              {item.title}
            </button>
          ))}
        </fieldset>
        <fieldset data-kida-dual-wave-column="subtitle" aria-label={headings[1]}>
          {items.map((item, itemIndex) => (
            <button
              type="button"
              key={item.id}
              data-kida-dual-wave-item=""
              aria-label={`Show ${item.subtitle}, ${item.title}`}
              aria-current={itemIndex === active ? 'true' : undefined}
              tabIndex={-1}
            >
              {item.subtitle}
            </button>
          ))}
        </fieldset>
      </div>
      <div data-kida-dual-wave-media="">
        {layout === 'mosaic' && (
          <div
            data-kida-dual-wave-mosaic=""
            data-kida-dual-wave-columns={gridColumns}
            aria-hidden="true"
            style={
              {
                '--kida-dual-wave-columns': gridColumns,
                '--kida-dual-wave-rows': gridRows,
                ...(current
                  ? { '--kida-dual-wave-initial': `url(${JSON.stringify(current.src)})` }
                  : {}),
              } as CSSProperties
            }
          >
            {Array.from({ length: gridColumns * gridRows }, (_, tile) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: tiles are fixed grid cells without local state
                key={tile}
                data-kida-dual-wave-tile=""
                style={
                  {
                    '--kida-dual-wave-column': tile % gridColumns,
                    '--kida-dual-wave-row': Math.floor(tile / gridColumns),
                  } as CSSProperties
                }
              >
                <span data-kida-dual-wave-layer="" />
                <span data-kida-dual-wave-layer="" />
              </div>
            ))}
          </div>
        )}
        <div data-kida-dual-wave-images="" aria-hidden="true">
          {items.map((item, itemIndex) => (
            <img
              {...item.imageProps}
              key={item.id}
              src={item.src}
              alt=""
              data-kida-dual-wave-image=""
              data-current={itemIndex === active ? '' : undefined}
              decoding={item.imageProps?.decoding ?? 'async'}
              draggable={false}
            />
          ))}
        </div>
        {current && <span data-kida-dual-wave-sr="" role="img" aria-label={current.alt} />}
      </div>
      <span id={helpId} data-kida-dual-wave-sr="">
        Scroll, swipe, or use arrow keys
      </span>
      <span data-kida-dual-wave-sr="" aria-live="polite" aria-atomic="true">
        {current ? `Item ${active + 1} of ${count}: ${current.title}, ${current.subtitle}.` : ''}
      </span>
    </section>
  )
})
