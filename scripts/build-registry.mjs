#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registryItemSchema, registrySchema } from 'shadcn/schema'
import { registryDefinitions } from '../registry/definitions.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const outputDir = join(root, 'registry/r')
const checkOnly = process.argv.includes('--check')

const packageManifest = JSON.parse(
  await readFile(join(root, 'packages/react/package.json'), 'utf8'),
)
const declaredDependencies = {
  ...packageManifest.dependencies,
  ...packageManifest.peerDependencies,
}

function dependencySpecifier(name) {
  const version = declaredDependencies[name]
  if (!version) {
    throw new Error(`Registry dependency "${name}" is not declared by @kida-ui/react.`)
  }
  return version.startsWith('workspace:') ? name : `${name}@${version}`
}

function assertInsideRoot(path) {
  const pathFromRoot = relative(root, path)
  if (pathFromRoot.startsWith('..') || pathFromRoot.startsWith('/')) {
    throw new Error(`Registry source escapes the repository: ${path}`)
  }
}

function addStyleImport(source, styleImport) {
  if (!styleImport) return source

  const directive = /^(['"]use client['"])\s*\n+/
  if (directive.test(source)) {
    return source.replace(directive, `$1\n\nimport '${styleImport}'\n`)
  }
  return `import '${styleImport}'\n\n${source}`
}

function addCssImports(source, imports = []) {
  if (imports.length === 0) return source
  return `${imports.map((path) => `@import '${path}';`).join('\n')}\n\n${source}`
}

async function createItem(definition) {
  const files = await Promise.all(
    definition.files.map(async (file) => {
      const sourcePath = resolve(root, file.source)
      assertInsideRoot(sourcePath)

      let content = await readFile(sourcePath, 'utf8')
      content = addStyleImport(content, file.styleImport)
      content = addCssImports(content, file.imports)

      return {
        path: file.source,
        type: file.type,
        target: file.target,
        content,
      }
    }),
  )

  return registryItemSchema.parse({
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: definition.name,
    type: 'registry:ui',
    title: definition.title,
    description: definition.description,
    dependencies: definition.dependencies.map(dependencySpecifier),
    files,
    categories: [definition.category],
    meta: {
      kida: {
        package: definition.package,
      },
    },
  })
}

export async function buildRegistry() {
  const names = new Set()
  for (const definition of registryDefinitions) {
    if (names.has(definition.name)) throw new Error(`Duplicate registry item: ${definition.name}`)
    names.add(definition.name)
  }

  const items = await Promise.all(registryDefinitions.map(createItem))
  const registry = registrySchema.parse({
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'kida-ui',
    homepage: 'https://kida.dev',
    items: items.map(({ $schema: _schema, ...item }) => item),
  })

  return { items, registry }
}

async function expectedFiles() {
  const { items, registry } = await buildRegistry()
  const files = new Map([
    [join(root, 'registry/registry.json'), `${JSON.stringify(registry, null, 2)}\n`],
    ...items.map((item) => [
      join(outputDir, `${item.name}.json`),
      `${JSON.stringify(item, null, 2)}\n`,
    ]),
  ])
  return files
}

async function check(files) {
  const failures = []
  for (const [path, expected] of files) {
    let actual
    try {
      actual = await readFile(path, 'utf8')
    } catch {
      failures.push(`${relative(root, path)} is missing`)
      continue
    }
    if (actual !== expected) failures.push(`${relative(root, path)} is stale`)
  }

  let generated = []
  try {
    generated = (await readdir(outputDir)).filter((file) => file.endsWith('.json'))
  } catch {
    // A missing directory is already reported through its expected files.
  }
  const expectedNames = new Set([...files.keys()].map((path) => path.split('/').at(-1)))
  for (const file of generated) {
    if (!expectedNames.has(file)) failures.push(`registry/r/${file} is no longer defined`)
  }

  if (failures.length > 0) {
    throw new Error(
      `Generated registry is not current:\n- ${failures.join('\n- ')}\nRun pnpm registry:build.`,
    )
  }
}

async function write(files) {
  await mkdir(outputDir, { recursive: true })
  const expectedPaths = new Set(files.keys())

  for (const [path, content] of files) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }

  for (const file of await readdir(outputDir)) {
    const path = join(outputDir, file)
    if (file.endsWith('.json') && !expectedPaths.has(path)) await rm(path)
  }
}

async function main() {
  const files = await expectedFiles()
  if (checkOnly) {
    await check(files)
    console.log(`✓ ${files.size - 1} registry items are current and schema-valid`)
  } else {
    await write(files)
    console.log(`✓ wrote ${files.size - 1} registry items to registry/r`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
