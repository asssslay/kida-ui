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
be replaced after comparing them with the Linux CI output. macOS and Windows can differ in text
rasterization and font metrics even with the same bundled font, so a local screenshot mismatch does
not establish a Linux regression. Snapshot updates on non-Linux hosts are rejected to prevent
overwriting the shared CI references with images from another renderer.

## Commands

Run the checked-in baselines:

```sh
pnpm --filter @kida-ui/react test:visual
```

Intentionally replace them in the canonical Ubuntu 24.04 environment, after installing the locked
dependencies and bundled Chromium:

```sh
pnpm --filter @kida-ui/react test:visual:update
```

Never update screenshots merely to make CI green. Review the expected, actual, and diff images,
confirm that the change is intended, and describe it in the pull request. CI uploads differences as
the `visual-test-differences` artifact for 14 days.

The desktop gallery and mobile motion references were reviewed against the Ubuntu output from
[CI run 37760361477](https://github.com/asssslay/kida-ui/actions/runs/37760361477), and the mobile
Collapse reference against [CI run 37761097249](https://github.com/asssslay/kida-ui/actions/runs/37761097249).
The mobile Highlights and interaction references were reviewed against
[CI run 37761720417](https://github.com/asssslay/kida-ui/actions/runs/37761720417). The initial macOS
captures differed in text rendering and desktop line wrapping. Mobile screenshots run as separate
tests so one mismatch cannot hide the remaining comparisons and their artifacts.

## Scope

The experimental Vue milestone also compares all seven components against the built React adapter
in the same browser session at both viewport widths. Chromium runs under `pnpm verify`;
Firefox/WebKit run under `pnpm test:cross-browser` and their separate CI jobs. These settled
reduced-motion captures use fixed, identical content and integer geometry; exact decoded pixel
equality is required. The comparison has no stored baselines to update. Run the Chromium checks
with `pnpm --filter @kida-ui/vue test`. The React Linux baselines remain the independent styling
regression gate. The parity host window is larger than either test viewport so Vitest
does not scale its iframe; captures must contain one image pixel per CSS pixel. This prevents
rotated cards and SVG strokes from being compared at a fractional raster scale. Chromium uses
software rasterization for these adapter checks to avoid GPU shadow dithering between captures;
the independent Linux React screenshot environment is unchanged.

After building, `pnpm docs:test-browser` additionally compares production documentation demos
in the same browser at mobile and desktop widths. It requires matching demo lists and checks
content, semantic markup, computed styles, and layout relative to each stage (within 0.05 CSS
pixels), including expanded Collapse and all customization variants.
This catches drift between authored demos that identical adapter fixtures cannot detect. The
adapter tests above remain the pixel comparison gate. Failed docs comparisons save screenshots
and rendered element diagnostics under `apps/docs/.vitest-attachments/framework`, uploaded by CI.
Native Vue demos are tested through fresh server-rendered compatibility entries, independently
of the in-place selector. Selecting another framework must preserve the existing live preview
nodes and state. There are no stored baselines to update. CI runs this check in Chromium, Firefox,
and WebKit.

The mobile and desktop galleries cover all seven components in deterministic settled states, on
controlled light and dark surfaces. The same visual project also runs axe with color contrast
enabled. Transient animation frames are intentionally excluded because frame timing is not a stable
pixel contract.

Responsive browser tests separately verify:

- PhotoPile compact sizing, focus visibility, and absence of page-level overflow;
- Collapse height remeasurement after content wraps in a narrower container; and
- TextBloom wrapping, text preservation, and absence of horizontal overflow.

SpaceType has separate responsive browser checks at mobile and desktop widths, on light and dark
surfaces with color contrast enabled, in both normal and reduced motion. Its behavioral suite also
samples the full rotation and wave at minimum and maximum radii. These checks do not replace a
reviewed Linux screenshot baseline; adding SpaceType to the stored visual references remains a
pre-alpha task.

ImageText has mobile/desktop geometry, text-only markup, decoded licensed-photo rendering,
reduced-motion, and contrast-enabled axe checks in `image-text.visual.test.tsx`. The website
shows only the approved white composition. A stored ImageText screenshot must still be reviewed
in the canonical Linux environment before public alpha; no macOS baseline is introduced.
