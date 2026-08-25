import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  dts: true,
  clean: true,
  // The package is `"type": "module"`, so plain .js/.d.ts keeps the exports map readable.
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
})
