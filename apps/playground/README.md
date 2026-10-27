# React / Vite playground

Run `pnpm --filter @kida-ui/playground dev` from the repository root.

ImageText is available at `/?demo=image-text` and on the website at `/docs/image-text`.
The approved React composition uses a licensed floral photograph, continuous crop movement,
and a white background, with no spans, buttons, or customization inputs in the preview.
The playground renders the same demo as the website; its canonical implementation lives in
`packages/motion`, `packages/styles`, and `packages/react`. See
[`src/image-text/README.md`](src/image-text/README.md) for approval scope and credits.
Run `pnpm --filter @kida-ui/playground test:image-text` alongside typecheck/build.

The playground index also includes the existing SpaceType, DualWave, Reveal, and Collapse studies.

DualWave is on `/`. Open `/?demo=dual-wave` for the full-window study,
inspired by
[Valentin Descombes' Codrops demo](https://tympanus.net/Tutorials/DualWaveTextAnimation/).

The prototype was approved and promoted to the library: the controller lives in
`@kida-ui/motion` (`dual-wave.ts`), the styles in `@kida-ui/styles`
(`components/dual-wave.css`), and the React component in `@kida-ui/react`. The playground
renders the same interactive demo as the docs page
(`apps/docs/src/demos/dual-wave-playground.react.tsx`) inside its own study chrome, so there is
one implementation to review. Demo photos are served from `apps/docs/public`, which this app
uses as its public directory.

- Scroll over the stage, swipe, or click either text column.
- Focus the stage and use arrow keys, Page Up / Down, or Home / End. The full-window
  study focuses the stage on entry. Keyboard handling stays within the carousel.
- Wave strength changes horizontal travel and tile parting; response changes settling speed.
- The image defaults to **Mosaic**: the photo is cut into a grid (2–5 columns, rows
  follow the 3:4 frame). The next image cascades in tile by tile, starting from the
  bottom row with a curved front. Tiles separate as you scroll faster and close up again
  at rest. **Frame** shows one full photo and switches to the next one instantly.
- Hold Shift while scrolling to scroll the surrounding playground past the stage.
- Reduced motion keeps navigation functional with immediate selection and no wave travel.

Motion uses one on-demand `requestAnimationFrame` loop, time-based damping,
transform/opacity writes, and cached resize measurements. React only updates when
the selected item changes. The loop stops when settled, offscreen, or when the
document is hidden. Photos are shown only once decoded, so swaps never flash the
placeholder. The 24 WebPs total approximately 1.4 MB and are cropped to 600 × 750 to bound
decode memory. They come from Unsplash under the Unsplash License; credits are in
`apps/docs/public/demo/dual-wave/README.md`.

Run `pnpm --filter @kida-ui/playground test:dual-wave` for the DualWave math unit tests and
browser tests. Also run the playground `typecheck` and `build` scripts. If library exports
have changed, build `@kida-ui/motion` and `@kida-ui/react` first to refresh their declarations.
