import { TextBloom } from '@kida-ui/react'

export default function TextBloomCharacters() {
  return (
    <TextBloom
      by="character"
      stagger={0.025}
      style={{ color: '#6552a8' }}
      className="demo-character-bloom"
    >
      Lilac, softly.
    </TextBloom>
  )
}
