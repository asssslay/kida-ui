#!/usr/bin/env node
/**
 * ADR D3a gate: `@kida-ui/motion` (and `@kida-ui/styles`) must contain no framework code
 * and no framework dependency, of any kind. This is the boundary that makes framework #2
 * cost an adapter instead of a rewrite, so it is enforced in CI rather than by convention.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Packages that must stay framework-agnostic. */
const AGNOSTIC = ['packages/motion', 'packages/styles']

/** A dependency name is framework-bound if it matches any of these. */
const FRAMEWORK_PATTERNS = [
  /^react(-dom|-native)?$/,
  /^preact(\/|$)/,
  /^vue$/,
  /^@vue\//,
  /^svelte(\/|$)/,
  /^solid-js(\/|$)/,
  /^@angular\//,
  /^@zag-js\/(react|vue|svelte|solid)$/,
  /^framer-motion$/, // the React-bound build of motion — ADR D3
  /^motion\/react/,
]

const isFramework = (name) => FRAMEWORK_PATTERNS.some((re) => re.test(name))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.turbo') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const violations = []

for (const pkgDir of AGNOSTIC) {
  const abs = join(root, pkgDir)
  const manifest = JSON.parse(readFileSync(join(abs, 'package.json'), 'utf8'))

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (isFramework(name)) violations.push(`${pkgDir}/package.json: ${field} contains "${name}"`)
    }
  }

  // Source and build output must not import a framework either — a devDependency can leak.
  for (const file of walk(abs)) {
    if (!/\.(m?[jt]sx?)$/.test(file) || file.endsWith('.test.ts')) continue
    const code = readFileSync(file, 'utf8')
    for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g)) {
      const spec = match[1] ?? match[2]
      if (spec && isFramework(spec)) {
        violations.push(`${relative(root, file)}: imports "${spec}"`)
      }
    }
    if (/\.tsx$/.test(file))
      violations.push(`${relative(root, file)}: JSX file in an agnostic package`)
  }
}

if (violations.length > 0) {
  console.error('\n✗ ADR D3a violated — framework code found in an agnostic package:\n')
  for (const v of violations) console.error(`  ${v}`)
  console.error('\nMove it to packages/react (or the relevant adapter).\n')
  process.exit(1)
}

console.log(`✓ ADR D3a holds — ${AGNOSTIC.join(', ')} are framework-free`)
