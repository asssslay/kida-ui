import { Collapse } from '@kida-ui/react'
import type { AnimationEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { CatalogPreviewProps } from '../catalog-preview-types'

type PreviewPhase = 'closed' | 'opening' | 'open' | 'closing'

export default function CollapseCatalogPreview({ active }: CatalogPreviewProps) {
  const [phase, setPhase] = useState<PreviewPhase>('closed')
  const phaseRef = useRef<PreviewPhase>('closed')
  const desiredOpenRef = useRef(active)

  const moveTo = (nextPhase: PreviewPhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }

  useEffect(() => {
    desiredOpenRef.current = active

    // CSS keyframes restart from an endpoint when their direction changes. Let the
    // current pass finish and queue the opposite state instead, so a quick pointer
    // exit/re-entry cannot make the height jump.
    if (active && phaseRef.current === 'closed') {
      phaseRef.current = 'opening'
      setPhase('opening')
    }
    if (!active && phaseRef.current === 'open') {
      phaseRef.current = 'closing'
      setPhase('closing')
    }
  }, [active])

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.hasAttribute('data-kida-collapse')
    ) {
      return
    }

    const currentPhase = phaseRef.current
    if (currentPhase === 'opening' && event.animationName === 'kida-collapse-open') {
      if (desiredOpenRef.current) phaseRef.current = 'open'
      else moveTo('closing')
    }
  }

  const handleExitComplete = () => {
    if (phaseRef.current === 'closing') {
      if (desiredOpenRef.current) moveTo('opening')
      else phaseRef.current = 'closed'
    }
  }

  return (
    <div className="demo-stack" onAnimationEnd={handleAnimationEnd}>
      <span className="demo-button catalog-preview-collapse-trigger">Details</span>
      <Collapse open={phase === 'opening' || phase === 'open'} onExitComplete={handleExitComplete}>
        <div className="demo-panel">
          <p>The content stays mounted until its close animation finishes.</p>
        </div>
      </Collapse>
    </div>
  )
}
