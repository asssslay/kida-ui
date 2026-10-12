import {
  Collapse,
  Magnetic,
  PhotoPile,
  Reveal,
  ScribbleHighlight,
  StickerBurst,
  TextBloom,
} from '@kida-ui/vue'
import { h } from 'vue'
import { photos } from './fixtures.js'

export const showcase = (open: boolean) =>
  h('main', { style: { color: '#241f22', background: '#fff', padding: '20px' } }, [
    h('h1', 'Vue components'),
    h(Reveal, { as: 'section' }, () => h('h2', 'Reveal content')),
    h(Collapse, { open }, () => h('p', 'Collapse content')),
    h(TextBloom, { as: 'h2', text: 'Text bloom content' }),
    h(Magnetic, {}, () => h('button', { type: 'button' }, 'Magnetic action')),
    h(PhotoPile, { photos, 'aria-label': 'Travel snapshots' }),
    h('p', [h(ScribbleHighlight, {}, () => 'Highlighted content')]),
    h(StickerBurst, {}, () => h('button', { type: 'button' }, 'Celebrate')),
  ])
