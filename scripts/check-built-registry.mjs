#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const files = [
  'registry.json',
  ...(await readdir(join(root, 'registry/r'), { recursive: true })).filter((file) =>
    file.endsWith('.json'),
  ),
]
for (const file of files) {
  const source = file === 'registry.json' ? 'registry/registry.json' : `registry/r/${file}`
  const destination = `apps/docs/dist/r/${file}`
  const [generated, published] = await Promise.all([
    readFile(join(root, source), 'utf8'),
    readFile(join(root, destination), 'utf8').catch(() => {
      throw new Error(`Docs build did not publish /r/${file}`)
    }),
  ])
  if (published !== generated) throw new Error(`Published /r/${file} does not match ${source}`)
}
console.log('✓ docs build publishes both generated registry catalogs and every React/Vue item')
