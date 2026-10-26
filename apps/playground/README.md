# React / Vite playground

Run `pnpm --filter @kida-ui/playground dev` from the repository root.

ImageText is available at `/?demo=image-text` and on the website at `/docs/image-text`.
The approved React composition uses a licensed floral photograph, continuous crop movement,
and a white background, with no spans, buttons, or customization inputs in the preview.
The playground renders the same demo as the website; its canonical implementation lives in
`packages/motion`, `packages/styles`, and `packages/react`. See
[`src/image-text/README.md`](src/image-text/README.md) for approval scope and credits.
Run `pnpm --filter @kida-ui/playground test:image-text` alongside typecheck/build.

The playground index also includes the existing SpaceType, Reveal, and Collapse studies.
