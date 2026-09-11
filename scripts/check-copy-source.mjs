#!/usr/bin/env node

import { access, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { buildRegistry } from './build-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixtureRoot = await mkdtemp(join(tmpdir(), 'kida-copy-source-'))
const vitePath = join(root, 'apps/playground/node_modules/vite/dist/node/index.js')
const { build: viteBuild } = await import(pathToFileURL(vitePath).href)

const hostDependencies = new Set(['react', 'react-dom'])
const dependencySearchRoots = [
  join(root, 'node_modules'),
  join(root, 'packages/react/node_modules'),
  join(root, 'packages/motion/node_modules'),
  join(root, 'apps/playground/node_modules'),
]

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

function dependencyName(specifier) {
  const versionSeparator = specifier.lastIndexOf('@')
  return versionSeparator > 0 ? specifier.slice(0, versionSeparator) : specifier
}

function importedPackage(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

function diagnosticsText(diagnostics, directory) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => directory,
    getNewLine: () => '\n',
  })
}

function moduleSpecifiers(filePath, source) {
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind)
  const specifiers = []

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return specifiers
}

function cssImports(source) {
  return [...source.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]\s*\)?/g)].map(
    (match) => match[1],
  )
}

function localCandidates(importingFile, specifier) {
  const requested = resolve(dirname(importingFile), specifier)
  const extension = extname(requested)
  const candidates = [requested]

  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    const withoutExtension = requested.slice(0, -extension.length)
    candidates.push(`${withoutExtension}.ts`, `${withoutExtension}.tsx`)
  } else if (!extension) {
    candidates.push(
      `${requested}.ts`,
      `${requested}.tsx`,
      `${requested}.css`,
      join(requested, 'index.ts'),
      join(requested, 'index.tsx'),
    )
  }

  return candidates
}

function validateImports(item, files) {
  const dependencyNames = new Set(item.dependencies.map(dependencyName))

  for (const dependency of dependencyNames) {
    if (dependency.startsWith('@kida-ui/')) {
      throw new Error(`${item.name}: copied source cannot require unpublished ${dependency}`)
    }
  }

  for (const [filePath, content] of files) {
    const specifiers = filePath.endsWith('.css')
      ? cssImports(content)
      : /\.[cm]?[jt]sx?$/.test(filePath)
        ? moduleSpecifiers(filePath, content)
        : []

    for (const specifier of specifiers) {
      if (specifier.startsWith('@kida-ui/')) {
        throw new Error(`${item.name}: ${filePath} imports unpublished ${specifier}`)
      }
      if (specifier.startsWith('.')) {
        if (!localCandidates(filePath, specifier).some((candidate) => files.has(candidate))) {
          throw new Error(`${item.name}: ${filePath} has a missing local import ${specifier}`)
        }
        continue
      }
      if (specifier.startsWith('/') || specifier.startsWith('#')) {
        throw new Error(`${item.name}: ${filePath} has an unsupported import ${specifier}`)
      }

      const packageName = importedPackage(specifier)
      if (!hostDependencies.has(packageName) && !dependencyNames.has(packageName)) {
        throw new Error(
          `${item.name}: ${filePath} imports undeclared runtime dependency ${packageName}`,
        )
      }
    }
  }

  return dependencyNames
}

async function findDependency(packageName) {
  for (const directory of dependencySearchRoots) {
    const candidate = join(directory, packageName)
    try {
      await access(candidate)
      return realpath(candidate)
    } catch {
      // Try the next installed workspace dependency tree.
    }
  }
  throw new Error(`Copy-source check cannot find installed dependency ${packageName}`)
}

async function linkDependency(fixture, packageName) {
  const target = join(fixture, 'node_modules', packageName)
  await mkdir(dirname(target), { recursive: true })
  await symlink(await findDependency(packageName), target, 'dir')
}

async function writeItemFixture(item) {
  const fixture = join(fixtureRoot, item.name)
  const environmentTypes = join(fixture, 'src/env.d.ts')
  const files = new Map()

  for (const file of item.files) {
    if (!file.target || file.content === undefined) {
      throw new Error(`${item.name}: every copied file needs a target and generated content`)
    }
    const path = join(fixture, targetPath(file.target))
    if (files.has(path)) throw new Error(`${item.name}: duplicate copied target ${file.target}`)
    files.set(path, file.content)
  }

  const dependencies = validateImports(item, files)
  await mkdir(dirname(environmentTypes), { recursive: true })
  await writeFile(environmentTypes, "declare module '*.css'\n")

  for (const [path, content] of files) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }

  const linkedDependencies = new Set([...hostDependencies, ...dependencies, '@types/react'])
  for (const dependency of linkedDependencies) await linkDependency(fixture, dependency)

  return { environmentTypes, files, fixture }
}

function typecheckItem(item, { environmentTypes, files, fixture }) {
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
  if (diagnostics.length > 0) {
    throw new Error(
      `${item.name} failed isolated typecheck:\n${diagnosticsText(diagnostics, fixture)}`,
    )
  }
}

async function bundleItem(item, { files, fixture }) {
  const entryTarget = item.files.find(
    (file) => file.type === 'registry:ui' && file.target?.endsWith('.tsx'),
  )?.target
  if (!entryTarget) throw new Error(`${item.name}: no React component entry was generated`)
  const entry = join(fixture, targetPath(entryTarget))
  if (!files.has(entry)) throw new Error(`${item.name}: generated component entry is missing`)

  await viteBuild({
    configFile: false,
    logLevel: 'silent',
    root: fixture,
    build: {
      emptyOutDir: false,
      lib: { cssFileName: 'style', entry, formats: ['es'] },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
      },
      write: false,
    },
  })
}

async function main() {
  const { items } = await buildRegistry()

  try {
    let fileCount = 0
    for (const item of items) {
      const fixture = await writeItemFixture(item)
      typecheckItem(item, fixture)
      await bundleItem(item, fixture)
      fileCount += fixture.files.size
    }

    console.log(
      `✓ ${items.length} registry items pass standalone import, typecheck, and bundle checks (${fileCount} files)`,
    )
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
