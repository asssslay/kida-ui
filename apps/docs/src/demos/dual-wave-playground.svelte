<script lang="ts">
import { DualWave, type DualWaveLayout } from '@kida-ui/svelte'
import { DUAL_WAVE_PHOTOS } from './dual-wave-photos'
import './dual-wave.css'

const GRID_COLUMNS = [2, 3, 4, 5] as const
const LAYOUTS = ['mosaic', 'frame'] as const
const rowsFor = (columns: number) => Math.round((columns * 4) / 3)

let layout = $state<DualWaveLayout>('mosaic')
let columns = $state(3)
let strength = $state(80)
let response = $state(1)
const id = $props.id()
</script>

<div class="dual-wave-demo">
  <DualWave
    items={DUAL_WAVE_PHOTOS}
    headings={['Projects', 'Photographers']}
    defaultIndex={6}
    {layout}
    {columns}
    {strength}
    {response}
    aria-label="Photo projects"
  />
  <div class="dual-wave-settings">
    <fieldset class="dual-wave-layout-picker">
      <legend>Image</legend>
      {#each LAYOUTS as option (option)}
        <label><input bind:group={layout} type="radio" name={`${id}-layout`} value={option} />{option === 'mosaic' ? 'Mosaic' : 'Frame'}</label>
      {/each}
    </fieldset>
    <label for={`${id}-columns`} aria-disabled={layout !== 'mosaic'}>
      <span class="dual-wave-setting-heading">Grid</span>
      <select id={`${id}-columns`} bind:value={columns} class="dual-wave-select" disabled={layout !== 'mosaic'}>
        {#each GRID_COLUMNS as option (option)}
          <option value={option}>{option} × {rowsFor(option)}</option>
        {/each}
      </select>
    </label>
    <label for={`${id}-strength`}>
      <span class="dual-wave-setting-heading">Wave strength <output>{strength}%</output></span>
      <input id={`${id}-strength`} bind:value={strength} type="range" min="0" max="100" />
    </label>
    <label for={`${id}-response`}>
      <span class="dual-wave-setting-heading">Response <output>{response.toFixed(1)}×</output></span>
      <input id={`${id}-response`} bind:value={response} type="range" min="0.5" max="2" step="0.1" />
    </label>
    <p class="dual-wave-credits">Photos from <a href="https://unsplash.com">Unsplash</a>. Inspired by <a href="https://tympanus.net/Tutorials/DualWaveTextAnimation/">Codrops</a>.</p>
  </div>
</div>
