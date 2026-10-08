# Responsive and visual testing

Status: **release gate** (2026-09-26)

Kida uses functional geometry assertions and a small set of stable screenshots. The screenshots
protect settled layout and styling; interaction tests remain responsible for animation timing and
interruption behavior.

## Canonical environment

- GitHub Actions `ubuntu-24.04`
- the Chromium revision installed by the exact Playwright version in `pnpm-lock.yaml`
- CSS-pixel screenshots at a fixed device scale
- the version-pinned Instrument Sans package for the isolated fixture, with all fonts and inline
  images loaded before capture
- `prefers-reduced-motion: reduce`, hidden carets, and disabled finite animations
- mobile viewport `390 × 844` and desktop viewport `1280 × 900`; mobile cards are captured
  separately so every state remains readable without scaling a tall page

CI is authoritative. Local runs are useful for inspecting a change, but approved images should only
be replaced after comparing them with the Linux CI output.

## Commands

Run the checked-in baselines:

```sh
pnpm --filter @kida-ui/react test:visual
```

Intentionally replace them:

```sh
pnpm --filter @kida-ui/react test:visual:update
```

Never update screenshots merely to make CI green. Review the expected, actual, and diff images,
confirm that the change is intended, and describe it in the pull request. CI uploads differences as
the `visual-test-differences` artifact for 14 days.

## Scope

The mobile and desktop galleries cover all seven components in deterministic settled states, on
controlled light and dark surfaces. The same visual project also runs axe with color contrast
enabled. Transient animation frames are intentionally excluded because frame timing is not a stable
pixel contract.

Responsive browser tests separately verify:

- PhotoPile compact sizing, focus visibility, and absence of page-level overflow;
- Collapse height remeasurement after content wraps in a narrower container; and
- TextBloom wrapping, text preservation, and absence of horizontal overflow.
