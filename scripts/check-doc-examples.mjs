#!/usr/bin/env node

import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { buildRegistry } from './build-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const examplesDirectory = join(root, 'apps/docs/src/examples/quick-start')
const componentDocsDirectory = join(root, 'apps/docs/src/content/components')
const vitePath = join(root, 'apps/playground/node_modules/vite/dist/node/index.js')
const { build: viteBuild } = await import(pathToFileURL(vitePath).href)

const hostDependencies = new Set(['react', 'react-dom'])
const dependencySearchRoots = [
  join(root, 'node_modules'),
  join(root, 'packages/react/node_modules'),
  join(root, 'packages/motion/node_modules'),
  join(root, 'apps/playground/node_modules'),
]
const exampleSuffix = '.react.tsx'
const requiredHeadings = [
  '## Quick start',
  '## Customization',
  '## API',
  '## Accessibility and input behavior',
  '## Troubleshooting',
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
  throw new Error(`Documentation fixture cannot resolve registry target: ${target}`)
}

function dependencyName(specifier) {
  const versionSeparator = specifier.lastIndexOf('@')
  return versionSeparator > 0 ? specifier.slice(0, versionSeparator) : specifier
}

function moduleSpecifiers(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const specifiers = []

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return specifiers
}

function diagnosticsText(diagnostics, directory) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => directory,
    getNewLine: () => '\n',
  })
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
  throw new Error(`Documentation check cannot find installed dependency ${packageName}`)
}

async function linkDependency(fixture, packageName) {
  const target = join(fixture, 'node_modules', packageName)
  await mkdir(dirname(target), { recursive: true })
  await symlink(await findDependency(packageName), target, 'dir')
}

function compareNames(label, expectedNames, actualNames) {
  const missing = [...expectedNames].filter((name) => !actualNames.has(name))
  const orphaned = [...actualNames].filter((name) => !expectedNames.has(name))
  const problems = []
  if (missing.length > 0) problems.push(`missing ${label}: ${missing.sort().join(', ')}`)
  if (orphaned.length > 0) problems.push(`orphaned ${label}: ${orphaned.sort().join(', ')}`)
  if (problems.length > 0) throw new Error(problems.join('\n'))
}

function componentEntry(item) {
  const entry = item.files.find(
    (file) => file.type === 'registry:ui' && file.target?.endsWith('.tsx'),
  )
  if (!entry) throw new Error(`${item.name}: no React component entry was generated`)
  return entry
}

async function readExamples(items) {
  const files = (await readdir(examplesDirectory)).filter((file) => file.endsWith(exampleSuffix))
  const names = new Set(files.map((file) => file.slice(0, -exampleSuffix.length)))
  const itemNames = new Set(items.map((item) => item.name))
  compareNames('quick starts', itemNames, names)

  const examples = new Map()
  for (const file of files) {
    const name = file.slice(0, -exampleSuffix.length)
    const source = await readFile(join(examplesDirectory, file), 'utf8')
    const item = items.find((candidate) => candidate.name === name)
    const entry = componentEntry(item)
    const expectedImport = `@/${targetPath(entry.target)
      .replace(/^src\//, '')
      .replace(/\.tsx$/, '')}`
    if (!moduleSpecifiers(file, source).includes(expectedImport)) {
      throw new Error(`${file}: expected an import from ${expectedImport}`)
    }
    examples.set(file, source)
  }
  return examples
}

async function checkComponentDocs(items) {
  const files = (await readdir(componentDocsDirectory)).filter((file) => file.endsWith('.mdx'))
  const names = new Set(files.map((file) => file.slice(0, -'.mdx'.length)))
  const itemNames = new Set(items.map((item) => item.name))
  compareNames('component docs', itemNames, names)

  for (const file of files) {
    const name = file.slice(0, -'.mdx'.length)
    const source = await readFile(join(componentDocsDirectory, file), 'utf8')
    if (/^\s*```(?:js|jsx|ts|tsx|javascript|typescript)\s*$/m.test(source)) {
      throw new Error(`${file}: JavaScript and TypeScript examples must be checked source files`)
    }
    if (!source.includes(`<QuickStart name="${name}" />`)) {
      throw new Error(`${file}: quick start must render its checked source file`)
    }
    const lines = new Set(source.split(/\r?\n/).map((line) => line.trim()))
    for (const heading of requiredHeadings) {
      if (!lines.has(heading)) throw new Error(`${file}: missing required heading ${heading}`)
    }
  }

  const installationPath = join(root, 'apps/docs/src/pages/docs/installation.astro')
  const installationSource = await readFile(installationPath, 'utf8')
  if (!installationSource.includes('<QuickStart name="text-bloom" />')) {
    throw new Error('installation.astro: usage must reuse the checked TextBloom quick start')
  }
}

async function writeFixture(fixture, items, examples) {
  const generatedFiles = new Map()
  const dependencies = new Set(hostDependencies)

  for (const item of items) {
    for (const dependency of item.dependencies) dependencies.add(dependencyName(dependency))
    for (const file of item.files) {
      if (!file.target || file.content === undefined) {
        throw new Error(`${item.name}: every copied file needs a target and generated content`)
      }
      const relativePath = targetPath(file.target)
      const existing = generatedFiles.get(relativePath)
      if (existing !== undefined && existing !== file.content) {
        throw new Error(`${item.name}: shared copied target ${file.target} has conflicting content`)
      }
      generatedFiles.set(relativePath, file.content)
    }
  }

  for (const [relativePath, content] of generatedFiles) {
    const path = join(fixture, relativePath)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }

  const examplePaths = []
  for (const [file, source] of examples) {
    const path = join(fixture, 'src/examples', file)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, source)
    examplePaths.push(path)
  }

  const environmentTypes = join(fixture, 'src/env.d.ts')
  await writeFile(environmentTypes, "declare module '*.css'\n")

  const entry = join(fixture, 'src/examples/index.ts')
  await writeFile(
    entry,
    `${[...examples.keys()]
      .sort()
      .map((file) => `import './${file.replace(/\.tsx$/, '')}'`)
      .join('\n')}\n`,
  )

  dependencies.add('@types/react')
  for (const dependency of dependencies) await linkDependency(fixture, dependency)

  return {
    entry,
    environmentTypes,
    examplePaths,
    generatedPaths: [...generatedFiles.keys()].map((path) => join(fixture, path)),
  }
}

function typecheckFixture(fixture, { entry, environmentTypes, examplePaths, generatedPaths }) {
  const rootNames = [
    environmentTypes,
    entry,
    ...examplePaths,
    ...generatedPaths.filter((path) => /\.[cm]?[jt]sx?$/.test(path)),
  ]
  const program = ts.createProgram(rootNames, {
    allowArbitraryExtensions: true,
    allowImportingTsExtensions: true,
    esModuleInterop: true,
    isolatedModules: true,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    noUncheckedIndexedAccess: true,
    paths: { '@/*': [`${join(fixture, 'src')}/*`] },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length > 0) {
    throw new Error(
      `Documentation examples failed typecheck:\n${diagnosticsText(diagnostics, fixture)}`,
    )
  }
}

async function bundleFixture(fixture, entry) {
  await viteBuild({
    configFile: false,
    logLevel: 'silent',
    root: fixture,
    resolve: {
      alias: [{ find: /^@\//, replacement: `${join(fixture, 'src')}/` }],
    },
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
  const fixture = await mkdtemp(join(tmpdir(), 'kida-doc-examples-'))
  try {
    const { items } = await buildRegistry()
    const examples = await readExamples(items)
    await checkComponentDocs(items)
    const fixtureFiles = await writeFixture(fixture, items, examples)
    typecheckFixture(fixture, fixtureFiles)
    await bundleFixture(fixture, fixtureFiles.entry)
    console.log(
      `✓ ${examples.size} checked quick starts match the component docs and combined registry output`,
    )
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
