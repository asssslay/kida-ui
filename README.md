# Kida UI

Animation-first UI components, built to reach every stack.

**Status: pre-alpha.** The `@kida-ui` npm scope is claimed, and the first vertical slice includes
`Reveal`, `Collapse`, five signature motion components, a browser-tested React adapter,
Vue 3.5 adapters for the seven shared components, React-only `SpaceType`, `GlowHighlight`,
`ImageText`, and `DualWave`, and an Astro documentation site. The
packages are not published yet.
Project decisions live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). New components follow the
[`component standard`](docs/COMPONENT_STANDARD.md) and the first collection's
[`soft/candy editorial direction`](docs/DESIGN_DIRECTION.md). Package and copy-source behavior is
documented in [`docs/DISTRIBUTION.md`](docs/DISTRIBUTION.md).

## Packages

| Package | What it is | Framework deps |
|---|---|---|
| `@kida-ui/motion` | Animation engine, framework-agnostic | **none — CI-enforced** |
| `@kida-ui/styles` | CSS custom properties, keyframes, `data-*` contract | none (plain CSS, no build) |
| `@kida-ui/react` | React adapter + components | `react` (peer) |
| `@kida-ui/vue` | Vue adapter + the seven shared components | `vue` (peer) |

The layering is the point: `motion` and `styles` are shared by every future framework, and an
adapter is the only per-framework cost. `scripts/check-framework-deps.mjs` fails CI if a
framework import ever leaks into the agnostic packages (ADR D3a).

## Development

```bash
pnpm install
pnpm verify      # lint → registry checks → types → tests → build → Vue consumer + docs dev → core gate
pnpm dev         # watch builds
```

The Vue dev task rebuilds its runtime bundle on changes. Run `pnpm --filter @kida-ui/vue build`
after changing public prop types to regenerate declarations.

Individual tasks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm gate:agnostic`.
Registry tasks: `pnpm registry:build`, `pnpm registry:check`, `pnpm registry:check-copy`.

Vue milestone checks: `pnpm --filter @kida-ui/vue test` runs Node SSR and Chromium behavior,
hydration, accessibility, settled pixel parity against React, and emulated touch input. After
building, run `pnpm check:vue-consumer` to validate packed packages and the checked Vue demos outside the
workspace. Installation is documented at `/docs/installation`. Component pages offer React/Vue selection and copied-source installation through the respective shadcn CLI. Vue registry items are served at `/r/vue/<name>.json`.
`pnpm docs:check-dev` smoke-tests both renderers in development as well as the production build.
After building, `pnpm docs:test-browser` compares the actual framework demos and checks in-place framework selection,
unchanged URLs, retained preview state, scroll/focus, saved framework preference, and Copy buttons.
Sidebar and history navigation also preserve the navigation shell and display the selected
framework immediately, without a React selection flash.

Release checks: `pnpm test:cross-browser` builds the adapters and runs Firefox/WebKit behavior,
responsive geometry, and adapter parity checks, plus WebKit touch taps. Install the locked browser
engines first. See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) for the full commands,
required release gates, and recommended screen-reader/device checks.

## Conventions

- **ESM only.** Every package is `"type": "module"` and ships `.js` + `.d.ts`.
- **No Tailwind requirement.** Tokens are plain CSS custom properties; `@kida-ui/styles/tailwind.css`
  is an optional layer that re-exposes them as Tailwind v4 theme values (ADR D7).
- **State lives in `data-*` attributes**, never in framework code, so the stylesheet is shareable
  across frameworks unchanged (ADR D6).
- **`@kida-ui/react` is client-side.** The build injects a package-wide `'use client'` banner (ADR D11).
