import '@kida-ui/styles/kida.css'
import { Collapse, Reveal, useReducedMotion } from '@kida-ui/react'
import { useState } from 'react'

const CARDS = [
  { title: 'Default', options: {} },
  { title: 'Longer travel', options: { y: 40 } },
  { title: 'Slow', options: { duration: 1.2 } },
  { title: 'Delayed', options: { delay: 0.25 } },
  { title: 'From the left', options: { x: -32, y: 0 } },
  { title: 'Scale up', options: { scale: 0.9, y: 0 } },
  { title: 'Fires every time', options: { once: false } },
  { title: 'Needs to be fully visible', options: { amount: 'all' as const } },
]

function RevealSection() {
  return (
    <section>
      <h2>Reveal — JS engine path</h2>
      <p className="hint">
        Scroll down. Each card animates as it enters the viewport. “Fires every time” re-runs when
        you scroll it out and back.
      </p>
      <div className="grid">
        {CARDS.map((card) => (
          <Reveal key={card.title} {...card.options} className="card">
            <strong>{card.title}</strong>
            <code>{JSON.stringify(card.options)}</code>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function CollapseSection() {
  const [open, setOpen] = useState(false)
  const [exits, setExits] = useState(0)

  return (
    <section>
      <h2>Collapse — CSS exit path</h2>
      <p className="hint">
        The node stays mounted until the close keyframes finish. Exit completions: {exits}
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Open'}
      </button>
      <Collapse open={open} onExitComplete={() => setExits((n) => n + 1)} className="panel">
        <div className="panel-inner">
          <p>
            This panel is unmounted by <code>@zag-js/presence</code>, but not until the CSS
            animation ends. Its natural height is measured into <code>--kida-collapse-height</code>.
          </p>
          <p>A second paragraph, so the measured height is not trivial.</p>
        </div>
      </Collapse>
    </section>
  )
}

/** A fixed list, so the keys are stable and the stagger is a property of the item. */
const STRESS = Array.from({ length: 24 }, (_, i) => ({
  id: `stress-${i + 1}`,
  label: i + 1,
  delay: i * 0.03,
}))

function StressSection() {
  return (
    <section>
      <h2>Stress — 24 at once</h2>
      <p className="hint">Throttle the CPU 6× in DevTools and watch for jank here.</p>
      <div className="grid dense">
        {STRESS.map(({ id, label, delay }) => (
          <Reveal key={id} delay={delay} className="card small">
            {label}
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function App() {
  const reduced = useReducedMotion()

  return (
    <main>
      <header>
        <h1>Kida UI playground</h1>
        <p className={reduced ? 'badge on' : 'badge'}>
          prefers-reduced-motion: {reduced ? 'reduce' : 'no-preference'}
        </p>
        <p className="hint">
          Toggle it in System Settings → Accessibility → Display → Reduce motion. Reveals should
          appear instantly and the collapse should still close and unmount.
        </p>
      </header>
      <CollapseSection />
      <div className="spacer">↓ scroll ↓</div>
      <RevealSection />
      <StressSection />
    </main>
  )
}
