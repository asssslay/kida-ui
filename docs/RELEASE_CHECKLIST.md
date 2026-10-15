# Release conformance checklist

The seven React and Vue components have package and copied-source distribution. Vue remains
experimental until release evidence is reviewed. Passing automation does not establish real-device
or screen-reader support. Do not mark an unperformed check as passed.

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

## Manual review setup

Build shared packages and run the documentation site:

```sh
pnpm exec turbo run build --filter=@kida-ui/react --filter=@kida-ui/vue
pnpm --filter @kida-ui/docs dev --host 0.0.0.0
```

Use the port printed by Astro. Open `/docs/vue/reveal`, `/docs/vue/collapse`,
`/docs/vue/text-bloom`, `/docs/vue/magnetic`, `/docs/vue/photo-pile`,
`/docs/vue/scribble-highlight`, and `/docs/vue/sticker-burst`.
Also check their React equivalents by removing `/vue` from each path.

For a phone/tablet, connect it to the same Wi-Fi as the Mac and open
`http://<Mac-LAN-IP>:<Astro-port>/docs/vue/photo-pile`. Find the Mac's LAN address in
System Settings → Network → Wi-Fi → Details → TCP/IP. Keep the server running during review.

## Required hardware and assistive technology

Record each combination separately:

| Combination | Required evidence | Result |
|---|---|---|
| macOS Safari + VoiceOver | Announcement quality, keyboard use, focus | Pending |
| Windows Chrome + NVDA | Announcement quality, keyboard use, focus | Pending |
| iOS Safari on a real iPhone/iPad | Touch actions, PhotoPile drag/scroll, reduced motion | Pending |
| Android Chrome on a real phone/tablet | Touch actions, PhotoPile drag/scroll, reduced motion | Pending |

For each combination, record the commit SHA (`git rev-parse HEAD`), OS/device, browser and screen
reader versions, date, tester, normal/reduced-motion results, and any recording or issue link.
Do not infer a pass for one adapter or device from a different adapter or emulator.

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

Attach completed records and green CI links to the release PR. Resolve failures before changing
Vue's support status. Confirm that required branch-protection checks include the new browser jobs;
repository settings are a separate maintainer action.

After manual sign-off, review `pnpm changeset status` and prepare a versioning PR with Changesets.
Check generated versions/changelogs and packed consumers together, including shared motion/styles.
Confirm npm scope access, release credentials, and the intended prerelease dist-tag before
publication. Publication and promotion out of experimental status require a release decision;
adding these checks does not publish packages or change component APIs.
