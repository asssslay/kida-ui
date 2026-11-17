import { Collapse, Reveal } from '@kida-ui/svelte'
import { createRawSnippet } from 'svelte'
import { render } from 'svelte/server'
import Showcase from './fixtures/Showcase.svelte'

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }))

export const serverMarkup = (open = true) => render(Showcase, { props: { open } }).body

export const revealMarkup = () =>
  render(Reveal, {
    props: { x: 0, y: 0, scale: 1, once: false, duration: 0, children: text('Content') },
  }).body

export function closedCollapseExits() {
  let exits = 0
  render(Collapse, {
    props: { open: false, onExitComplete: () => exits++, children: text('Hidden') },
  })
  return exits
}
