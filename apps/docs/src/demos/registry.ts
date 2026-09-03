import type { CodeLang } from '../components/code-lang'

/**
 * The frameworks a demo can be written in. React is the only adapter at v1 (ADR D2), so
 * this union has one member today — but every consumer already reads it as a set, which
 * is what keeps adding Svelte a new glob rather than a rewrite (ADR D10).
 */
export type Framework = 'react'

export const FRAMEWORKS: readonly Framework[] = ['react']

export interface DemoVariant {
  /** The demo file's own text, verbatim, for the code block beside it. */
  source: string
  lang: CodeLang
}

export type Demo = Partial<Record<Framework, DemoVariant>>

/*
 * Demo sources, read straight off disk at build time.
 *
 * Each demo is one real file used twice: MDX imports it to run, and this reads the same
 * path as text to display. Writing the snippet out a second time by hand is the drift ADR
 * R3 guards against in the registry — a live demo and a code block that quietly stop
 * agreeing — so there is one file behind both. It also means demos are typechecked and
 * linted like the rest of the repo, because they are ordinary source files.
 *
 * The component deliberately does NOT live here. A client directive only works on a
 * component that was statically imported into the `.astro` or `.mdx` file rendering it —
 * Astro resolves the import at compile time to emit the hydration script and to include
 * the module in the client bundle. A component pulled out of a runtime map has neither,
 * and fails the build with `NoMatchingImport`. So the island is passed in as a slot and
 * this module answers only for the text.
 */
const sources = import.meta.glob<string>('./*.react.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
})

/** `./reveal-basic.react.tsx` → `reveal-basic` */
const NAME = /^\.\/(.+)\.react\.tsx$/

const demos = new Map<string, Demo>()

for (const [path, source] of Object.entries(sources)) {
  const name = NAME.exec(path)?.[1]
  if (!name) continue
  demos.set(name, { ...demos.get(name), react: { source, lang: 'tsx' } })
}

/**
 * Throws rather than rendering an empty box: a typo in an MDX page should fail the build,
 * not ship a page with a hole in it.
 */
export function getDemo(name: string): Demo {
  const demo = demos.get(name)
  if (!demo) {
    const known = [...demos.keys()].sort().join(', ')
    throw new Error(`Unknown demo "${name}". Known demos: ${known || '(none)'}`)
  }
  return demo
}
