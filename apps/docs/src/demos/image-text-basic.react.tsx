import '@fontsource-variable/instrument-sans'
import { ImageText } from '@kida-ui/react'
import './image-text.css'

export default function ImageTextBasic() {
  return (
    <div className="demo-image-text">
      <ImageText image="/demo/image-text/pink-bloom.webp">
        A little curiosity. A fresh perspective. A world of color, waiting between the lines.
      </ImageText>
    </div>
  )
}
