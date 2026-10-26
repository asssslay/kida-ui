# ImageText — approved React integration

The user approved promotion of the continuous photo fill for **React only**, with the
white background composition and no spans, labels, buttons, or customization inputs
inside the preview. The earlier pan and dark compositions were not promoted.

The playground and website now share `apps/docs/src/demos/image-text-basic.react.tsx`.
Run `pnpm --filter @kida-ui/playground dev` and open `/?demo=image-text`, or run
`pnpm --filter @kida-ui/docs dev` and open `/docs/image-text`.

The canonical controller is `packages/motion/src/image-text.ts`, the React adapter is
`packages/react/src/image-text.tsx`, and the shared CSS is
`packages/styles/components/image-text.css`. The generated registry item is `image-text`.
Change the image, crop, duration, zoom, or controlled `paused` prop in code.

The default cycle takes 9.6 seconds, pauses offscreen or in a hidden document, and is
static with reduced motion. There is no per-frame JavaScript or React render loop;
background-position animation repaints the text area. New photographs and tint changes
need contrast review across the whole motion path.

The existing floral photo `/demo/image-text/pink-bloom.webp` is by Anthony Melone:
<https://unsplash.com/photos/W6zVhDL_ijg>, under the
[Unsplash License](https://unsplash.com/license). Credits remain in the website's
component documentation and `apps/docs/public/demo/image-text/README.md`.

Run `pnpm --filter @kida-ui/playground test:image-text`, the playground typecheck/build,
and `pnpm verify` from the repository root.
