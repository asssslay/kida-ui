import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  dts: true,
  clean: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  // Rolldown drops per-module 'use client' directives when it merges modules into one
  // chunk, which silently breaks the Next.js App Router. Every export in this package is
  // client-side by nature (hooks, refs, DOM measurement), so the whole bundle is marked.
  outputOptions: { banner: "'use client'" },
  // `dependencies` (@kida-ui/motion) and `peerDependencies` (react) are external by default.
})
