import { GlowHighlight } from '@kida-ui/react'

export default function GlowHighlightAfterDark() {
  return (
    <p className="glow-highlight-dark">
      Open late,{' '}
      <GlowHighlight finish="sticker" palette="after-dark">
        after dark
      </GlowHighlight>
      .
    </p>
  )
}
