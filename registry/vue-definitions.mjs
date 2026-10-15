import { registryDefinitions } from './definitions.mjs'

// Read the canonical Vue adapter, its selected public types, and the same shared helpers/styles
// used by React. Per-component type files let each copied item work by itself.
export const vueRegistryDefinitions = registryDefinitions.map((react) => {
  const name = react.name
  const component = react.package.exportName
  const helper =
    {
      'scribble-highlight': 'draw-in-view',
    }[name] ?? name
  return {
    ...react,
    framework: 'vue',
    package: { ...react.package, name: '@kida-ui/vue' },
    dependencies: name === 'collapse' ? ['@zag-js/presence', '@zag-js/vue'] : ['motion'],
    files: [
      {
        source: `packages/vue/src/Kida${component}.vue`,
        type: 'registry:ui',
        target: `@ui/kida/${name}.vue`,
        styleImport: `./${name}.css`,
        importReplacements: {
          '@kida-ui/motion': `./${helper}.motion.js`,
          './types.js': `./${name}.types.js`,
        },
      },
      {
        source: 'packages/vue/src/types.ts',
        type: 'registry:ui',
        target: `@ui/kida/${name}.types.ts`,
        declarations: [
          `${component}Props`,
          'KidaElement',
          ...(name === 'reveal' ? ['RevealEase'] : []),
          ...(name === 'text-bloom' ? ['TextBloomVoice'] : []),
        ],
        importReplacements: { '@kida-ui/motion': `./${helper}.motion.js` },
      },
      ...react.files
        .filter((file) => !file.source.startsWith('packages/react/'))
        .map((file) => ({
          ...file,
          // Keep Vue files beside the SFC: shadcn-vue derives nested paths independently
          // for each file, which can move nested helpers away from a custom aliases.ui directory.
          target: file.target.includes('/motion/')
            ? file.target.replace('/motion/', '/').replace(/\.ts$/, '.motion.ts')
            : file.target,
          importReplacements: {
            './collapse-size.js': './collapse-size.motion.js',
            './reduced-motion.js': './reduced-motion.motion.js',
          },
        })),
    ],
  }
})
