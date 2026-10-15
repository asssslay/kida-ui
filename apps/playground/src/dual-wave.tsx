import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/instrument-sans/wght-italic.css'
import { useEffect, useRef } from 'react'
import { DualWaveSection } from '../../docs/src/demos/dual-wave-playground.react'
import './dual-wave.css'

/** Playground chrome around the documented DualWave demo, so both review the same component. */
export function DualWavePlayground({ standalone = false }: { standalone?: boolean }) {
  const shellRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // The full-window study starts with the stage focused, ready for arrow keys.
    if (standalone)
      shellRef.current
        ?.querySelector<HTMLElement>('[data-kida-dual-wave]')
        ?.focus({ preventScroll: true })
  }, [standalone])

  return (
    <section
      ref={shellRef}
      className={`dual-wave-shell${standalone ? ' dual-wave-standalone' : ''}`}
    >
      {standalone && (
        <div className="dual-wave-brandbar">
          <a className="dual-wave-wordmark" href="/">
            kida<span>ui</span>
            <span className="dual-wave-brand-dot" aria-hidden="true" />
          </a>
          <span className="dual-wave-study-badge">Motion playground</span>
          <a className="dual-wave-back" href="/">
            All experiments <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <div className="dual-wave-intro">
        <div>
          <p className="dual-wave-eyebrow">Motion study / 02</p>
          {standalone ? (
            <h1>
              Dual <em>wave.</em>
            </h1>
          ) : (
            <h2>
              Dual <em>wave.</em>
            </h2>
          )}
          <p className="dual-wave-description">Two sides. One story. A softer way to explore.</p>
        </div>
        {!standalone && (
          <a href="?demo=dual-wave">
            Open full-screen <span aria-hidden="true">↗</span>
          </a>
        )}
        {standalone && (
          <span className="dual-wave-intro-note">
            Calm at rest.
            <br />
            Expressive on cue.
          </span>
        )}
      </div>
      <DualWaveSection />
    </section>
  )
}
