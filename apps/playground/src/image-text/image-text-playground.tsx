import ImageTextBasic from '../../../docs/src/demos/image-text-basic.react'
import './image-text-playground.css'

/** The approved playground and website render the same React implementation. */
export function ImageTextPlayground({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className="photo-type-shell">
      {!standalone && <a href="?demo=image-text">ImageText · Open full-screen ↗</a>}
      <ImageTextBasic />
    </section>
  )
}
