import '@kida-ui/styles/kida.css'
import '@fontsource-variable/instrument-sans'
import './visual-fixture.css'
import axe from 'axe-core'
import { afterEach, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Collapse } from './collapse.js'
import { Magnetic } from './magnetic.js'
import { PhotoPile, type PhotoPilePhoto } from './photo-pile.js'
import { Reveal } from './reveal.js'
import { ScribbleHighlight } from './scribble-highlight.js'
import { StickerBurst } from './sticker-burst.js'
import { TextBloom } from './text-bloom.js'

function image(color: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300"><rect width="240" height="300" fill="${color}"/><circle cx="72" cy="92" r="44" fill="${accent}"/><path d="M0 250L82 168l52 45 42-72 64 109v50H0z" fill="${accent}" opacity=".72"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const photos: readonly PhotoPilePhoto[] = [
  { id: 'rose', src: image('#f6b8c8', '#d84f78'), alt: 'Rose landscape' },
  { id: 'sun', src: image('#f8d68b', '#de7e45'), alt: 'Sunny landscape' },
  { id: 'mint', src: image('#a9dec8', '#397f70'), alt: 'Mint landscape' },
]

function Gallery() {
  return (
    <main className="kida-visual-gallery" data-testid="visual-gallery">
      <h1>Kida component baseline</h1>
      <div className="kida-visual-grid">
        <section className="kida-visual-card kida-visual-photo-card" data-testid="visual-photo">
          <h2>PhotoPile</h2>
          <PhotoPile photos={photos} aria-label="Color studies" />
        </section>

        <section className="kida-visual-card" data-testid="visual-motion">
          <h2>Reveal and TextBloom</h2>
          <Reveal>
            <strong>Quiet entrance</strong>
          </Reveal>
          <p>
            <TextBloom voice="pop" stagger={0}>
              Soft motion, clearly spoken.
            </TextBloom>
          </p>
        </section>

        <section className="kida-visual-card" data-surface="dark" data-testid="visual-collapse">
          <h2>Collapse</h2>
          <Collapse open>
            <div className="kida-visual-panel">
              Responsive content keeps its complete shape on dark and light surfaces.
            </div>
          </Collapse>
        </section>

        <section className="kida-visual-card" data-testid="visual-highlights">
          <h2>Highlights</h2>
          <div className="kida-visual-actions">
            <ScribbleHighlight>Underlined idea</ScribbleHighlight>
            <ScribbleHighlight variant="circle">Circled idea</ScribbleHighlight>
          </div>
        </section>

        <section className="kida-visual-card" data-surface="dark" data-testid="visual-interactions">
          <h2>Interaction wrappers</h2>
          <div className="kida-visual-actions">
            <Magnetic>
              <button className="kida-visual-button" type="button">
                Magnetic
              </button>
            </Magnetic>
            <StickerBurst>
              <button className="kida-visual-button" type="button">
                Celebrate
              </button>
            </StickerBurst>
          </div>
        </section>
      </div>
    </main>
  )
}

async function prepare(width: number, height: number) {
  await page.viewport(width, height)
  await commands.setReducedMotion(true)
  await render(<Gallery />)
  await document.fonts.ready
  await Promise.all(
    [...document.images].map((item) => (item.complete ? Promise.resolve() : item.decode())),
  )
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

afterEach(async () => {
  await commands.setReducedMotion(false)
  await page.viewport(1280, 720)
})

test('matches the mobile component gallery', async () => {
  await prepare(390, 844)

  for (const name of ['photo', 'motion', 'collapse', 'highlights', 'interactions']) {
    const element = document.querySelector<HTMLElement>(`[data-testid="visual-${name}"]`)
    if (!element) throw new Error(`Missing visual fixture: ${name}`)
    element.scrollIntoView({ block: 'center' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await expect
      .element(page.getByTestId(`visual-${name}`))
      .toMatchScreenshot(`component-mobile-${name}`)
  }
})

test('matches the desktop component gallery', async () => {
  await prepare(1280, 900)

  await expect
    .element(page.getByTestId('visual-gallery'))
    .toMatchScreenshot('component-gallery-desktop')
})

test('passes color contrast and structural accessibility checks on controlled surfaces', async () => {
  await prepare(1280, 900)
  const results = await axe.run(document.body)
  expect(results.violations).toEqual([])
})
