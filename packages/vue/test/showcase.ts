import { Collapse, Reveal } from '@kida-ui/vue'
import { h } from 'vue'

export const showcase = (open: boolean) =>
  h('main', [
    h(Reveal, { as: 'section' }, () => h('h2', 'Reveal content')),
    h(Collapse, { open }, () => h('p', 'Collapse content')),
  ])
