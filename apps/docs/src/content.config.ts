import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
// `z` re-exported from `astro:content` is deprecated; `astro/zod` is the supported path.
import { z } from 'astro/zod'
import { COMPONENT_CATEGORY_IDS } from './config/components'

/**
 * One entry per documented component. The schema is the contract the sidebar, the page
 * header and the landing page all read from, so a page that forgets its public category
 * or internal tier fails the build rather than rendering a gap.
 */
const components = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/components' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** User-facing catalog category from the component standard. */
    category: z.enum(COMPONENT_CATEGORY_IDS),
    /** Taxonomy tier from ADR §5. */
    tier: z.enum(['T1', 'T2', 'T3', 'T4']),
    status: z.enum(['stable', 'beta', 'planned']).default('beta'),
    /** Framework adapters available for this component. */
    frameworks: z
      .array(z.enum(['react', 'vue']))
      .min(1)
      .default(['react', 'vue']),
    /** Sidebar ordering; ties break alphabetically. */
    order: z.number().default(0),
  }),
})

const vueComponents = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/vue-components' }),
  schema: z.object({}),
})

export const collections = { components, vueComponents }
