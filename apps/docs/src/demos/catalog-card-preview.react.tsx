import type { ComponentType, FocusEvent, PointerEvent } from 'react'
import { useState } from 'react'
import type { CatalogPreviewProps } from './catalog-preview-types'

export interface CatalogCardPreviewProps {
  name: string
  href: string
  label: string
  title?: string
  description?: string
}

type CatalogPreviewModule = {
  default: ComponentType<CatalogPreviewProps>
}

const modules = import.meta.glob<CatalogPreviewModule>('./catalog-previews/*.react.tsx', {
  eager: true,
})
const previewPath = /^\.\/catalog-previews\/(.+)\.react\.tsx$/
const previews = new Map<string, ComponentType<CatalogPreviewProps>>()
const interactivePreviews = new Set(['magnetic'])

for (const [path, module] of Object.entries(modules)) {
  const name = previewPath.exec(path)?.[1]
  if (name) previews.set(name, module.default)
}

/** Keep the documented catalog and its purpose-built previews in lockstep. */
export function assertCatalogPreviewCoverage(componentNames: readonly string[]) {
  const documented = new Set(componentNames)
  const missing = componentNames.filter((name) => !previews.has(name))
  const orphaned = [...previews.keys()].filter((name) => !documented.has(name))

  if (missing.length === 0 && orphaned.length === 0) return

  const problems = [
    missing.length > 0 ? `missing previews: ${missing.join(', ')}` : '',
    orphaned.length > 0 ? `orphaned previews: ${orphaned.join(', ')}` : '',
  ].filter(Boolean)

  throw new Error(`Catalog preview coverage is incomplete (${problems.join('; ')}).`)
}

export default function CatalogCardPreview({
  name,
  href,
  label,
  title,
  description,
}: CatalogCardPreviewProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const active = hovered || focused
  const Preview = previews.get(name)
  const isInteractivePreview = interactivePreviews.has(name)

  if (!Preview) {
    throw new Error(
      `Missing catalog preview for "${name}". Add demos/catalog-previews/${name}.react.tsx.`,
    )
  }

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') setHovered(true)
  }

  const handleBlur = (event: FocusEvent<HTMLAnchorElement>) => {
    const link = event.currentTarget
    requestAnimationFrame(() => setFocused(document.activeElement === link))
  }

  return (
    <article
      className="catalog-card"
      data-active={active ? 'true' : 'false'}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
    >
      <div
        className="component-preview"
        data-component={name}
        data-interactive={isInteractivePreview ? 'true' : undefined}
        aria-hidden="true"
        inert={!isInteractivePreview}
      >
        <Preview active={active} />
      </div>
      {title && (
        <div className="catalog-card-copy">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      )}
      <a
        className="catalog-card-link"
        href={href}
        aria-label={label}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
      >
        <span className="visually-hidden">{label}</span>
      </a>
    </article>
  )
}
