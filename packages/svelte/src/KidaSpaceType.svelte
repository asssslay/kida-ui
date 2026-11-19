<script lang="ts">
import { getSpaceTypeGeometry, type SpaceTypeControls, spaceType } from '@kida-ui/motion'
import { untrack } from 'svelte'
import type { SpaceTypeProps } from './types.js'

let {
  text,
  rows = 1,
  color,
  background,
  longitude = 0,
  radius,
  speed = 1,
  paused = false,
  onGeometryChange,
  element = $bindable(null),
  style,
  ...rest
}: SpaceTypeProps = $props()

let size = $state({ width: 0, height: 0 })
let controls: SpaceTypeControls | null = null
const root = $derived(element)

const rowCount = $derived(Number.isFinite(rows) ? Math.max(1, Math.min(6, Math.round(rows))) : 1)
const wave = $derived(Number.isFinite(longitude) ? Math.max(0, Math.min(100, longitude)) : 0)
const characters = $derived(Array.from(text))
const rowIndexes = $derived(Array.from({ length: rowCount }, (_, row) => row))
const geometry = $derived(
  getSpaceTypeGeometry(size.width, size.height, characters.length, rowCount, wave, radius),
)
const geometryKey = $derived(JSON.stringify(geometry))
const stopped = $derived(paused || characters.length === 0)
const playbackKey = $derived(`${speed}:${stopped}`)

$effect(() => {
  const node = root
  if (!node) return
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    const { width, height } = entry.contentRect
    if (size.width !== width || size.height !== height) size = { width, height }
  })
  observer.observe(node)
  const created = untrack(() => spaceType(node, { speed, paused: stopped }))
  controls = created
  return () => {
    observer.disconnect()
    created.destroy()
    if (controls === created) controls = null
  }
})

$effect(() => {
  void playbackKey
  untrack(() => controls?.setPlayback({ speed, paused: stopped }))
})

$effect(() => {
  void geometryKey
  untrack(() => onGeometryChange?.(geometry))
})

const rootStyle = $derived(
  [
    `--kida-space-type-count: ${Math.max(characters.length, 1)}`,
    `--kida-space-type-rows: ${rowCount}`,
    `--kida-space-type-longitude: ${wave}`,
    color === undefined ? '' : `--kida-space-type-color: ${color}`,
    background === undefined ? '' : `--kida-space-type-background: ${background}`,
    geometry ? `--kida-space-type-size: ${geometry.fontSize}px` : '',
    geometry ? `--kida-space-type-radius: ${geometry.radius}px` : '',
    geometry ? `--kida-space-type-perspective: ${geometry.perspective}px` : '',
    style,
  ]
    .filter(Boolean)
    .join('; '),
)
</script>

<div {...rest} bind:this={element} data-kida-space-type="" style={rootStyle}>
  <span data-kida-space-type-text="">{text}</span>
  <div data-kida-space-type-space="" aria-hidden="true">
    <div data-kida-space-type-camera="">
      <div data-kida-space-type-ring="">
        {#each rowIndexes as row (row)}
          <div data-kida-space-type-row="" style:--kida-space-type-row={row}>
            {#each characters as character, index (index)}<span data-kida-space-type-letter="" style:--kida-space-type-index={index}><span data-kida-space-type-face="front">{character}</span><span data-kida-space-type-face="back">{character}</span></span>{/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
