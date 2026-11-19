const modules = import.meta.glob<string>('../examples/quick-start/*.react.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const quickStartPath = /^\.\.\/examples\/quick-start\/(.+)\.react\.tsx$/
const quickStarts = new Map<string, string>()
const vueSources = import.meta.glob<string>('../examples/quick-start/*.vue', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const vueQuickStarts = new Map(
  Object.entries(vueSources).map(([path, source]) => [
    path
      .split('/')
      .at(-1)
      ?.replace(/-example\.vue$/, ''),
    source,
  ]),
)

const svelteSources = import.meta.glob<string>('../examples/quick-start/*.svelte', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const svelteQuickStarts = new Map(
  Object.entries(svelteSources).map(([path, source]) => [
    path
      .split('/')
      .at(-1)
      ?.replace(/-example\.svelte$/, ''),
    source,
  ]),
)

for (const [path, source] of Object.entries(modules)) {
  const name = quickStartPath.exec(path)?.[1]
  if (name) quickStarts.set(name, source)
}

export function getQuickStart(
  name: string,
  framework: 'react' | 'vue' | 'svelte' = 'react',
): string {
  const variants = { react: quickStarts, vue: vueQuickStarts, svelte: svelteQuickStarts }[framework]
  const source = variants.get(name)
  if (!source) {
    const known = [...variants.keys()].sort().join(', ')
    throw new Error(`Unknown quick start "${name}". Known quick starts: ${known || '(none)'}`)
  }
  return source
}
