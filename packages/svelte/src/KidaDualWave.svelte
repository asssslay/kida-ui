<script lang="ts">
import { type DualWaveControls, dualWave, getDualWaveMosaicRows } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { DualWaveProps } from './types.js'

let {
  items,
  headings = ['Projects', 'Clients'],
  layout = 'mosaic',
  columns = 3,
  defaultIndex = 0,
  index = $bindable(),
  strength,
  response,
  captureScroll,
  onIndexChange,
  element = $bindable(null),
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  tabindex = 0,
  ...rest
}: DualWaveProps = $props()

const toIndex = (value: number | undefined, total: number) =>
  total && value !== undefined && Number.isFinite(value)
    ? ((Math.round(value) % total) + total) % total
    : 0

const helpId = $props.id()
let controls: DualWaveControls | null = null
const root = $derived(element)
const count = $derived(items.length)
let selected = $state(untrack(() => toIndex(index ?? defaultIndex, items.length)))
const active = $derived(count ? Math.min(selected, count - 1) : 0)
const current = $derived(items[active])
const gridColumns = $derived(
  Number.isFinite(columns) ? Math.max(2, Math.min(5, Math.round(columns))) : 3,
)
const gridRows = $derived(getDualWaveMosaicRows(gridColumns))
const tiles = $derived(
  Array.from({ length: gridColumns * gridRows }, (_, tile) => ({
    column: tile % gridColumns,
    row: Math.floor(tile / gridColumns),
  })),
)
const restartKey = $derived(
  JSON.stringify([
    items.map((item) => [item.id, item.src, item.title, item.subtitle]),
    layout,
    gridColumns,
  ]),
)
const optionsKey = $derived(JSON.stringify([strength, response, captureScroll]))
const requested = $derived(index === undefined || !count ? undefined : toIndex(index, count))

$effect(() => {
  const node = root
  void restartKey
  if (!node) return
  const created = untrack(() =>
    dualWave(node, {
      index: active,
      strength,
      response,
      captureScroll,
      onIndexChange(next) {
        selected = next
        index = next
        onIndexChange?.(next)
      },
    }),
  )
  controls = created
  return () => {
    created.destroy()
    if (controls === created) controls = null
  }
})

$effect(() => {
  void optionsKey
  untrack(() => controls?.update({ strength, response, captureScroll }))
})

$effect(() => {
  const next = requested
  if (next === undefined) return
  untrack(() => {
    if (next !== active) controls?.select(next)
  })
})
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section
  {...rest}
  bind:this={element}
  data-kida-dual-wave=""
  data-layout={layout}
  aria-roledescription="carousel"
  aria-label={ariaLabel ?? headings[0]}
  aria-describedby={describedBy ?? helpId}
  {tabindex}
>
  <div data-kida-dual-wave-headings="" aria-hidden="true">
    <span>{headings[0]}</span>
    <span>{headings[1]}</span>
  </div>
  <div data-kida-dual-wave-field="">
    <fieldset data-kida-dual-wave-column="title" aria-label={headings[0]}>
      {#each items as item, itemIndex (item.id)}
        <button
          type="button"
          data-kida-dual-wave-item=""
          aria-label={`Show ${item.title}, ${item.subtitle}`}
          aria-current={itemIndex === active ? 'true' : undefined}
          tabindex={itemIndex === active ? 0 : -1}
        >{item.title}</button>
      {/each}
    </fieldset>
    <fieldset data-kida-dual-wave-column="subtitle" aria-label={headings[1]}>
      {#each items as item, itemIndex (item.id)}
        <button
          type="button"
          data-kida-dual-wave-item=""
          aria-label={`Show ${item.subtitle}, ${item.title}`}
          aria-current={itemIndex === active ? 'true' : undefined}
          tabindex={-1}
        >{item.subtitle}</button>
      {/each}
    </fieldset>
  </div>
  <div data-kida-dual-wave-media="">
    {#if layout === 'mosaic'}
      <div
        data-kida-dual-wave-mosaic=""
        data-kida-dual-wave-columns={gridColumns}
        aria-hidden="true"
        style:--kida-dual-wave-columns={gridColumns}
        style:--kida-dual-wave-rows={gridRows}
        style:--kida-dual-wave-initial={current ? `url(${JSON.stringify(current.src)})` : undefined}
      >
        {#each tiles as tile, tileIndex (tileIndex)}
          <div
            data-kida-dual-wave-tile=""
            style:--kida-dual-wave-column={tile.column}
            style:--kida-dual-wave-row={tile.row}
          >
            <span data-kida-dual-wave-layer=""></span>
            <span data-kida-dual-wave-layer=""></span>
          </div>
        {/each}
      </div>
    {/if}
    <div data-kida-dual-wave-images="" aria-hidden="true">
      {#each items as item, itemIndex (item.id)}
        <img
          {...item.imageProps}
          src={item.src}
          alt=""
          data-kida-dual-wave-image=""
          data-current={itemIndex === active ? '' : undefined}
          decoding={item.imageProps?.decoding ?? 'async'}
          draggable="false"
        />
      {/each}
    </div>
    {#if current}
      <span data-kida-dual-wave-sr="" role="img" aria-label={current.alt}></span>
    {/if}
  </div>
  <span id={helpId} data-kida-dual-wave-sr="">Scroll, swipe, or use arrow keys</span>
  <span data-kida-dual-wave-sr="" aria-live="polite" aria-atomic="true">{current ? `Item ${active + 1} of ${count}: ${current.title}, ${current.subtitle}.` : ''}</span>
</section>
