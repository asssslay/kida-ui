import { vueRegistryDefinitions } from './vue-definitions.mjs'

export const svelteRegistryDefinitions = vueRegistryDefinitions.map((vue) => {
  const name = vue.name
  const component = vue.package.exportName
  const [adapter, types, ...shared] = vue.files
  return {
    ...vue,
    framework: 'svelte',
    package: { ...vue.package, name: '@kida-ui/svelte' },
    dependencies: name === 'collapse' ? ['@zag-js/presence', '@zag-js/svelte'] : vue.dependencies,
    files: [
      {
        ...adapter,
        source: `packages/svelte/src/Kida${component}.svelte`,
        target: `@ui/kida/${name}.svelte`,
      },
      {
        ...types,
        source: 'packages/svelte/src/types.ts',
        declarations: types.declarations.filter((declaration) => declaration !== 'KidaElement'),
      },
      ...shared,
    ],
  }
})
