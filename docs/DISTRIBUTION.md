# Kida UI Distribution

Status: **copied source is available for React, Vue, and Svelte; npm packages are not published** (2026-11-16)

Copied source is the supported way to install Kida. npm publication is deferred until a release
decision, so `@kida-ui/react`, `@kida-ui/vue`, `@kida-ui/motion`, and `@kida-ui/styles` cannot be
installed from npm yet.

React, Vue, and Svelte each cover all eleven components. Component and installation pages
have a React/Vue selector on one canonical `/docs/<name>` page. It changes the checked source,
installation instructions, and API notes without navigation or restarting the live preview. The
framework preference is remembered locally across pages; a future single-framework page hides
the other choice without replacing the saved preference. Legacy
`/docs/vue/<name>` entries remain compatible. Native Vue SFC demos are independently verified
against React.
Sidebar navigation keeps the navigation controls mounted and prepares the selected framework's
new article before displaying it, without changing the canonical URL format.
Vue 3.5+ and a TypeScript project are required.

Svelte 5 pages live at `/docs/svelte/<name>` and `/docs/svelte/installation`. They are separate
documents rather than in-place switches, so their live demos run on the Svelte adapter. The
selector links to them, and the sidebar on a Svelte page opens other Svelte pages. Svelte 5.46+
and a TypeScript project are required; `@kida-ui/svelte` stays private until an npm release
decision.

React uses the existing `/r/<name>.json` registry through `shadcn`. Vue uses
`/r/vue/<name>.json` through `shadcn-vue@2.8.2`, with its own catalog at `/r/vue/registry.json`.
Svelte uses `/r/svelte/<name>.json` through `shadcn-svelte@1.8.0`, with its catalog at
`/r/svelte/registry.json`. Every CLI path copies the required Kida source and CSS and declares
only public third-party packages.
No unpublished `@kida-ui/*` dependency is required by copied source.

```bash
npx shadcn-vue@2.8.2 add https://kida-ui.onrender.com/r/vue/text-bloom.json
```

Complete the [shadcn-vue Vite setup](https://www.shadcn-vue.com/docs/installation/vite) and
initialize `components.json` first. `aliases.ui` controls the destination; the default import is
`@/components/ui/kida/text-bloom.vue`. Manual copying is also documented on each component page.
Keep Vue's SFC, `.types.ts`, `.motion.ts`, and CSS files together in the `kida` directory.

```bash
npx shadcn-svelte@1.8.0 add https://kida-ui.onrender.com/r/svelte/text-bloom.json
```

Svelte items install into `kida/` under `aliases.ui`, by default
`src/lib/components/ui/kida`. SvelteKit 2 and Vite projects import them through `$lib`; SvelteKit
3 projects use `#lib`, the `package.json` import that `shadcn-svelte init` configures. The
shadcn-svelte CLI requires Tailwind CSS in the project even though Kida does not use it.

`pnpm registry:check-copy` validates React source fixtures and invokes the pinned Vue CLI against
an isolated loopback registry. Each Vue item is installed in its own clean TypeScript project;
a combined installation uses a custom UI alias. These checks install actual public dependencies,
reject unpublished imports, verify installed paths and shared-file consistency, compile the exact
shown quick starts, production-bundle them, and render deterministic server HTML in Node. Vue's
required TypeScript compiler is part of the host fixture. The CLI's icon catalog is supplied locally,
so registry installation does not depend on the upstream website; public dependencies use npm.
`--combined-only` on `scripts/check-vue-copy-source.mjs` is a debugging shortcut; CI runs all cases.

`scripts/check-svelte-copy-source.mjs` does the same for Svelte with the pinned shadcn-svelte CLI:
each item installs into its own clean project with `$lib`, then all items install together with a
custom UI alias and again with SvelteKit 3's `#lib` package import. Each project runs
`svelte-check --fail-on-warnings` on the copied source and the shown quick starts, builds them,
and renders them on the server twice to confirm deterministic HTML. The CLI's base style index is
served locally.

`pnpm check:vue-consumer` packs the Vue, motion, and styles packages, extracts them into an isolated
temporary consumer outside the workspace, and checks the displayed Vue demos against the packed
declarations. It validates bundler and NodeNext type resolution, production bundling with the real
styles, and Node SSR without DOM globals. Only declared third-party runtime dependencies and the
Vue host are linked from the locked installation; no Kida source aliases or workspace package
links are available. Run it after the package builds; it is also part of `pnpm verify` and CI.

Kida generates two consumption models from one implementation. The registry gives users the
framework-specific component source to own and edit, and it works today. Copied components do not
update automatically. The npm package will be the upgradeable option once it is published. Kida
does not maintain a second hand-written copy of a component.

## Package install (not available yet)

These packages are not on npm, so the commands below fail today. They describe the planned
package path. `pnpm check:vue-consumer` tests that path with locally packed archives.

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
