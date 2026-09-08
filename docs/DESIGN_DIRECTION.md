# Kida UI Design Direction

Status: **direction for the first collection** (2026-09-03)

## The idea

Kida is soft/candy editorial: clean composition, confident typography, tactile motion, and small
moments of sweetness. The interface is calm at rest and playful on intent.

The goal is not to make every surface pink, glossy, or animated. The editorial foundation creates
space; motion and decorative details provide the personality.

## Principles

### Clean first

Strong hierarchy, generous but controlled space, crisp type, and simple surfaces carry the design.
An effect should still feel considered when paused on any frame.

### Tactile, not floaty

Input receives an immediate response, then settles softly. Small overshoot, squash, magnification,
and depth are welcome when they clarify what is being touched. Long, vague transitions are not.

### Sweet accents

Use candy color, gloss, stickers, marker strokes, cut-paper edges, and photo treatments as accents.
One expressive device is usually enough for a component.

### Editorial contrast

Pair polished typography and alignment with one intentionally informal detail. Examples include a
precise headline with a hand-drawn underline, or a clean image grid with one draggable photo.

## Color roles

The first demos should use a balanced family rather than one dominant hue:

| Role | Starting point | Use |
|---|---|---|
| Ink | `#211c24` | Primary type and high-contrast controls |
| Paper | `#fffafb` | Main light surface |
| Cherry | `#e94f86` | Primary expressive accent |
| Lilac | `#a78bfa` | Secondary accent and depth |
| Mint | `#75c9a6` | Fresh contrast and positive states |
| Butter | `#f4cf63` | Highlight and playful emphasis |
| Cloud | `#f2edf4` | Quiet panels and separators |

These are documentation defaults, not mandatory library globals. Components expose semantic custom
properties such as `--kida-accent`, `--kida-surface`, and `--kida-ink`, and should also look
intentional when users replace them.

## Shape and texture

- Use modest corner radii for controls and structured panels; reserve larger curves for expressive
  objects such as stickers, pills, and image masks.
- Prefer crisp shadows with a small soft component over large ambient glows.
- Grain and paper texture should be low contrast and optional.
- Gloss is a highlight, not a full-page material.
- Avoid decorative gradient blobs, excessive glass panels, and generic neon effects.

## Motion voices

Kida begins with four related motion voices:

| Voice | Character | Typical use |
|---|---|---|
| Gentle | Short travel, soft ease-out, no visible bounce | Reveal, supporting copy |
| Pop | Quick anticipation or small overshoot, clean settle | Buttons, stickers, selected items |
| Tactile | Position or scale follows input through a restrained spring | Magnetic, CandyDock, PhotoPile |
| Drawn | Slightly imperfect path or stepped timing | ScribbleHighlight, marker accents |

They share timing and reduced-motion rules, so the catalog feels related even when components have
different visual styles.

## Restraint rules

- Do not animate every item simply because it can move.
- Do not loop primary text or controls indefinitely.
- Do not combine bounce, blur, rotation, color cycling, and particles in one entrance.
- Do not hide essential content behind a hover-only reveal.
- Do not reproduce Apple artwork or branded surfaces; borrow interaction qualities such as
  magnification, spring response, and layered depth.
- Do not add `candy`, `girly`, or `graffiti` as hard-coded theme props. Demonstrate those directions
  through CSS variables and compositions instead.

## First collection

The first signature sequence is:

1. `TextBloom` establishes segmentation, stagger, and the Gentle/Pop voices.
2. `Magnetic` establishes pointer tracking and Tactile motion.
3. `ScribbleHighlight` establishes the Drawn voice.
4. `StickerBurst` establishes the Pop voice with a compact decorative response.
5. `CandyDock` combines proximity, scale, keyboard behavior, and soft depth.
6. `PhotoPile` brings the direction to image interaction.
7. A `PlayfulHero` proves the pieces can compose into one editorial experience.

`Reveal` and `Collapse` remain neutral primitives underneath this collection.
