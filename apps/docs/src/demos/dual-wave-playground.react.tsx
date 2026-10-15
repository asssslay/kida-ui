import { DualWave, type DualWaveLayout } from '@kida-ui/react'
import { useId, useState } from 'react'
import { DUAL_WAVE_PHOTOS } from './dual-wave-photos'
import './dual-wave.css'

const GRID_COLUMNS = [2, 3, 4, 5] as const
const rowsFor = (columns: number) => Math.round((columns * 4) / 3)

/** DualWave with its layout, grid, wave strength, and response exposed as controls. */
export function DualWaveSection() {
  const [layout, setLayout] = useState<DualWaveLayout>('mosaic')
  const [columns, setColumns] = useState(3)
  const [strength, setStrength] = useState(80)
  const [response, setResponse] = useState(1)
  const layoutName = useId()
  const columnsId = useId()
  const strengthId = useId()
  const responseId = useId()

  return (
    <div className="dual-wave-demo">
      <DualWave
        items={DUAL_WAVE_PHOTOS}
        headings={['Projects', 'Photographers']}
        defaultIndex={6}
        layout={layout}
        columns={columns}
        strength={strength}
        response={response}
        aria-label="Photo projects"
      />
      <div className="dual-wave-settings">
        <fieldset className="dual-wave-layout-picker">
          <legend>Image</legend>
          {(['mosaic', 'frame'] as const).map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={layoutName}
                value={option}
                checked={layout === option}
                onChange={() => setLayout(option)}
              />
              {option === 'mosaic' ? 'Mosaic' : 'Frame'}
            </label>
          ))}
        </fieldset>
        <label htmlFor={columnsId} aria-disabled={layout !== 'mosaic'}>
          <span className="dual-wave-setting-heading">Grid</span>
          <select
            id={columnsId}
            className="dual-wave-select"
            value={columns}
            disabled={layout !== 'mosaic'}
            onChange={(event) => setColumns(Number(event.target.value))}
          >
            {GRID_COLUMNS.map((option) => (
              <option key={option} value={option}>
                {option} × {rowsFor(option)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={strengthId}>
          <span className="dual-wave-setting-heading">
            Wave strength <output>{strength}%</output>
          </span>
          <input
            id={strengthId}
            type="range"
            min="0"
            max="100"
            value={strength}
            onChange={(event) => setStrength(Number(event.target.value))}
          />
        </label>
        <label htmlFor={responseId}>
          <span className="dual-wave-setting-heading">
            Response <output>{response.toFixed(1)}×</output>
          </span>
          <input
            id={responseId}
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={response}
            onChange={(event) => setResponse(Number(event.target.value))}
          />
        </label>
        <p className="dual-wave-credits">
          Photos from <a href="https://unsplash.com">Unsplash</a>. Inspired by{' '}
          <a href="https://tympanus.net/Tutorials/DualWaveTextAnimation/">Codrops</a>.
        </p>
      </div>
    </div>
  )
}
