// @ts-check
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://kida.dev',

  // React is the only adapter at v1 (ADR D2). Astro was chosen precisely because adding
  // `@astrojs/svelte` here later renders Svelte demos on the same page (ADR D10).
  integrations: [react(), mdx()],

  markdown: {
    shikiConfig: {
      // Astro defaults to `github-dark`, which this site never shows. Light only until the
      // theming story is settled.
      theme: 'github-light',
    },
  },
})
