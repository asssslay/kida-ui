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
- Reveal's default transform, single-entry behavior, and reduced-motion visibility before hydration;
- zero serious automated axe violations in the representative showcase; and
- real Chromium reduced-motion media emulation, including retained PhotoPile interaction and
  immediate Collapse removal.

Responsive and visual evidence is defined in `VISUAL_TESTING.md`. It adds mobile and desktop
geometry checks, deterministic settled-state screenshots for all seven components, controlled
light/dark surfaces, and a color-contrast-enabled axe pass.

Run the behavioral evidence with `pnpm --filter @kida-ui/react test` and the responsive/visual
evidence with `pnpm --filter @kida-ui/react test:visual`. The repository-wide release candidate gate
remains `pnpm verify` followed by `pnpm -r --filter './packages/*' exec publint`.

## Experimental Vue milestone

`@kida-ui/vue` currently exports only Reveal and Collapse. It uses the same motion options,
measurement helper, CSS variables, and data attributes as React, with Vue default slots, native
attributes/events, `@exit-complete`, and component refs exposing `element`.

`pnpm --filter @kida-ui/vue test` builds the package before testing its public exports. Node tests
check deterministic server rendering without browser globals. Chromium tests cover viewport entry,
repetition, reactive options and root replacement, equivalent easing tuples, native events and refs,
resize measurement, enter/exit and reversal, reduced motion, and controller/observer cleanup. They
hydrate actual Node-rendered markup for both open and closed states and compare settled React/Vue
pixels at mobile and desktop widths in the same browser. Axe includes color contrast on a controlled
surface. Screenshot parity compares both adapters at runtime, so it creates no host-specific
reference images and does not replace the existing authoritative Linux React baselines.

The packed-consumer check in `DISTRIBUTION.md` verifies the displayed demos, production bundle,
declaration resolution, and server imports. `/docs/vue` supplies the live examples and API notes.
This is an experimental milestone, not full seven-component or public-release conformance.

`pnpm docs:check-dev` starts an isolated Astro dev server and checks Vue/React docs and the home
page, including the Vue client module. A version-pinned pnpm patch disables React Refresh only in
plugin-vue's TypeScript SFC transform, avoiding upstream
[vite-plugin-vue issue #798](https://github.com/vitejs/vite-plugin-vue/issues/798) while preserving
React Refresh elsewhere. Remove the patch after upgrading to a release with this fix and passing
the development smoke check.

## Still required before a public alpha

The following work is deliberately not represented as complete:

1. Run manual screen-reader checks on at least VoiceOver/Safari and NVDA/Chrome. Axe guards markup
   rules; it cannot prove announcement quality.
2. Run real touch-device smoke tests for PhotoPile and coarse-pointer behavior. Synthetic pointer
   coverage does not validate browser gesture arbitration.
3. Expand the browser matrix beyond Chromium once CI ownership and expected support targets are
   decided.

Any failure found by those checks should be fixed on a narrowly named `fix/<component>-<problem>`
branch when it is larger than a small conformance correction.
