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
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/reveal.tsx',
        type: 'registry:ui',
        target: '@ui/kida/reveal.tsx',
        importReplacements: { '@kida-ui/motion': './motion/reveal.js' },
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
        source: 'packages/motion/src/reveal.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reveal.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
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
  {
    name: 'text-bloom',
    title: 'TextBloom',
    description: 'Reveals readable text with a gentle or softly overshooting stagger.',
    category: 'text',
    package: {
      name: '@kida-ui/react',
      exportName: 'TextBloom',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/text-bloom.tsx',
        type: 'registry:ui',
        target: '@ui/kida/text-bloom.tsx',
        styleImport: './text-bloom.css',
        importReplacements: { '@kida-ui/motion': './motion/text-bloom.js' },
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
        source: 'packages/styles/components/text-bloom.css',
        type: 'registry:ui',
        target: '@ui/kida/text-bloom.css',
      },
      {
        source: 'packages/motion/src/text-bloom.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/text-bloom.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
      },
    ],
  },
  {
    name: 'magnetic',
    title: 'Magnetic',
    description: 'Pulls an isolated child toward a fine pointer and settles with a spring.',
    category: 'interaction',
    package: {
      name: '@kida-ui/react',
      exportName: 'Magnetic',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/magnetic.tsx',
        type: 'registry:ui',
        target: '@ui/kida/magnetic.tsx',
        styleImport: './magnetic.css',
        importReplacements: { '@kida-ui/motion': './motion/magnetic.js' },
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
        source: 'packages/styles/components/magnetic.css',
        type: 'registry:ui',
        target: '@ui/kida/magnetic.css',
      },
      {
        source: 'packages/motion/src/magnetic.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/magnetic.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
      },
    ],
  },
  {
    name: 'scribble-highlight',
    title: 'ScribbleHighlight',
    description: 'Draws an informal underline or circle around existing content.',
    category: 'decorative',
    package: {
      name: '@kida-ui/react',
      exportName: 'ScribbleHighlight',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/scribble-highlight.tsx',
        type: 'registry:ui',
        target: '@ui/kida/scribble-highlight.tsx',
        styleImport: './scribble-highlight.css',
        importReplacements: { '@kida-ui/motion': './motion/draw-in-view.js' },
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
        source: 'packages/styles/components/scribble-highlight.css',
        type: 'registry:ui',
        target: '@ui/kida/scribble-highlight.css',
        imports: ['./tokens.css'],
      },
      {
        source: 'packages/styles/tokens.css',
        type: 'registry:ui',
        target: '@ui/kida/tokens.css',
      },
      {
        source: 'packages/motion/src/draw-in-view.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/draw-in-view.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
      },
    ],
  },
  {
    name: 'photo-pile',
    title: 'PhotoPile',
    description: 'Layers draggable photos that spring back into a playful composition.',
    category: 'image',
    package: {
      name: '@kida-ui/react',
      exportName: 'PhotoPile',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/photo-pile.tsx',
        type: 'registry:ui',
        target: '@ui/kida/photo-pile.tsx',
        styleImport: './photo-pile.css',
        importReplacements: { '@kida-ui/motion': './motion/photo-pile.js' },
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
        source: 'packages/styles/components/photo-pile.css',
        type: 'registry:ui',
        target: '@ui/kida/photo-pile.css',
      },
      {
        source: 'packages/motion/src/photo-pile.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/photo-pile.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
      },
    ],
  },
  {
    name: 'sticker-burst',
    title: 'StickerBurst',
    description: 'Bursts colorful decorative symbols around an existing control when activated.',
    category: 'decorative',
    package: {
      name: '@kida-ui/react',
      exportName: 'StickerBurst',
      styleImports: ['@kida-ui/styles/kida.css'],
    },
    dependencies: ['motion'],
    files: [
      {
        source: 'packages/react/src/sticker-burst.tsx',
        type: 'registry:ui',
        target: '@ui/kida/sticker-burst.tsx',
        styleImport: './sticker-burst.css',
        importReplacements: { '@kida-ui/motion': './motion/sticker-burst.js' },
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
        source: 'packages/styles/components/sticker-burst.css',
        type: 'registry:ui',
        target: '@ui/kida/sticker-burst.css',
        imports: ['./tokens.css'],
      },
      {
        source: 'packages/styles/tokens.css',
        type: 'registry:ui',
        target: '@ui/kida/tokens.css',
      },
      {
        source: 'packages/motion/src/sticker-burst.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/sticker-burst.ts',
      },
      {
        source: 'packages/motion/src/reduced-motion.ts',
        type: 'registry:lib',
        target: '@ui/kida/motion/reduced-motion.ts',
      },
    ],
  },
]
