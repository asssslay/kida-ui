# Kida UI — Architecture Decision Record

Status: **decided** (2026-08-18) · Scope: v1 · Rev 3 — npm scope claimed, D11 added, monorepo scaffolded

## 1. Positioning

Animation-first component library. The differentiator is **motion quality + genuine
multi-stack reach**. The animation-heavy space (Aceternity, Magic UI, Motion Primitives)
is React-only; the multi-stack space (Ark UI, Zag) is motion-agnostic. Kida sits in the gap.

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Layered architecture: core / styles / adapters / distribution | Zag + Ark's proven shape; framework #2 must cost ~300 LOC, not a rewrite |
| D2 | React only at v1; architecture multi-stack from day one | Ark UI (funded) has Svelte 15 minors behind React. Don't fake breadth. |
| D3 | Animation engine built on vanilla `motion`, NOT `framer-motion` | `motion` is framework-agnostic → identical motion in every framework later |
| D3a | **`@kida-ui/motion` has zero framework code and zero framework peer deps** | The real boundary. CI-enforceable. React adapter lives in `@kida-ui/react`, not `@kida-ui/motion/react` — otherwise React has two entry points. |
| D4 | Behavior from Zag.js | 60+ audited machines, already supports 6 frameworks |
| D5 | **CSS keyframes** for mount/unmount enter+exit, node held by `@zag-js/presence`; JS engine for everything CSS can't do | Zag docs are explicit: *"the presence machine requires using CSS animations to animate the component's exit"* — it does NOT support JS-driven animations. Split by responsibility instead. |
| D5a | Own `presence()` helper in `@kida-ui/motion` for the rare JS-driven exit | ~30 LOC: run exit animation, `await animation.finished`, then unmount. Don't force Zag presence to do this. |
| D6 | State → CSS via `data-*` attributes only | Makes the entire style layer 100% shareable across frameworks, forever |
| D7 | **Plain CSS custom properties are the source of truth. Tailwind is an optional add-on, never a requirement.** | A Tailwind dependency contradicts "every stack" — it would mean every stack *that installs Tailwind*. And for an animation library Tailwind buys little: the CSS is keyframes, transforms, custom props and data-attr selectors. `@ark-ui/react` ships zero CSS; `daisyui` declares no deps or peer deps. |
| D8 | Registry JSON conforming to **shadcn's registry-item schema** | Ship copy-source at v1 with zero CLI. Instant reach to shadcn's 6.8M weekly CLI users. |
| D9 | npm packages + registry generated from ONE source | shadcn's `registry:build` pattern. Hand-maintained copies always rot. |
| D10 | Docs site on Astro | Only mainstream docs stack with native React+Svelte+Vue+Solid live demos in one page |
| D11 | `@kida-ui/react` ships a package-wide `'use client'` banner, injected at build time | Rolldown drops per-module directives when merging modules into one chunk — verified in the scaffold. Every export here is client-side by nature, so banner the bundle rather than fight the bundler per file. |
| D12 | Components are tested in a **real browser** (Vitest browser mode + Playwright), not jsdom | Everything these components do — layout measurement, `IntersectionObserver`, `ResizeObserver`, WAAPI, CSS keyframes — is absent or faked in jsdom, so a green jsdom suite proves nothing. jsdom stays for pure logic (`packages/motion`). |

## 3. Layers

```
L4  DISTRIBUTION   registry JSON (copy)   +   npm packages (install)
                   ▲── both generated from the SAME source ──▲
L3  ADAPTERS       react/  [svelte/  vue/  solid/ — later]     thin
L2  STYLES         plain CSS custom properties + data-* selectors  100% shared
                   (+ optional @theme layer for Tailwind users)
L1  CORE           @kida-ui/motion (agnostic) + Zag machines        100% shared
```

### The data-attribute contract

Components never express visual state in framework code:

```html
<div data-scope="dialog" data-part="content" data-state="open" data-side="bottom">
```
```css
[data-part="content"][data-state="open"]  { animation: kida-enter var(--kida-duration-md) var(--kida-ease-out); }
[data-part="content"][data-state="closed"]{ animation: kida-exit  var(--kida-duration-sm) var(--kida-ease-in); }
```

Consequence: adding Svelte later ships **pixel-identical** components for free.

## 4. Animation core (`@kida-ui/motion`)

Framework-agnostic, and strictly so (D3a). Wraps vanilla `motion` (`animate`, `scroll`, `inView`, `stagger`,
springs, hybrid WAAPI) and adds Kida's orchestration.

```
packages/motion/          @kida-ui/motion — NO framework dependency, of any kind
  src/index.ts            engine: reveal, stagger, parallax, magnetic, tilt, marquee,
                          split-text, number-flow, presence(), reduced-motion guard
packages/react/           @kida-ui/react — the ONLY React surface
  src/motion/             useReveal, useStagger …  (~50 LOC each)
  src/components/         the components
```

Note: `motion@13.1.0` ships `.` + `./react` in one package using
`peerDependenciesMeta.react.optional = true`, and that is clean — but Motion has no
component package. Kida does, so a second React entry point under `@kida-ui/motion` would
be redundant. This mirrors `@zag-js/react` → `@ark-ui/react` instead.

**CI gate:** `@kida-ui/motion` must list no framework in `dependencies` or `peerDependencies`.

`@formkit/auto-animate` runs 8 frameworks off one core file at 1.2M downloads/week.
Same shape here. **The animation layer can go multi-stack long before the components do.**

Motion tokens live in CSS, not JS:

```css
/* @kida-ui/styles/kida.css — plain CSS, no build step, no dependency, any stack */
:root {
  --kida-duration-sm: 150ms;   --kida-ease-out: cubic-bezier(.16,1,.3,1);
  --kida-duration-md: 300ms;   --kida-ease-spring: linear(0, .5, .9, 1.02, 1);
}
@media (prefers-reduced-motion: reduce) { :root { --kida-duration-md: 1ms; } }
```
```css
/* @kida-ui/styles/tailwind.css — OPTIONAL. Same tokens, exposed as utilities. */
@import "./kida.css";
@theme { --duration-kida-md: var(--kida-duration-md); --ease-kida-out: var(--kida-ease-out); }
```
Components pass `className`/`class` straight through so Tailwind users can still layer
utilities on top.

## 5. Component taxonomy

| Tier | Examples | Impl | Multi-stack cost |
|---|---|---|---|
| T1 CSS effects | aurora, beam, shimmer, glow, gradient border, noise | pure CSS | **zero** — works everywhere today |
| T2 Motion primitives | Reveal, Stagger, Parallax, Magnetic, Tilt, Marquee, TextEffect, NumberFlow | `@kida-ui/motion` + tiny adapter | very low |
| T3 Animated primitives | Dialog, Popover, Accordion, Tabs, Carousel, Toast, Tour | Zag machine + T2 motion | medium |
| T4 Showcase blocks | hero, bento grid, feature cards, pricing | composition of T1–T3 | low |

T1 is shippable to every stack immediately and backs the multi-stack claim while T3 catches up.

## 6. Repo layout

```
kida-ui/
├─ packages/
│  ├─ motion/          L1  animation engine — zero framework deps
│  ├─ styles/          L2  plain CSS tokens + keyframes (+ optional tailwind.css)
│  ├─ react/           L3  React adapter (motion hooks) + components
│  └─ cli/             (v2) `kida add <c> --framework svelte`
├─ registry/
│  ├─ registry.json
│  └─ r/*.json         generated — shadcn-compatible registry items
├─ apps/
│  ├─ docs/            Astro + MDX + Shiki, framework-switcher demos
│  └─ playground/
└─ scripts/
   ├─ build-registry.ts   packages/* → registry/r/*.json (inline + rewrite imports)
   └─ check-parity.ts     CI gate: every framework exports the same surface
```

## 7. Dual distribution

```
packages/react/src/spotlight-card.tsx      ← single source of truth
   ├── tsdown ─────────────► npm  @kida-ui/react
   └── build-registry.ts ──► registry/r/spotlight-card.json
```

Split, following shadcn's own conclusion (`@shadcn/react` v0.3.0 exists for exactly this reason):

- **Copy** → styled, opinionated, users will edit it (T1, T2, T4)
- **Install** → complex, infrastructural (`@kida-ui/motion`, `@kida-ui/styles`, Zag-backed T3)

v1 needs **no CLI**: emit shadcn-schema JSON and users run
`npx shadcn@latest add https://kida.dev/r/spotlight-card.json`, or register a namespace:

```jsonc
// components.json
"registries": { "@kida-ui": "https://kida.dev/r/{name}.json" }
// → npx shadcn@latest add @kida-ui/spotlight-card
```

Build `packages/cli` only when framework #2 lands — that's where shadcn's CLI can't follow.

## 8. Toolchain

pnpm workspaces + Turborepo · TypeScript · tsdown · Changesets ·
Vitest + Playwright + axe · Biome · Astro (docs) · Shiki

## 9. Roadmap

- **P0** monorepo, `@kida-ui/styles` tokens, `@kida-ui/motion` core + React adapter, 6 T1 effects, Astro docs skeleton, `build-registry.ts`, shadcn-compatible JSON
- **P1** 10 T2 motion primitives, `check-parity.ts`, docs with live + copy + install tabs
- **P2** 8 T3 Zag-backed primitives with motion built in, `@zag-js/presence` bridge
- **P3** 6 T4 showcase blocks, theming, reduced-motion audit → **v1.0 (React)**
- **P4** framework #2 (Svelte or Vue): `@kida-ui/motion/<fw>` + adapters + `kida` CLI

## 10. Known risks

- **R1** Zag API shapes constrain component APIs → keep adapters thin, never re-export Zag types publicly
- **R2** vanilla `motion` lacks React-style layout animations → own FLIP helper in `@kida-ui/motion`
- **R2a** Zag presence is CSS-animation-only → keep all mount/unmount transitions in CSS; never route them through the JS engine
- **R3** copy-source drift → `build-registry.ts` is the only writer; CI fails on manual edits to `registry/r/`
- **R4** breadth-before-depth → framework #2 blocked until React hits v1.0
- ~~**R5** npm `@kida` scope unconfirmed~~ → **resolved 2026-08-18: `@kida` is taken.** `GET registry.npmjs.org/-/org/kida/user` returns `{"kida":"owner"}` (200), while `kida-ui` returns 404 `Scope not found`. That endpoint resolves *user* scopes too — control: `sindresorhus` → 200, `zzq9xnope` → 404 — so zero published packages never meant available. **All packages are `@kida-ui/*`.** → **Closed 2026-08-25: the `kida-ui` org exists and is owned by `asssslay`** (`npm org ls kida-ui` → `asssslay - owner`; the scope endpoint now returns 200 where it returned 404). Free plan, unlimited public packages. Publishing is unblocked.
- **R7** the JS engine keeps its own idea of an element's current value → never re-hide an element by writing `style` behind its back and expect the next `animate()` to infer a start: spell both keyframes out. Verified in the browser: a `once: false` reveal otherwise resolves instantly on re-entry and never animates.
- **R8** Playwright ships no bundled Chromium for macOS 13 → `packages/react/vitest.config.ts` falls back to the system Chrome when the bundled build is missing; CI is unaffected
- **R6** dropping Tailwind classes costs the shadcn "edit utilities inline" DX → mitigate with per-component CSS custom properties + `className` passthrough
