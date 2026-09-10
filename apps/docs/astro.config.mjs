// @ts-check
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

const lifecycle = process.env.npm_lifecycle_event
const viteCacheDir =
  lifecycle === 'dev'
    ? 'node_modules/.vite-kida-dev'
    : lifecycle === 'typecheck'
      ? 'node_modules/.vite-kida-check'
      : 'node_modules/.vite-kida-build'

export default defineConfig({
  site: 'https://kida.dev',

  // React is the only adapter at v1 (ADR D2). Astro was chosen precisely because adding
  // `@astrojs/svelte` here later renders Svelte demos on the same page (ADR D10).
  integrations: [react(), mdx()],

  // The docs consume built workspace packages, so their browser dependencies are one level
  // removed from the demo entrypoints. Keep development and production optimizer output separate:
  // a production React runtime does not export the `_jsxDEV` function expected by the dev server.
  vite: {
    cacheDir: viteCacheDir,
    optimizeDeps: {
      include: [
        '@kida-ui/react > @zag-js/presence',
        '@kida-ui/react > @zag-js/react',
        '@kida-ui/motion > motion',
      ],
    },
  },

  markdown: {
    shikiConfig: {
      // Astro defaults to `github-dark`, which this site never shows. Light only until the
      // theming story is settled.
      theme: 'github-light',
    },
  },
})
