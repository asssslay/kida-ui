<script setup lang="ts">
import { DualWave, type DualWaveLayout } from '@kida-ui/vue'
import { ref, useId } from 'vue'
import { DUAL_WAVE_PHOTOS } from './dual-wave-photos'
import './dual-wave.css'

const GRID_COLUMNS = [2, 3, 4, 5] as const
const rowsFor = (columns: number) => Math.round((columns * 4) / 3)

/** DualWave with its layout, grid, wave strength, and response exposed as controls. */
const layout = ref<DualWaveLayout>('mosaic')
const columns = ref(3)
const strength = ref(80)
const response = ref(1)
const layoutName = useId()
const columnsId = useId()
const strengthId = useId()
const responseId = useId()
</script>

<template>
  <div class="dual-wave-demo">
    <DualWave
      :items="DUAL_WAVE_PHOTOS"
      :headings="['Projects', 'Photographers']"
      :default-index="6"
      :layout="layout"
      :columns="columns"
      :strength="strength"
      :response="response"
      aria-label="Photo projects"
    />
    <div class="dual-wave-settings">
      <fieldset class="dual-wave-layout-picker">
        <legend>Image</legend>
        <label v-for="option in (['mosaic', 'frame'] as const)" :key="option"><input v-model="layout" type="radio" :name="layoutName" :value="option" />{{ option === 'mosaic' ? 'Mosaic' : 'Frame' }}</label>
      </fieldset>
      <label :for="columnsId" :aria-disabled="layout !== 'mosaic'">
        <span class="dual-wave-setting-heading">Grid</span>
        <select :id="columnsId" v-model.number="columns" class="dual-wave-select" :disabled="layout !== 'mosaic'">
          <option v-for="option in GRID_COLUMNS" :key="option" :value="option">{{ option }} × {{ rowsFor(option) }}</option>
        </select>
      </label>
      <label :for="strengthId">
        <span class="dual-wave-setting-heading">Wave strength <output>{{ strength }}%</output></span>
        <input :id="strengthId" v-model.number="strength" type="range" min="0" max="100" />
      </label>
      <label :for="responseId">
        <span class="dual-wave-setting-heading">Response <output>{{ response.toFixed(1) }}×</output></span>
        <input :id="responseId" v-model.number="response" type="range" min="0.5" max="2" step="0.1" />
      </label>
      <p class="dual-wave-credits">Photos from <a href="https://unsplash.com">Unsplash</a>. Inspired by <a href="https://tympanus.net/Tutorials/DualWaveTextAnimation/">Codrops</a>.</p>
    </div>
  </div>
</template>
