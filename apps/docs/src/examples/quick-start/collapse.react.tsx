import { useState } from 'react'
import { Collapse } from '@/components/ui/kida/collapse'

export default function CollapseExample() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide details' : 'Show details'}
      </button>
      <Collapse open={open}>
        <div>Anything at all.</div>
      </Collapse>
    </div>
  )
}
