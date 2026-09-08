import { Collapse, Magnetic, Reveal, ScribbleHighlight, TextBloom } from '@kida-ui/react'
import { useEffect, useRef, useState } from 'react'

export interface CatalogCardPreviewProps {
  name: string
  href: string
  label: string
}

function Preview({ name, active }: { name: string; active: boolean }) {
  if (name === 'reveal') {
    const content = (
      <>
        <strong>Scrolled into view</strong>
        <span>Rises 8px and fades in, the first time it enters the viewport.</span>
      </>
    )
    return active ? (
      <Reveal className="demo-card">{content}</Reveal>
    ) : (
      <div className="demo-card">{content}</div>
    )
  }

  if (name === 'collapse') {
    return (
      <div className="demo-stack">
        <span className="demo-button catalog-preview-collapse-trigger">Details</span>
        <Collapse open={active}>
          <div className="demo-panel">
            <p>The node stays mounted until the close keyframes finish.</p>
            <p>Its natural height is measured into --kida-collapse-height.</p>
          </div>
        </Collapse>
      </div>
    )
  }

  if (name === 'text-bloom') {
    return (
      <div className="demo-feature demo-text-bloom">
        {active ? (
          <TextBloom as="h2" voice="pop">
            Make the headline bloom.
          </TextBloom>
        ) : (
          <h2>Make the headline bloom.</h2>
        )}
      </div>
    )
  }

  if (name === 'magnetic') {
    return (
      <Magnetic maxDistance={20} strength={0.24}>
        <span className="demo-magnetic-button">Come closer</span>
      </Magnetic>
    )
  }

  if (name === 'scribble-highlight') {
    return (
      <p className="demo-scribble-copy">
        Keep the layout precise, then add one{' '}
        {active ? <ScribbleHighlight>imperfect detail</ScribbleHighlight> : 'imperfect detail'}.
      </p>
    )
  }

  return null
}

export default function CatalogCardPreview({ name, href, label }: CatalogCardPreviewProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const active = hovered || focused

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleFocus = () => setFocused(true)
    const handleBlur = () => setFocused(false)

    card.addEventListener('focus', handleFocus)
    card.addEventListener('blur', handleBlur)

    return () => {
      card.removeEventListener('focus', handleFocus)
      card.removeEventListener('blur', handleBlur)
    }
  }, [])

  return (
    <a
      ref={cardRef}
      className="catalog-card"
      href={href}
      aria-label={label}
      data-active={active ? 'true' : 'false'}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="component-preview" data-component={name} aria-hidden="true">
        <Preview name={name} active={active} />
      </div>
      <span className="visually-hidden">{label}</span>
    </a>
  )
}
