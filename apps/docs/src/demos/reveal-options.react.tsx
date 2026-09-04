import { Reveal } from '@kida-ui/react'

const CARDS = [
  { title: 'From the left', options: { x: -32, y: 0 } },
  { title: 'Scale up', options: { scale: 0.9, y: 0 } },
  { title: 'Slow', options: { duration: 1.2 } },
  { title: 'Every time', options: { once: false } },
]

export default function RevealOptions() {
  return (
    <div className="demo-grid">
      {CARDS.map(({ title, options }) => (
        <Reveal key={title} {...options} className="demo-card">
          <strong>{title}</strong>
          <code>{JSON.stringify(options)}</code>
        </Reveal>
      ))}
    </div>
  )
}
