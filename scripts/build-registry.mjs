#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { registryItemSchema, registrySchema } from 'shadcn/schema'
import { registryItemSchema as vueItemSchema, registrySchema as vueSchema } from 'shadcn-vue/schema'
import { registryDefinitions } from '../registry/definitions.mjs'
import { vueRegistryDefinitions } from '../registry/vue-definitions.mjs'
import { selectDeclarations } from './registry-types.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const outputDir = join(root, 'registry/r')
const checkOnly = process.argv.includes('--check')

const packageManifests = await Promise.all(
  ['packages/react/package.json', 'packages/vue/package.json', 'packages/motion/package.json'].map(
    async (path) => JSON.parse(await readFile(join(root, path), 'utf8')),
  ),
)
const declaredDependencies = Object.fromEntries(
  ['react', 'vue'].map((framework, index) => [
    framework,
    Object.assign(
      {},
      ...[packageManifests[index], packageManifests[2]].map((manifest) => ({
        ...manifest.dependencies,
        ...manifest.peerDependencies,
      })),
    ),
  ]),
)

function dependencySpecifier(name, framework) {
  const version = declaredDependencies[framework][name]
  if (!version) {
    throw new Error(`Registry dependency "${name}" is not declared by a source package.`)
  }
  if (version.startsWith('workspace:')) {
    throw new Error(
      `Registry dependency "${name}" is workspace-only. Copy its required source or publish it first.`,
    )
  }
  return `${name}@${version}`
}

function assertInsideRoot(path) {
  const pathFromRoot = relative(root, path)
  if (pathFromRoot.startsWith('..') || pathFromRoot.startsWith('/')) {
    throw new Error(`Registry source escapes the repository: ${path}`)
  }
  // Installs ship only the component. Docs playgrounds and their controls live in apps/.
  if (!pathFromRoot.startsWith('packages/')) {
    throw new Error(`Registry source must come from a library package: ${path}`)
  }
}

function addStyleImport(source, styleImport) {
  if (!styleImport) return source

  if (source.startsWith('<script setup')) {
    return source.replace(/(<script setup[^>]*>)/, `$1\nimport '${styleImport}'`)
  }

  const directive = /^(['"]use client['"])\s*\n+/
  if (directive.test(source)) {
    // Keep a blank line before a header comment that follows the directive.
    const gap = /^(['"]use client['"])\s*\n+import\b/.test(source) ? '\n' : '\n\n'
    return source.replace(directive, `$1\n\nimport '${styleImport}'${gap}`)
  }
  return `import '${styleImport}'\n\n${source}`
}

function addCssImports(source, imports = []) {
  if (imports.length === 0) return source
  return `${imports.map((path) => `@import '${path}';`).join('\n')}\n\n${source}`
}

function replaceImports(source, replacements = {}) {
  for (const [from, to] of Object.entries(replacements)) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const specifier = new RegExp(`(['"])${escaped}\\1`, 'g')
    source = source.replace(specifier, (_match, quote) => `${quote}${to}${quote}`)
  }
  return source
}

async function createItem(definition) {
  const files = await Promise.all(
    definition.files.map(async (file) => {
      const sourcePath = resolve(root, file.source)
      assertInsideRoot(sourcePath)

      let content = await readFile(sourcePath, 'utf8')
      if (file.declarations) content = selectDeclarations(content, file.declarations)
      content = replaceImports(content, file.importReplacements)
      content = addStyleImport(content, file.styleImport)
      content = addCssImports(content, file.imports)

      return {
        // shadcn-vue resolves paths under aliases.ui; it does not support React's @ui targets.
        path:
          definition.framework === 'vue'
            ? file.target.replace('@ui/', 'registry/vue/')
            : file.source,
        type: definition.framework === 'vue' ? 'registry:ui' : file.type,
        ...(definition.framework === 'vue' ? {} : { target: file.target }),
        content,
      }
    }),
  )

  return (definition.framework === 'vue' ? vueItemSchema : registryItemSchema).parse({
    $schema:
      definition.framework === 'vue'
        ? 'https://shadcn-vue.com/schema/registry-item.json'
        : 'https://ui.shadcn.com/schema/registry-item.json',
    name: definition.name,
    type: 'registry:ui',
    title: definition.title,
    description: definition.description,
    dependencies: definition.dependencies.map((name) =>
      dependencySpecifier(name, definition.framework ?? 'react'),
    ),
    files,
    categories: [definition.category],
    meta: {
      kida: {
        package: definition.package,
        ...(definition.framework === 'vue' ? { framework: 'vue' } : {}),
      },
    },
  })
}

export async function buildRegistry(framework = 'react') {
  if (!['react', 'vue'].includes(framework))
    throw new Error(`Unknown registry framework: ${framework}`)
  const definitions = framework === 'vue' ? vueRegistryDefinitions : registryDefinitions
  const names = new Set()
  for (const definition of definitions) {
    if (names.has(definition.name)) throw new Error(`Duplicate registry item: ${definition.name}`)
    names.add(definition.name)
  }

  const items = await Promise.all(definitions.map(createItem))
  const registry = (framework === 'vue' ? vueSchema : registrySchema).parse({
    $schema:
      framework === 'vue'
        ? 'https://shadcn-vue.com/schema/registry.json'
        : 'https://ui.shadcn.com/schema/registry.json',
    name: framework === 'vue' ? 'kida-ui-vue' : 'kida-ui',
    homepage: 'https://kida-ui.onrender.com',
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
  const vue = await buildRegistry('vue')
  files.set(join(outputDir, 'vue/registry.json'), `${JSON.stringify(vue.registry, null, 2)}\n`)
  for (const item of vue.items)
    files.set(join(outputDir, 'vue', `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`)
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
    generated = (await readdir(outputDir, { recursive: true })).filter((file) =>
      file.endsWith('.json'),
    )
  } catch {
    // A missing directory is already reported through its expected files.
  }
  const expectedNames = new Set([...files.keys()].map((path) => relative(outputDir, path)))
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

  for (const file of await readdir(outputDir, { recursive: true })) {
    const path = join(outputDir, file)
    if (file.endsWith('.json') && !expectedPaths.has(path)) await rm(path)
  }
}

async function main() {
  const files = await expectedFiles()
  if (checkOnly) {
    await check(files)
    console.log(`✓ ${files.size - 2} React and Vue registry items are current and schema-valid`)
  } else {
    await write(files)
    console.log(`✓ wrote ${files.size - 2} React and Vue registry items to registry/r`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
