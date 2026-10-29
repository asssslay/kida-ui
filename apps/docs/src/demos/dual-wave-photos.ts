// Photos from Unsplash under the Unsplash License; credits are in public/demo/dual-wave/README.md.
// Places, cats, and flowers alternate so neighbouring items always contrast.
const photos = [
  [
    'hollywood-hills',
    'Hollywood Hills',
    'Gabe',
    'The Hollywood sign on a grassy hillside under a clear sky',
  ],
  ['marmalade', 'Marmalade', 'Zoë Gayah Jonker', 'Ginger and white cat looking into the camera'],
  ['pink-bloom', 'Pink Bloom', 'Anthony Melone', 'Dense cluster of pink and white chrysanthemums'],
  [
    'cotton-candy-sky',
    'Cotton Candy Sky',
    'Roberto Nickson',
    'Palm trees silhouetted against pink clouds and a teal sky',
  ],
  [
    'code-review',
    'Code Review',
    'Volodymyr Dobrovolskyy',
    'Ginger cat watching code on a computer monitor',
  ],
  ['peach-bouquet', 'Peach Bouquet', 'Rebecca', 'Bouquet of peach roses and white daisies'],
  [
    'beverly-glow',
    'Beverly Glow',
    'Steven Pahel',
    'Palm-lined avenue under a pink and teal sunset',
  ],
  ['calico-calm', 'Calico Calm', 'Tim van der Kuip', 'Calico cat resting on a soft grey blanket'],
  ['night-garden', 'Night Garden', 'Annie Spratt', 'Purple hydrangeas against dark foliage'],
  [
    'dnipro-evening',
    'Dnipro Evening',
    'Eugenia Pan’kiv',
    'The Motherland Monument and a Ukrainian flag above autumn trees by the Dnipro in Kyiv',
  ],
  [
    'golden-eyes',
    'Golden Eyes',
    'Nabih E. Navarro',
    'Grey tabby cat with a white chest and bright yellow eyes',
  ],
  ['soft-focus', 'Soft Focus', 'Foad Roshan', 'Small pale pink flowers in soft focus'],
  ['venice-haze', 'Venice Haze', 'Kyle Thacker', 'Palm trees on a pale, hazy Venice beach'],
  [
    'house-cat',
    'House Cat',
    'Juan Manuel Sanchez',
    'White and orange cat sitting in a warmly lit room',
  ],
  [
    'poppy-season',
    'Poppy Season',
    'Holly Booth',
    'Peach poppies and pink blooms in an arrangement',
  ],
  ['two-palms', 'Two Palms', 'Tamara Henzen', 'Two slender palm trees against a pale blue sky'],
  [
    'silver-tabby',
    'Silver Tabby',
    'Andreia Oliveira',
    'Tabby cat with green eyes looking to the side',
  ],
  [
    'wildflower-field',
    'Wildflower Field',
    'Annie Spratt',
    'Pink and yellow flowers under a pale sky',
  ],
  ['last-light', 'Last Light', 'Daniel Lincoln', 'Palm trees silhouetted against an orange sunset'],
  ['curiosity', 'Curiosity', 'Alexander Andrews', 'Orange tabby cat looking up in low light'],
  ['lilac-haze', 'Lilac Haze', 'Amy Vo', 'Soft pink blossoms among green foliage'],
  [
    'pier-days',
    'Pier Days',
    'Florian Lidin',
    'Lifeguard tower in front of the Santa Monica Pier Ferris wheel',
  ],
  ['little-bear', 'Little Bear', 'Tuqa Nabi', 'Brown tabby kitten on pink fabric'],
  ['apricot-petals', 'Apricot Petals', 'Tavga K.S', 'Peach and cream flowers on a dark background'],
] as const

/** Shared by the React and Vue demos: a plain item shape both adapters accept. */
export interface DualWavePhoto {
  id: string
  title: string
  subtitle: string
  src: string
  alt: string
}

export const DUAL_WAVE_PHOTOS: readonly DualWavePhoto[] = photos.map(
  ([id, title, subtitle, alt]) => ({
    id,
    title,
    subtitle,
    alt,
    src: `/demo/dual-wave/${id}.webp`,
  }),
)
