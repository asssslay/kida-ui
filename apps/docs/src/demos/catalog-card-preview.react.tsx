import CollapseBasic from './collapse-basic.react.js'
import MagneticBasic from './magnetic-basic.react.js'
import RevealBasic from './reveal-basic.react.js'
import ScribbleHighlightBasic from './scribble-highlight-basic.react.js'
import TextBloomBasic from './text-bloom-basic.react.js'

export interface CatalogCardPreviewProps {
  name: string
}

export default function CatalogCardPreview({ name }: CatalogCardPreviewProps) {
  if (name === 'reveal') {
    return <RevealBasic />
  }

  if (name === 'collapse') {
    return <CollapseBasic initialOpen />
  }

  if (name === 'text-bloom') {
    return <TextBloomBasic />
  }

  if (name === 'magnetic') {
    return <MagneticBasic />
  }

  if (name === 'scribble-highlight') {
    return <ScribbleHighlightBasic />
  }

  return null
}
