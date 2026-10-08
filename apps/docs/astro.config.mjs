// @ts-check
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'

const lifecycle = process.env.npm_lifecycle_event
const viteCacheDir =
  lifecycle === 'dev'
    ? 'node_modules/.vite-kida-dev'
    : lifecycle === 'typecheck'
      ? 'node_modules/.vite-kida-check'
      : 'node_modules/.vite-kida-build'

const site = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:4321'

export default defineConfig({
  site,

  // Keep React transforms and renderer detection out of Vue SFCs and their virtual modules.
  integrations: [react({ exclude: [/\.vue(?:\?|$)/] }), vue(), mdx()],

  // The docs consume built workspace packages, so their browser dependencies are one level
  // removed from the demo entrypoints. Keep development and production optimizer output separate:
  // a production React runtime does not export the `_jsxDEV` function expected by the dev server.
  vite: {
    cacheDir: viteCacheDir,
    optimizeDeps: {
      include: [
        '@kida-ui/react > @zag-js/presence',
        '@kida-ui/react > @zag-js/react',
        '@kida-ui/vue > @zag-js/vue',
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
