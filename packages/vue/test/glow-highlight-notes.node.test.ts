import { readFile } from 'node:fs/promises'
import { GLOW_PALETTES } from '@kida-ui/motion'
import { expect, test } from 'vitest'

/*
 * The agent notes in KidaGlowHighlight.vue ship with every copied component, so they must not
 * drift from the code. These checks compare the notes with the real option types, the
 * component's defaults, and the Vue docs demos they describe.
 */

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')
const component = await read('../src/KidaGlowHighlight.vue')
const engine = await read('../../motion/src/glow-highlight.ts')
const math = await read('../../motion/src/glow-highlight-math.ts')
const demos = await Promise.all(
  ['glow-highlight-finishes', 'glow-highlight-after-dark'].map((name) =>
    read(`../../../apps/docs/src/demos/${name}.vue`),
  ),
)

const notes = component.match(/\/\*\n \* AI agent notes[\s\S]*?\*\//)?.[0] ?? ''

/** `export type Name = 'a' | 'b'` → ['a', 'b'] */
function union(source: string, name: string) {
  const declaration = source.match(new RegExp(`export type ${name} = ([^\\n]+)`))?.[1] ?? ''
  return [...declaration.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

function unquote(value: string) {
  return value.trim().replace(/^'(.*)'$/, '$1')
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

/** withDefaults entries in the component: `finish: 'glow',` → finish: glow. */
function componentDefaults() {
  const entries = component.match(/withDefaults\(defineProps<\w+>\(\), \{([\s\S]*?)\}\)/)?.[1]
  return new Map(
    [...(entries ?? '').matchAll(/(\w+): ([^,\n]+),/g)].map((match) => [
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
    for (const [, name = '', value = ''] of (match[1] ?? '').matchAll(/:?(\w+)="([^"]*)"/g))
      if (defaults.get(name) !== value) attributes[name] = value
    return attributes
  })
}

const key = (look: Record<string, string>) => JSON.stringify(Object.entries(look).sort())

test('the agent notes open the component script', () => {
  expect(component.startsWith('<script setup lang="ts">\n/*\n * AI agent notes')).toBe(true)
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

test('the example looks use real settings and match the Vue docs demos both ways', () => {
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
