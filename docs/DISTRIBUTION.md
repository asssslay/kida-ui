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
Their registry JSON declares the runtime packages it needs. For example, copied `Reveal` depends
on `@kida-ui/motion`, while copied `Collapse` includes its CSS and depends on Zag presence.

## Maintainer workflow

1. Implement the component in `packages/react/src` and shared CSS in `packages/styles`.
2. Add its source files, targets, dependencies, category, and package metadata to
   `registry/definitions.mjs`.
3. Run `pnpm registry:build` and commit the generated `registry/registry.json` and
   `registry/r/<name>.json` files.
4. Add `<Distribution name="<name>" />` to the component documentation page.
5. Run `pnpm verify`.

`pnpm registry:check` validates the output with the official `shadcn/schema` API and fails when a
generated file is missing, stale, or orphaned. `pnpm registry:check-copy` installs the generated
files into a temporary clean React source tree and typechecks them. The fixture is deleted after
every run.

## Generation rules

- Package source is read verbatim whenever possible.
- File targets use shadcn placeholders such as `@ui/`, so the consumer's `components.json`
  controls the real destination.
- Dependency ranges come from `packages/react/package.json`; workspace packages are emitted
  without the internal `workspace:*` protocol.
- Copy-only imports are deterministic generator transforms. Today these add local CSS imports to
  copied components and token imports to copied stylesheets.
- `registry/r` is generated output and must never be edited by hand.
