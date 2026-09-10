# Kida UI Distribution

Status: **implemented for React components** (2026-09-03)

Kida supports two consumption models from one implementation. The npm package is the stable,
upgradeable option. The registry gives users the React component source when they need to own and
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
also served at `https://kida.dev/r/<name>.json`, so users with a `components.json` file can write
the same source into their configured directories:

```bash
npx shadcn@latest add https://kida.dev/r/reveal.json
```

This uses shadcn's existing CLI, not a Kida CLI. A Kida-specific CLI remains deferred until a
second framework makes framework selection necessary.

Copied components are owned by the consuming application, but they are not dependency-free.
Each registry item includes the Kida source and CSS it needs and declares only public runtime
packages. For example, copied `Reveal` includes its small motion helper and depends on the public
`motion` package, while copied `Collapse` includes its CSS and depends on Zag presence. Copied
source never requires an unpublished `@kida-ui/*` package.

## Maintainer workflow

1. Implement the component in `packages/react/src` and shared CSS in `packages/styles`.
2. Add its source files, targets, dependencies, category, and package metadata to
   `registry/definitions.mjs`.
3. Run `pnpm registry:build` and commit the generated `registry/registry.json` and
   `registry/r/<name>.json` files.
4. Add `<Distribution name="<name>" />` to the component documentation page.
5. Run `pnpm verify`.

`pnpm registry:check` validates the output with the official `shadcn/schema` API and fails when a
generated file is missing, stale, or orphaned. `pnpm registry:check-copy` installs each registry
item by itself into a separate temporary React source tree. It rejects unpublished or undeclared
runtime imports, verifies every local file import, typechecks the result, and bundles it with Vite.
The fixtures are created outside the workspace and deleted after every run, so another component
or workspace package cannot accidentally hide a missing copied file or dependency.

## Generation rules

- Package source is read verbatim whenever possible.
- File targets use shadcn placeholders such as `@ui/`, so the consumer's `components.json`
  controls the real destination.
- Dependency ranges come from the React and motion source-package manifests. Workspace-only
  dependencies are rejected: their required source must be copied or their package published.
- Copy-only imports are deterministic generator transforms. Today these redirect Kida motion
  imports to copied helpers, add local CSS imports to copied components, and add token imports to
  copied stylesheets.
- `registry/r` is generated output and must never be edited by hand.
