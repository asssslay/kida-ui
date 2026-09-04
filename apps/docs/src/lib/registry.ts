interface RegistryFile {
  path: string
  content: string
  type: string
  target: string
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

export function getRegistryItems(): RegistryItem[] {
  return items
}

export function getRegistryItem(name: string): RegistryItem {
  const item = items.find((candidate) => candidate.name === name)
  if (!item) {
    throw new Error(`Unknown registry item "${name}".`)
  }
  return item
}
