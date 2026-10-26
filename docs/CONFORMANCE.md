# Component conformance

Status: **required release evidence** (2026-09-26)

This matrix tracks the behavior of the React catalog against
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
| SpaceType (React only) | Browser + geometry unit tests | Browser | Observer and animation cleanup | Text, rows, speed, pause, radius, longitude, colors | Browser | Authored phrase exposed once |

Cross-component gates also verify:

- React Strict Mode's setup-cleanup-setup lifecycle;
- deterministic server markup and hydration without recoverable errors;
- Reveal's default transform, single-entry behavior, and reduced-motion visibility before hydration;
- zero serious automated axe violations in the representative showcase; and
- real Chromium reduced-motion media emulation, including retained PhotoPile interaction and
  immediate Collapse removal.

Responsive and visual evidence is defined in `VISUAL_TESTING.md`. It adds mobile and desktop
geometry checks, deterministic settled-state screenshots for the seven shared components, controlled
light/dark surfaces, and a color-contrast-enabled axe pass. SpaceType additionally has responsive
light/dark checks in normal and reduced motion, empty/single/long content coverage, independent
instances, and hidden-document playback checks. Its stored Linux screenshot baseline is still
required before public alpha.

Run the behavioral evidence with `pnpm --filter @kida-ui/react test` and the responsive/visual
evidence with `pnpm --filter @kida-ui/react test:visual`. The repository-wide release candidate gate
remains `pnpm verify` followed by `pnpm -r --filter './packages/*' exec publint`.

## Experimental Vue milestone

`@kida-ui/vue` exports Reveal, Collapse, TextBloom, Magnetic, PhotoPile, ScribbleHighlight, and
StickerBurst. It uses the same motion options,
measurement helper, CSS variables, and data attributes as React, with Vue default slots, native
attributes/events, `@exit-complete`, and component refs exposing `element`.

`pnpm --filter @kida-ui/vue test` builds the package before testing its public exports. Node tests
check deterministic server rendering without browser globals. Browser tests cover viewport entry,
repetition, reactive options and root replacement, equivalent easing tuples, native events and refs,
resize measurement, enter/exit and reversal, reduced motion, and controller/observer cleanup.
Catalog tests also cover reactive text/segmentation and Unicode code points, pointer and keyboard
interaction, drag cancellation and spring return, photo collection reordering and removal, seeded
sticker updates, and SVG decoration. Unrelated attributes preserve active or settled motion state.
Vue TextBloom uses a required `text` prop; Magnetic uses `targetClass`; content wrappers use slots. They
hydrate actual Node-rendered markup for both open and closed states and compare settled React/Vue
pixels at mobile and desktop widths in the same browser. Axe includes color contrast on a controlled
surface. Screenshot parity compares both adapters at runtime, so it creates no host-specific
reference images and does not replace the existing authoritative Linux React baselines.

Copied-source conformance installs every Vue registry item through the pinned shadcn-vue CLI,
then tests a combined installation with a custom UI alias. The displayed quick starts typecheck,
bundle, and render deterministically in Node without Kida packages or workspace aliases.
Both framework catalogs and all 15 items must match the built documentation endpoints.

The packed-consumer check in `DISTRIBUTION.md` verifies the displayed demos, production bundle,
declaration resolution, and server imports. `/docs/<name>` supplies the live preview and framework-specific examples and API notes.
SpaceType currently has only a React adapter; its page hides the Vue choice. The seven shared Vue
components remain experimental. CI now defines Firefox/WebKit behavior gates for both adapters, in
addition to Chromium, with Chromium/WebKit touch emulation. Real touch-device and screen-reader
release conformance is still required. See [the release checklist](RELEASE_CHECKLIST.md) for
commands and evidence requirements.

`pnpm docs:check-dev` starts an isolated Astro dev server and checks Vue/React docs and the home
page, including the Vue client module. A version-pinned pnpm patch disables React Refresh only in
plugin-vue's TypeScript SFC transform, avoiding upstream
[vite-plugin-vue issue #798](https://github.com/vitejs/vite-plugin-vue/issues/798) while preserving
React Refresh elsewhere. Remove the patch after upgrading to a release with this fix and passing
the development smoke check.

After building, `pnpm docs:test-browser` exercises the production documentation in Chromium.
It requires matching demo lists and compares native React and Vue server-rendered demos,
customization variants, expanded Collapse, and initial Reveal geometry at mobile and desktop sizes.
Framework buttons update examples and API notes in place, without navigation or replacing live
preview nodes. Checks require the same URL, document, preview state, scroll, focus, and history,
working Copy buttons, and a preference that survives page navigation and refresh. Legacy Vue URLs
remain compatible entries and normalize to the canonical component URL. CI also runs the gate with
`KIDA_TEST_BROWSER=firefox` and `KIDA_TEST_BROWSER=webkit`.

Sidebar navigation fetches the selected framework's document before swapping the article. A
custom Astro swap updates the center heading and article, the TOC links, and page metadata in
place. The body, layout, header, sidebar, framework controls, TOC containers, and footer are never
replaced or reparented. Native visual transitions are skipped to avoid a full-page fade or
glass-layer reset. The browser URL and history use canonical
`/docs/<name>` paths. Checks sample rendered frames to reject a React selection flash, hold a
Vue response to verify the old page stays usable, and exercise mobile/desktop navigation,
same-page links, and rapid back/forward traversal. Mutation checks reject any removal of a
persistent shell node; frame samples also reject full-page transition animations.

The version-pinned `@astrojs/react` patch completes pending initial hydration before router
teardown. This prevents React error 424 when rapid history traversal unmounts an unfinished
island in WebKit. Normal hydration remains concurrent. Remove the patch once the integration
handles this lifecycle and passes the same browser checks.

## Still required before a public alpha

The following work is deliberately not represented as complete:

1. Run manual screen-reader checks on at least VoiceOver/Safari and NVDA/Chrome. Axe guards markup
   rules; it cannot prove announcement quality.
2. Run real touch-device smoke tests for PhotoPile and coarse-pointer behavior. Synthetic pointer
   coverage does not validate browser gesture arbitration.
3. Require green Chromium, Firefox, and WebKit CI jobs for the release candidate, including Vue
   adapter parity and the touch-emulation scenarios. A configured job is not passing evidence.

Any failure found by those checks should be fixed on a narrowly named `fix/<component>-<problem>`
branch when it is larger than a small conformance correction.
