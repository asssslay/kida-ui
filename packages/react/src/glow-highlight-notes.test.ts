import { GLOW_PALETTES } from '@kida-ui/motion'
import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'

// Paths are relative to the package root, where the browser test server runs.

/*
 * The agent notes at the top of glow-highlight.tsx ship with every copied component, so they
 * must not drift from the code. These checks read the sources as text and compare the notes
 * with the real option types, the component's defaults, and the docs demos they describe.
 */

const component = await commands.readFile('src/glow-highlight.tsx')
const engine = await commands.readFile('../motion/src/glow-highlight.ts')
const math = await commands.readFile('../motion/src/glow-highlight-math.ts')
const demos = await Promise.all(
  ['glow-highlight-finishes', 'glow-highlight-after-dark'].map((name) =>
    commands.readFile(`../../apps/docs/src/demos/${name}.react.tsx`),
  ),
)

const notes = component.match(/\/\*\n \* AI agent notes[\s\S]*?\*\//)?.[0] ?? ''

/** `export type Name = 'a' | 'b'` → ['a', 'b'] */
function union(source: string, name: string) {
  const declaration = source.match(new RegExp(`export type ${name} = ([^\\n]+)`))?.[1] ?? ''
  return [...declaration.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

/** Rows of the settings table: name → { values, default }. */
function settings() {
  const rows = new Map<string, { values: string[]; fallback: string }>()
  for (const match of notes.matchAll(/^ \* {3}(\w+) {2,}(.+?) {2,}default (.+)$/gm)) {
    const [, name = '', description = '', fallback = ''] = match
    rows.set(name, {
      values: [...description.matchAll(/'([^']+)'/g)].map((value) => value[1] ?? ''),
      fallback: unquote(fallback),
    })
  }
  return rows
}

/** Destructured prop defaults in the component: `finish = 'glow',` → finish: glow. */
function componentDefaults() {
  const parameters = component.match(/function GlowHighlight\(\s*\{([\s\S]*?)\.\.\.props/)?.[1]
  return new Map(
    [...(parameters ?? '').matchAll(/(\w+) = ([^,\n]+),/g)].map((match) => [
      match[1] ?? '',
      unquote(match[2] ?? ''),
    ]),
  )
}

/** Every `<GlowHighlight …>` usage → its attributes, with values equal to a default dropped. */
function looks(source: string) {
  const defaults = componentDefaults()
  return [...source.matchAll(/<GlowHighlight\b([^>]*)>/g)].map((match) => {
    const attributes: Record<string, string> = {}
    for (const [, name = '', text, expression] of (match[1] ?? '').matchAll(
      /(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g,
    )) {
      const value = text ?? expression ?? ''
      if (defaults.get(name) !== value) attributes[name] = value
    }
    return attributes
  })
}

const key = (look: Record<string, string>) => JSON.stringify(Object.entries(look).sort())

function unquote(value: string) {
  return value.trim().replace(/^'(.*)'$/, '$1')
}

test('the agent notes are present below the client directive', () => {
  expect(component.startsWith("'use client'\n\n/*\n * AI agent notes")).toBe(true)
})

test('the notes list every setting with its real default', () => {
  const options = engine.match(/export interface GlowHighlightOptions \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const names = [...options.matchAll(/^ {2}(\w+)\?:/gm)].map((match) => match[1])
  const rows = settings()
  expect([...rows.keys()].sort()).toEqual([...names, 'palette'].sort())

  const defaults = componentDefaults()
  for (const [name, row] of rows) expect(row.fallback, name).toBe(defaults.get(name))
})

test('the notes list exactly the real finishes, palettes, and triggers', () => {
  const rows = settings()
  expect(rows.get('finish')?.values).toEqual(union(math, 'GlowHighlightFinish'))
  expect(rows.get('palette')?.values).toEqual(union(math, 'GlowHighlightPalette'))
  expect(rows.get('palette')?.values).toEqual(Object.keys(GLOW_PALETTES))
  expect(rows.get('trigger')?.values).toEqual(union(engine, 'GlowHighlightTrigger'))
})

test('the example looks use real settings and match the docs demos both ways', () => {
  const rows = settings()
  const examples = looks(notes)
  expect(examples.length).toBeGreaterThan(0)
  for (const look of examples) {
    for (const [name, value] of Object.entries(look)) {
      const row = rows.get(name)
      expect(row, `unknown setting "${name}"`).toBeDefined()
      if (row?.values.length) expect(row.values).toContain(value)
    }
  }

  const documented = new Set(examples.map(key))
  const demonstrated = new Set(demos.flatMap(looks).map(key))
  expect([...documented].sort()).toEqual([...demonstrated].sort())
})
