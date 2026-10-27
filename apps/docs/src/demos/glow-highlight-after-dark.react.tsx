import { GlowHighlight } from '@kida-ui/react'
import type { CSSProperties } from 'react'

const afterDark = {
  '--kida-glow-core': '#8f2350',
  '--kida-glow-rim': '#c23a6e',
  '--kida-glow-band': '#ffd76a',
  '--kida-glow-fringe': '#ff8a3d',
} as CSSProperties

export default function GlowHighlightAfterDark() {
  return (
    <p className="glow-highlight-dark">
      Open late,{' '}
      <GlowHighlight finish="sticker" style={afterDark}>
        after dark
      </GlowHighlight>
      .
    </p>
  )
}
