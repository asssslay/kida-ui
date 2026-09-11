# Kida UI Component Standard

Status: **required for new components** (2026-09-03)

This is the release contract for Kida components. A component is not complete because its demo
looks good; it is complete when its package build, copied source, interaction model, fallbacks,
documentation, and tests all describe the same behavior.

`Reveal` and `Collapse` predate this standard. They remain valid vertical slices, but should be
audited against it before the first public alpha.

## 1. Product shape

Every public component belongs to one user-facing category:

| Category | Purpose | Examples |
|---|---|---|
| Primitives | Low-level motion and presence building blocks | Reveal, Collapse, Stagger |
| Text | Motion whose subject is readable text | TextBloom, NumberFlow |
| Interaction | Motion driven by intent or direct manipulation | Magnetic, CandyDock |
| Image | Motion that presents or manipulates media | PhotoPile, ImageTrail |
| Background | Ambient effects that sit behind content | SoftGrid, CandyNoise |
| Decorative | Small visual accents added to existing content | ScribbleHighlight, StickerBurst |
| Blocks | Complete page sections composed from lower-level pieces | PlayfulHero |

The T1-T4 tiers in `ARCHITECTURE.md` remain internal. They describe implementation and
multi-framework cost, not how users browse the library.

## 2. Canonical source and distribution

- One checked-in implementation is the source of truth.
- The npm package and copyable source are generated from that implementation.
- Copied source includes every required Kida implementation and stylesheet and may depend on
  declared public third-party packages. It must not require unpublished `@kida-ui/*` packages.
  Copyable means owned and editable, not dependency-free.
- A component declares every runtime dependency and every source file it needs.
- Package-only imports, workspace aliases, and undocumented global CSS must not leak into copied
  output.
- Each copied result must pass import validation, typecheck, and bundle by itself in a clean
  fixture application outside the monorepo.

## 3. Public API

- Prefer a small set of meaningful options over exposing the animation engine's entire API.
- Use controlled state for behavior owned by the caller. Add uncontrolled state only when it
  makes the common case materially simpler.
- Components wrapping one meaningful DOM element forward its ref and safe native attributes.
- Preserve authored event handlers when Kida adds its own handler.
- Support `className` and `style`; visual components also expose documented `--kida-*` custom
  properties for their important design values.
- Use semantic elements by default. Offer `as` only when changing the element is safe and useful.
- Defaults must produce a finished result. Users should not need a pile of classes to discover the
  intended design.
- Public names describe the result (`TextBloom`), not the technique (`ClipPathSpanAnimation`).

## 4. Styling

- Plain CSS and custom properties are the source of truth. Tailwind remains optional.
- Scope selectors under a component-specific `data-kida-*` attribute or class.
- Do not style global element selectors from a component stylesheet.
- Separate structural properties from visual variables so a user can recolor a component without
  breaking its layout or motion.
- Components must work on light and dark surfaces, even when Kida's documentation has a preferred
  presentation.
- Decorative defaults follow `DESIGN_DIRECTION.md`, but color is never required to understand an
  interaction or state.

## 5. Motion behavior

- The interface is calm at rest and playful in response to intent.
- Prefer transform and opacity. Layout animation is allowed when the layout change is itself the
  information, as with `Collapse`.
- Continuous animation must be subtle, pausable when appropriate, and stopped while off-screen.
- Pointer-driven effects use element-local coordinates and must not cause layout reads on every
  frame when a cached measurement is sufficient.
- Timers, observers, listeners, animation frames, and engine controls are cleaned up on unmount.
- Animations have deterministic starting and settled states. A canceled animation must not leave
  stale transforms, opacity, `will-change`, or interaction locks behind.
- Repeated instances must not generate conflicting global IDs, keyframes, or SVG definitions.

## 6. Accessibility and input

- `prefers-reduced-motion: reduce` preserves content and functionality. It may remove travel,
  stagger, parallax, looping, and decorative particles.
- Hover behavior has a keyboard equivalent when it reveals information or performs an action.
- Pointer interactions account for touch and coarse pointers; essential behavior never requires
  hover.
- Animated text remains readable, selectable, copyable, and correctly announced. Decorative split
  spans are hidden from assistive technology without duplicating the accessible text.
- Focus order and visible focus are preserved. Animation must not move focus silently.
- Meaningful controls use native elements before ARIA recreations.
- Color and animation are not the only indicators of state.

## 7. Rendering and performance

- Server output is deterministic and hydration-safe.
- Content must not flash hidden-to-visible after hydration or remain invisible when reduced motion
  is active.
- Random visual output uses stable seeds when rendered on the server.
- Size-dependent effects respond to container changes with `ResizeObserver` rather than only window
  resize events.
- Off-screen ambient work is suspended when practical.
- A component should remain smooth with the number of simultaneous instances shown in its docs.
  Stress cases belong in the playground when the normal demo is too small to expose problems.

## 8. Documentation

Every component page includes:

1. A real, replayable preview.
2. Minimal usage through `@kida-ui/react`.
3. Complete copyable source and required CSS.
4. Runtime and registry dependencies.
5. Props and CSS custom properties.
6. Reduced-motion, input, accessibility, SSR, and known-browser notes where relevant.
7. At least one customization example that changes the visual direction without replacing the
   implementation.

The preview and displayed source must be read from real checked-in files. Documentation examples
must typecheck as part of the workspace.

Every cataloged component also has one purpose-built preview at
`apps/docs/src/demos/catalog-previews/<component-slug>.react.tsx`. It accepts the shared `active`
prop and stays still until its card is hovered or focused. Preview modules are discovered by
filename; the docs build fails when a documented component is missing one or when an orphaned
preview no longer has a component page.

## 9. Verification

- Pure orchestration and parsing logic gets unit tests in `@kida-ui/motion`.
- Layout, observers, CSS animation, pointer behavior, and presence get real-browser tests.
- Interaction tests cover the settled state, interruption, cleanup, and reduced motion.
- The package build and copied-source fixture both typecheck.
- Visual regression coverage is required for signature components before the public alpha.
- `pnpm verify` and `publint` must pass before release.

## 10. Definition of done

A component is ready to list as `beta` only when:

- its API, defaults, styles, and category are decided;
- package and copy paths work from the same source;
- accessibility and reduced-motion behavior are explicit;
- browser behavior is tested at mobile and desktop sizes;
- its catalog preview is representative, keyboard-activated, and safe inside the full-card link;
- documentation is complete enough to use without reading implementation code; and
- no known failure can leave content hidden, focus lost, or background work running after unmount.
