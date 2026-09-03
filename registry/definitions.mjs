/**
 * Registry metadata only. Component implementations remain canonical in packages/*.
 * The generator reads every file listed here and embeds its current contents in the
 * shadcn-compatible output under registry/r.
 */
export const registryDefinitions = [
  {
    name: 'reveal',
    title: 'Reveal',
    description: 'Animates its children in when they enter the viewport.',
    category: 'primitives',
    package: {
      name: '@kida-ui/react',
      exportName: 'Reveal',
      styleImports: [],
    },
    dependencies: ['@kida-ui/motion'],
    files: [
      {
        source: 'packages/react/src/reveal.tsx',
        type: 'registry:ui',
        target: '@ui/kida/reveal.tsx',
      },
      {
        source: 'packages/react/src/use-isomorphic-layout-effect.ts',
        type: 'registry:hook',
        target: '@ui/kida/use-isomorphic-layout-effect.ts',
      },
    ],
  },
  {
    name: 'collapse',
    title: 'Collapse',
    description: 'Expands and collapses content with measured height and a real exit animation.',
    category: 'primitives',
    package: {
      name: '@kida-ui/react',
      exportName: 'Collapse',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['@zag-js/presence', '@zag-js/react'],
    files: [
      {
        source: 'packages/react/src/collapse.tsx',
        type: 'registry:ui',
        target: '@ui/kida/collapse.tsx',
        styleImport: './collapse.css',
      },
      {
        source: 'packages/react/src/compose-refs.ts',
        type: 'registry:lib',
        target: '@ui/kida/compose-refs.ts',
      },
      {
        source: 'packages/react/src/use-isomorphic-layout-effect.ts',
        type: 'registry:hook',
        target: '@ui/kida/use-isomorphic-layout-effect.ts',
      },
      {
        source: 'packages/styles/components/collapse.css',
        type: 'registry:ui',
        target: '@ui/kida/collapse.css',
        imports: ['./tokens.css'],
      },
      {
        source: 'packages/styles/tokens.css',
        type: 'registry:ui',
        target: '@ui/kida/tokens.css',
      },
    ],
  },
]
