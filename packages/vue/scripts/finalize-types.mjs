import { readFile, writeFile } from 'node:fs/promises'

// The runtime is bundled; only declarations reference individual SFC modules. A .vue.js
// specifier resolves to the emitted .vue.d.ts under both Bundler and NodeNext resolution.
const path = new URL('../dist/index.d.ts', import.meta.url)
const source = await readFile(path, 'utf8')
await writeFile(path, source.replaceAll(".vue'", ".vue.js'"))
