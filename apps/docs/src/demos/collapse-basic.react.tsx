import { Collapse } from '@kida-ui/react'
import { useState } from 'react'

interface CollapseBasicProps {
  initialOpen?: boolean
}

export default function CollapseBasic({ initialOpen = false }: CollapseBasicProps) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <div className="demo-stack">
      <button type="button" className="demo-button" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Open'}
      </button>

      {/* The border lives on the content, never on the collapsing root — see the note on
          borders in the Collapse docs. */}
      <Collapse open={open}>
        <div className="demo-panel">
          <p>The node stays mounted until the close keyframes finish.</p>
          <p>Its natural height is measured into --kida-collapse-height.</p>
        </div>
      </Collapse>
    </div>
  )
}
