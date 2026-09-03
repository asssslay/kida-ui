import { ScribbleHighlight } from '@kida-ui/react'

export default function ScribbleHighlightCircle() {
  return (
    <ScribbleHighlight
      variant="circle"
      className="demo-scribble-circle"
      style={{ '--kida-scribble-color': '#75a98f' } as React.CSSProperties}
    >
      worth keeping
    </ScribbleHighlight>
  )
}
