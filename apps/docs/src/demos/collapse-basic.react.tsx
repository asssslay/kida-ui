import { Collapse } from '@kida-ui/react'
import { useId, useState } from 'react'

interface CollapseBasicProps {
  initialOpen?: boolean
}

export default function CollapseBasic({ initialOpen = false }: CollapseBasicProps) {
  const [open, setOpen] = useState(initialOpen)
  const panelId = useId()

  return (
    <div className="demo-stack">
      <button
        type="button"
        className="demo-button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Close' : 'Open'}
      </button>

      {/* The border lives on the content, never on the collapsing root — see the note on
          borders in the Collapse docs. */}
      <Collapse id={panelId} open={open}>
        <div className="demo-panel">
          <p>The node stays mounted until the close keyframes finish.</p>
          <p>Its natural height is measured into --kida-collapse-height.</p>
        </div>
      </Collapse>
    </div>
  )
}
