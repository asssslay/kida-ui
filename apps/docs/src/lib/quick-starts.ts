const modules = import.meta.glob<string>('../examples/quick-start/*.react.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const quickStartPath = /^\.\.\/examples\/quick-start\/(.+)\.react\.tsx$/
const quickStarts = new Map<string, string>()

for (const [path, source] of Object.entries(modules)) {
  const name = quickStartPath.exec(path)?.[1]
  if (name) quickStarts.set(name, source)
}

export function getQuickStart(name: string): string {
  const source = quickStarts.get(name)
  if (!source) {
    const known = [...quickStarts.keys()].sort().join(', ')
    throw new Error(`Unknown quick start "${name}". Known quick starts: ${known || '(none)'}`)
  }
  return source
}
