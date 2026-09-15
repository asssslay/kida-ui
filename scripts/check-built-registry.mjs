#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const generatedPath = join(root, 'registry/registry.json')
const publishedPath = join(root, 'apps/docs/dist/r/registry.json')

const [generated, published] = await Promise.all([
  readFile(generatedPath, 'utf8'),
  readFile(publishedPath, 'utf8').catch(() => {
    throw new Error('Docs build did not publish /r/registry.json')
  }),
])

if (published !== generated) {
  throw new Error('Published /r/registry.json does not match generated registry/registry.json')
}

console.log('✓ docs build publishes the current registry catalog at /r/registry.json')
