# Component conformance

Status: **required release evidence** (2026-09-26)

This matrix tracks the behavior of the seven existing React components against
`COMPONENT_STANDARD.md`. It is intentionally separate from the product roadmap: a green row means
the current component is stable enough to reproduce in another framework, not that more components
should be added.

## Automated baseline

| Component | Normal behavior | Reduced motion | Interruption / cleanup | Reactive inputs | SSR / hydration | Input / accessibility |
|---|---|---|---|---|---|---|
| Reveal | Browser | Browser | Unit + browser | Browser | Shared browser gate | Content remains visible |
| Collapse | Browser | Browser | Rapid reversal + unmount | Controlled `open` | Shared browser gate | Content remains available |
| TextBloom | Browser | Browser | Mid-animation replacement | Text, segmentation, options | Shared browser gate | Authored text exposed once |
| Magnetic | Browser | Browser | Settle + controller replacement | Strength and distance | Shared browser gate | Touch ignored; child remains usable |
| PhotoPile | Browser | Browser | Drag settle + collection replacement | Photos and drag options | Shared browser gate | Focus and pointer paths |
| ScribbleHighlight | Browser | Browser | Observer re-arm | Viewport options and variant | Shared browser gate | SVG decoration hidden |
| StickerBurst | Browser | Browser | Listener cleanup via Strict Mode | Stable layout inputs | Shared browser gate | Native click path; decoration hidden |

Cross-component gates also verify:

- React Strict Mode's setup-cleanup-setup lifecycle;
- deterministic server markup and hydration without recoverable errors;
- zero serious automated axe violations in the representative showcase; and
- real Chromium reduced-motion media emulation, including retained PhotoPile interaction and
  immediate Collapse removal.

Run the evidence with `pnpm --filter @kida-ui/react test`. The repository-wide release candidate
gate remains `pnpm verify` followed by `pnpm -r --filter './packages/*' exec publint`.

## Still required before a public alpha

The following work is deliberately not represented as complete:

1. Establish a pinned CI browser, operating system, fonts, viewport, and screenshot update policy;
   then add visual baselines for settled signature states. Cross-machine screenshots are not a
   useful gate until this environment is fixed.
2. Add explicit narrow and wide viewport checks for PhotoPile and Collapse. Their current responsive
   CSS is exercised by the docs, but its geometry is not yet asserted by tests.
3. Run manual screen-reader checks on at least VoiceOver/Safari and NVDA/Chrome. Axe guards markup
   rules; it cannot prove announcement quality.
4. Run real touch-device smoke tests for PhotoPile and coarse-pointer behavior. Synthetic pointer
   coverage does not validate browser gesture arbitration.
5. Expand the browser matrix beyond Chromium once CI ownership and expected support targets are
   decided.

Any failure found by those checks should be fixed on a narrowly named `fix/<component>-<problem>`
branch when it is larger than a small conformance correction.
