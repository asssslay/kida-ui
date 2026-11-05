import { render } from 'svelte/server'
import Showcase from './fixtures/Showcase.svelte'

export const serverMarkup = () => render(Showcase).body
