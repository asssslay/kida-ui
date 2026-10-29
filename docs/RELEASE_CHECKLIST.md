# Release conformance checklist

All eleven components have React and Vue package and copied-source distribution. The
automated gates are required for a release. The manual checks are recommended: automation does not
establish real-device or screen-reader support, so run them when you can, especially after changing
interaction, touch handling, or announced text. Record only checks that were actually performed.

## Automated gates

From the repository root, on a host supported by the locked Playwright version:

```sh
pnpm install --frozen-lockfile
pnpm --filter @kida-ui/react exec playwright install --with-deps chromium firefox webkit
pnpm verify
pnpm test:cross-browser
pnpm --filter @kida-ui/react test:visual
pnpm -r --filter './packages/*' exec publint
```

CI runs Chromium in the existing verify job and Firefox/WebKit in separate Ubuntu 24.04 jobs.
Both adapters run their behavior suites; React includes responsive geometry and Vue includes
Node-rendered hydration, accessibility, and exact settled React/Vue pixel parity at both widths.
The Vue test command also runs Chromium touch emulation. WebKit runs the tap scenarios in a
mobile touch context. Firefox has desktop coverage; it does not run mobile touch emulation.

Touch taps use Playwright's touchscreen input and assert trusted native activation. Chromium also
runs PhotoPile drag gestures through its input pipeline, including normal release, cancellation,
and reduced motion. These tests do not replace real-device scroll/drag checks.

Run one engine after package builds when diagnosing failures:

```sh
pnpm --filter @kida-ui/react test:cross-browser --project firefox
pnpm --filter @kida-ui/vue test:cross-browser --project webkit
pnpm --filter @kida-ui/vue test:cross-browser --project webkit-touch
pnpm --filter @kida-ui/vue test:touch
```

Failure artifacts are uploaded separately for each CI engine. Vue parity artifacts are also
separated by engine and fixture width. Stored screenshot references remain Linux Chromium only;
follow [VISUAL_TESTING.md](VISUAL_TESTING.md) before changing them.

The locked Playwright version cannot install Firefox/WebKit on macOS 13. Use a supported host or
Ubuntu CI for those engines; system Chrome remains the local Chromium fallback. A missing engine
is an outstanding check, not a pass. Playwright WebKit coverage does not prove iOS Safari support.

## Manual review setup (recommended)

Build shared packages and run the documentation site:

```sh
pnpm exec turbo run build --filter=@kida-ui/react --filter=@kida-ui/vue
pnpm --filter @kida-ui/docs dev --host 0.0.0.0
```

Use the port printed by Astro. A page's live previews use the adapter chosen when the page loads.
The React/Vue buttons change only the code examples and API notes, never the running previews.

- **Vue:** type each `/docs/vue/<name>` address into the address bar: `/docs/vue/reveal`,
  `/docs/vue/collapse`, `/docs/vue/text-bloom`, `/docs/vue/magnetic`, `/docs/vue/photo-pile`,
  `/docs/vue/scribble-highlight`, `/docs/vue/sticker-burst`, `/docs/vue/image-text`,
  `/docs/vue/space-type`, `/docs/vue/glow-highlight`, and `/docs/vue/dual-wave`. The address then shows
  `/docs/<name>`, so do not use Reload to restart a check: a reload loads React previews.
  Open the `/docs/vue/<name>` address again instead.
- **React:** select React on any component page, then type each `/docs/<name>` address for the
  same eleven components.
- **Sidebar:** after a component page is open, sidebar links load previews for the selected
  framework.

To confirm the adapter under test, inspect a preview's `astro-island` element in the browser's
developer tools: its `component-url` ends in `.vue` for Vue and `.react.tsx` for React.

For a phone/tablet, connect it to the same Wi-Fi as the Mac and open
`http://<Mac-LAN-IP>:<Astro-port>/docs/vue/photo-pile`. Find the Mac's LAN address in
System Settings → Network → Wi-Fi → Details → TCP/IP. Keep the server running during review.

## Recommended hardware and assistive technology

These combinations give the most useful manual coverage:

| Combination | What it shows |
|---|---|
| macOS Safari + VoiceOver | Announcement quality, keyboard use, focus |
| Windows Chrome + NVDA | Announcement quality, keyboard use, focus |
| iOS Safari on a real iPhone/iPad | Touch actions, PhotoPile drag/scroll, reduced motion |
| Android Chrome on a real phone/tablet | Touch actions, PhotoPile drag/scroll, reduced motion |

When you run one, record the commit SHA (`git rev-parse HEAD`), OS/device, browser and screen
reader versions, date, tester, normal/reduced-motion results, and any recording or issue link in
the release PR. A result applies only to the adapter and device actually tested.

## Keyboard and screen readers

On macOS, enable keyboard navigation in System Settings → Keyboard. Safari may also need its
setting to let Tab highlight every webpage item. Toggle VoiceOver with Command-F5 (or
Fn-Command-F5); Control-Option is the VoiceOver modifier. Use Control-Option-Right Arrow to read
forward. Turn Quick Nav off with Left Arrow + Right Arrow together if it interferes with Tab.
On Windows, start NVDA and use Tab/Shift-Tab, Enter, Space, and normal reading navigation.

For each framework:

1. Tab through the demo controls and PhotoPile cards. Confirm visible focus, a useful name, a
   sensible order, and no keyboard trap. Activate buttons with Enter and Space.
2. On Collapse, confirm the button announces expanded/collapsed state. Open it and read the
   content; close it and confirm the removed content is no longer encountered. Focus should stay
   on the toggle. Toggle quickly and confirm the final state remains usable.
3. Read Reveal and TextBloom before and after replay. Text must be announced once in the correct
   order, including punctuation. Copy TextBloom text and confirm it is intact.
4. Confirm Magnetic's child action works without a mouse. PhotoPile should announce the group and
   individual photo actions; focus raises a card without losing focus. Decorative scribbles and
   burst particles should not be announced.
5. Repeat with reduced motion enabled. On macOS use System Settings → Accessibility → Display →
   Reduce motion, then reload. On Windows use Accessibility → Visual effects → Animation effects
   off. Content/actions must remain available without entrance travel or decorative bursts.

Axe checks in CI are useful but cannot replace these announcement checks.

## Real touch devices

For each device and framework, review both normal and reduced motion:

1. Tap all demo controls. Magnetic must not move its action away from your finger. Collapse must
   open/close repeatedly; StickerBurst must preserve its button action on repeated taps.
2. In PhotoPile, drag more than one card in different directions, including beyond the pile's
   edge. Release and confirm the card returns and another drag starts immediately. Try a second
   finger while dragging; the first gesture must remain coherent.
3. Interrupt a drag by switching apps or opening the browser UI. Return and confirm cards remain
   usable without stuck transforms or drag states. Record the exact interruption when reporting a
   failure; operating systems do not deliver identical cancellation paths.
4. Scroll the page starting outside a card. It should scroll normally. A gesture starting on a
   draggable card is intentionally reserved for dragging (`touch-action: none`). Confirm there is
   no unexpected page-level horizontal overflow in portrait or landscape.
5. With reduced motion, cards may be raised but must not spring or retain a drag transform after
   release. Confirm readable text, usable controls, and no hidden content throughout.

## Release decision

Attach green CI links to the release PR, plus any manual check records. Resolve failures found by
either before release. Confirm that required branch-protection checks include the new browser jobs;
repository settings are a separate maintainer action.

Then review `pnpm changeset status` and prepare a versioning PR with Changesets.
Check generated versions/changelogs and packed consumers together, including shared motion/styles.
Confirm npm scope access, release credentials, and the intended prerelease dist-tag before
publication. Publication requires a release decision; these checks do not publish packages or change
component APIs.
