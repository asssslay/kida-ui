export const COMPONENT_CATEGORY_IDS = [
  'primitives',
  'text',
  'interaction',
  'image',
  'background',
  'decorative',
  'blocks',
] as const

export type ComponentCategory = (typeof COMPONENT_CATEGORY_IDS)[number]

export interface ComponentCategoryDefinition {
  id: ComponentCategory
  label: string
  description: string
}

export const COMPONENT_CATEGORIES: readonly ComponentCategoryDefinition[] = [
  {
    id: 'primitives',
    label: 'Primitives',
    description: 'Low-level motion and presence building blocks.',
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Expressive entrances, transitions, and typographic motion.',
  },
  {
    id: 'interaction',
    label: 'Interaction',
    description: 'Tactile responses to pointer, keyboard, touch, and drag.',
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Playful ways to present, layer, and manipulate media.',
  },
  {
    id: 'background',
    label: 'Background',
    description: 'Ambient effects designed to stay behind the content.',
  },
  {
    id: 'decorative',
    label: 'Decorative',
    description: 'Scribbles, stickers, highlights, and finishing details.',
  },
  {
    id: 'blocks',
    label: 'Blocks',
    description: 'Complete sections composed from Kida components.',
  },
]

const CATEGORY_ORDER = new Map(COMPONENT_CATEGORIES.map((category, index) => [category.id, index]))

export function categoryOrder(category: ComponentCategory): number {
  return CATEGORY_ORDER.get(category) ?? COMPONENT_CATEGORIES.length
}
