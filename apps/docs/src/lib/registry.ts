export type RegistryFramework = 'react' | 'vue' | 'svelte'

interface RegistryFile {
  path?: string
  content: string
  type: string
  target?: string
}

interface PackageInstall {
  name: string
  exportName: string
  styleImports: string[]
}

export interface RegistryItem {
  name: string
  title: string
  description: string
  dependencies: string[]
  files: RegistryFile[]
  meta: {
    kida: {
      package: PackageInstall
    }
  }
}

const modules = import.meta.glob<RegistryItem>('../../../../registry/r/*.json', {
  eager: true,
  import: 'default',
})

const items = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name))
const vueModules = import.meta.glob<RegistryItem>('../../../../registry/r/vue/*.json', {
  eager: true,
  import: 'default',
})
const vueItems = Object.values(vueModules)
  .filter((item) => Array.isArray(item.files))
  .sort((a, b) => a.name.localeCompare(b.name))

const svelteModules = import.meta.glob<RegistryItem>('../../../../registry/r/svelte/*.json', {
  eager: true,
  import: 'default',
})
const svelteItems = Object.values(svelteModules)
  .filter((item) => Array.isArray(item.files))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getRegistryItems(framework: RegistryFramework = 'react'): RegistryItem[] {
  return { react: items, vue: vueItems, svelte: svelteItems }[framework]
}

export function getRegistryItem(
  name: string,
  framework: RegistryFramework = 'react',
): RegistryItem {
  const item = getRegistryItems(framework).find((candidate) => candidate.name === name)
  if (!item) {
    throw new Error(`Unknown registry item "${name}".`)
  }
  return item
}
