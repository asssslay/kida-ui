#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { buildRegistry } from './build-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixture = join(root, 'packages/react/.copy-source-fixture')

function targetPath(target) {
  const placeholders = {
    '@ui/': 'src/components/ui/',
    '@components/': 'src/components/',
    '@hooks/': 'src/hooks/',
    '@lib/': 'src/lib/',
  }

  for (const [placeholder, replacement] of Object.entries(placeholders)) {
    if (target.startsWith(placeholder)) return target.replace(placeholder, replacement)
  }
  throw new Error(`Fixture cannot resolve registry target: ${target}`)
}

function diagnosticsText(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => fixture,
    getNewLine: () => '\n',
  })
}

async function main() {
  const { items } = await buildRegistry()
  const files = new Map()

  for (const item of items) {
    for (const file of item.files) {
      if (!file.target || file.content === undefined) {
        throw new Error(`${item.name}: every copied file needs a target and generated content`)
      }
      const path = join(fixture, targetPath(file.target))
      const existing = files.get(path)
      if (existing !== undefined && existing !== file.content) {
        throw new Error(`${item.name}: conflicting copied content for ${file.target}`)
      }
      files.set(path, file.content)
    }
  }

  await rm(fixture, { recursive: true, force: true })
  try {
    const environmentTypes = join(fixture, 'src/env.d.ts')
    await mkdir(dirname(environmentTypes), { recursive: true })
    await writeFile(environmentTypes, "declare module '*.css'\n")

    for (const [path, content] of files) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    }

    const rootNames = [
      environmentTypes,
      ...[...files.keys()].filter((path) => /\.[cm]?[jt]sx?$/.test(path)),
    ]
    const program = ts.createProgram(rootNames, {
      allowArbitraryExtensions: true,
      esModuleInterop: true,
      isolatedModules: true,
      jsx: ts.JsxEmit.ReactJSX,
      lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    if (diagnostics.length > 0) throw new Error(diagnosticsText(diagnostics))

    console.log(
      `✓ ${items.length} registry items typecheck from copied source (${files.size} files)`,
    )
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
