# Kida UI Distribution

Status: **implemented for React and experimental Vue components** (2026-10-12)

React covers eight components; experimental Vue covers the seven shared components.
SpaceType currently supports React only. Component and installation pages list available
frameworks; Vue pages live at `/docs/vue/<name>` and use checked Vue quick starts and live SFC demos.
Vue 3.5+ and a TypeScript project are required. npm publication remains pending.

React uses the existing `/r/<name>.json` registry through `shadcn`. Vue uses
`/r/vue/<name>.json` through `shadcn-vue@2.8.2`, with its own catalog at `/r/vue/registry.json`.
Both CLI paths copy the required Kida source and CSS and declare only public third-party packages.
No unpublished `@kida-ui/*` dependency is required by copied source.

```bash
npx shadcn-vue@2.8.2 add https://kida-ui.onrender.com/r/vue/text-bloom.json
```

Complete the [shadcn-vue Vite setup](https://www.shadcn-vue.com/docs/installation/vite) and
initialize `components.json` first. `aliases.ui` controls the destination; the default import is
`@/components/ui/kida/text-bloom.vue`. Manual copying is also documented on each component page.
Keep Vue's SFC, `.types.ts`, `.motion.ts`, and CSS files together in the `kida` directory.

`pnpm registry:check-copy` validates React source fixtures and invokes the pinned Vue CLI against
an isolated loopback registry. Each Vue item is installed in its own clean TypeScript project;
a combined installation uses a custom UI alias. These checks install actual public dependencies,
reject unpublished imports, verify installed paths and shared-file consistency, compile the exact
shown quick starts, production-bundle them, and render deterministic server HTML in Node. Vue's
required TypeScript compiler is part of the host fixture. The CLI's icon catalog is supplied locally,
so registry installation does not depend on the upstream website; public dependencies use npm.
`--combined-only` on `scripts/check-vue-copy-source.mjs` is a debugging shortcut; CI runs all cases.

`pnpm check:vue-consumer` packs the Vue, motion, and styles packages, extracts them into an isolated
temporary consumer outside the workspace, and checks the displayed Vue demos against the packed
declarations. It validates bundler and NodeNext type resolution, production bundling with the real
styles, and Node SSR without DOM globals. Only declared third-party runtime dependencies and the
Vue host are linked from the locked installation; no Kida source aliases or workspace package
links are available. Run it after the package builds; it is also part of `pnpm verify` and CI.

Kida supports two consumption models from one implementation. The npm package is the stable,
upgradeable option. The registry gives users the framework-specific component source when they need to own and
edit it. Kida does not maintain a second hand-written copy of a component.

## Package install

Use the package when receiving fixes and new versions matters more than editing internals:

```bash
pnpm add @kida-ui/react
```

Components with CSS also require the styles package and one application-level import:

```bash
pnpm add @kida-ui/react @kida-ui/styles
```

```ts
import '@kida-ui/styles/kida.css'
```

Package dependencies such as `@kida-ui/motion` and Zag are installed transitively. React and
React DOM remain peer dependencies of the adapter.

## Copy source

Every component page displays all generated source files. A shadcn-compatible registry item is
also served at `https://kida-ui.onrender.com/r/<name>.json`, so users with a `components.json` file can write
the same source into their configured directories:

```bash
npx shadcn@latest add https://kida-ui.onrender.com/r/reveal.json
```

This uses shadcn's existing CLI, not a Kida CLI. The existing React and Vue CLIs handle framework selection; a Kida-specific CLI remains deferred.

Copied components are owned by the consuming application, but they are not dependency-free.
Each registry item includes the Kida source and CSS it needs and declares only public runtime
packages. For example, copied `Reveal` includes its small motion helper and reduced-motion
stylesheet and depends on the public `motion` package, while copied `Collapse` includes its shared
measurement helper and CSS and depends on Zag presence. Copied source never requires an
unpublished `@kida-ui/*` package.

## Maintainer workflow

1. Implement adapters in `packages/react/src` and `packages/vue/src`, with shared motion and CSS.
2. Add its source files, targets, dependencies, category, and package metadata to
   `registry/definitions.mjs` and `registry/vue-definitions.mjs`.
3. Run `pnpm registry:build` and commit the generated `registry/registry.json` and
   `registry/r/<name>.json` and `registry/r/vue/<name>.json` files.
4. Add `<Distribution name="<name>" />` to the component documentation page.
5. Run `pnpm verify`.

`pnpm registry:check` validates the output with the official `shadcn/schema` and `shadcn-vue/schema` APIs and fails when a
generated file is missing, stale, or orphaned. `pnpm registry:check-copy` installs each registry
item by itself into a separate temporary React source tree. It rejects unpublished or undeclared
runtime imports, verifies every local file import, typechecks the result, and bundles it with Vite.
The fixtures are created outside the workspace and deleted after every run, so another component
or workspace package cannot accidentally hide a missing copied file or dependency.

## Generation rules

- Package source is read verbatim whenever possible.
- React file targets use shadcn placeholders such as `@ui/`, so the consumer's `components.json`
  controls the real destination.
- Dependency ranges come from each framework's adapter and the shared motion manifest. Workspace-only
  dependencies are rejected: their required source must be copied or their package published.
- Copy-only imports are deterministic generator transforms. Today these redirect Kida motion
  imports to copied helpers, add local CSS imports to copied components, and add token imports to
  copied stylesheets.
- Vue public types are selected from the canonical `packages/vue/src/types.ts`, including local
  declaration dependencies and requested reexports. Per-component `.types.ts` files avoid pulling
  unrelated controllers into standalone copied items.
- Vue files use the CLI's native nested-path resolution instead of React's `@ui/` targets. Helpers
  stay flat beside the SFC, which preserves relative imports when `aliases.ui` is customized.
- `registry/r` is generated output and must never be edited by hand.
