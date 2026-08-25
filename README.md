# Kida UI

Animation-first UI components, built to reach every stack.

**Status: pre-alpha.** The monorepo skeleton is up and the `@kida-ui` npm scope is claimed; no components
have shipped yet.
Architecture and the reasoning behind it live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Packages

| Package | What it is | Framework deps |
|---|---|---|
| `@kida-ui/motion` | Animation engine, framework-agnostic | **none — CI-enforced** |
| `@kida-ui/styles` | CSS custom properties, keyframes, `data-*` contract | none (plain CSS, no build) |
| `@kida-ui/react` | React adapter + components | `react` (peer) |

The layering is the point: `motion` and `styles` are shared by every future framework, and an
adapter is the only per-framework cost. `scripts/check-framework-deps.mjs` fails CI if a
framework import ever leaks into the agnostic packages (ADR D3a).

## Development

```bash
pnpm install
pnpm verify      # lint → typecheck → test → build → framework-free gate
pnpm dev         # watch builds
```

Individual tasks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm gate:agnostic`.

## Conventions

- **ESM only.** Every package is `"type": "module"` and ships `.js` + `.d.ts`.
- **No Tailwind requirement.** Tokens are plain CSS custom properties; `@kida-ui/styles/tailwind.css`
  is an optional layer that re-exposes them as Tailwind v4 theme values (ADR D7).
- **State lives in `data-*` attributes**, never in framework code, so the stylesheet is shareable
  across frameworks unchanged (ADR D6).
- **`@kida-ui/react` is client-side.** The build injects a package-wide `'use client'` banner (ADR D11).
