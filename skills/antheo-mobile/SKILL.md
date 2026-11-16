---
name: antheo-mobile
description: Makes a web app feel native on phones and touch screens. It starts from the symptom (the page zooms into a field, hover sticks after a tap, content hides under the notch or the keyboard, the page bounces, taps lag, the bottom bar jumps) and fixes the cause, then sets the phone shell, stacked actions, bottom sheets and tables that scroll sideways. Use for "this feels wrong on my phone", "make it work on mobile", "feels like a website, not an app", or any change that will be used on touch.
---

# Antheo Mobile

A phone layout is not the desktop squeezed. It follows the habits of the phone in the person's hand: a thumb, not a
pointer; sheets from the bottom; actions stacked where the thumb reaches; presses that answer at once. This skill
starts from what feels wrong, fixes the cause, then sets the phone's own layout.

Type sizes belong to **antheo-type** (15px on touch, 16px in fields); target sizes to **antheo-access**; drag physics
and sheet timing to **antheo-motion**; surfaces to **antheo-surface**; breakpoints and containers to
**antheo-layout**. This skill applies them to phones and holds what only phones need.

## Decide in this order

1. **The symptom.** Ask what feels wrong, or open it on a phone and find out. Look it up in the table below.
2. **The cause, in code.** Name the line that causes it. Fix the cause, never hide the symptom.
3. **The shell.** Top bar, menu, bottom bar, safe areas.
4. **What changes at phone width.** Stacks, sheets, sideways-scrolling rows and tables.
5. **Check on a real phone.** Say which fixes were verified in code and which need the device.

## Symptoms and their causes

| Symptom | Cause | Fix |
|---|---|---|
| The page zooms when a field is tapped | field text under 16px | fields at `16px` wherever the pointer is coarse (`@media (pointer: coarse)`) |
| Hover styles stay after a tap | hover not gated | hover under `@media (hover: hover) and (pointer: fine)`; show the hover look on `:active` instead |
| Grey flash on tap | the browser's tap highlight | `-webkit-tap-highlight-color: transparent` and a real `:active` press |
| Taps feel slow | double-tap-to-zoom wait | `touch-action: manipulation` on controls |
| Long press selects a button's label | selection on controls | `user-select: none; -webkit-touch-callout: none` on controls only; content stays selectable |
| Content hides under the browser bars | `100vh` | `100dvh` (`100svh` for a hero that must not jump) |
| Content behind the notch or home indicator | no safe areas | `viewport-fit=cover` and `env(safe-area-inset-*)` padding on every bar, sheet and pinned action |
| Fixed bottom actions hidden by the keyboard | the layout viewport ignores it | both: `interactive-widget=resizes-content` in the viewport meta (Android) and the `visualViewport` script (iPhone, which ignores the meta) |
| The page behind a sheet scrolls | scroll chaining | `overscroll-behavior: contain` on sheets, drawers and chat panes |
| The whole page bounces or reloads on pull | default overscroll on an app screen | `overscroll-behavior-y: none` on the app shell; keep pull-to-refresh only on feeds |
| Something only appears on hover | hover-only information | tips open on tap; a disabled control explains why in a line of text beneath it |
| Small icons hard to hit | the drawn size is the hit size | a 44px hit area round the icon (`::after`), look unchanged; hit areas never overlap |
| A horizontal scrollbar on a phone | something wider than the screen | find it (`* { outline: 1px solid red }`), usually a fixed width, `100vw`, a long word or a table; give it `min-width: 0` or let it scroll inside its own box |
| Text tiny, or huge after rotating | text inflation | `-webkit-text-size-adjust: 100%; text-size-adjust: 100%` on `html` |
| Jank while scrolling a list | heavy paint on scroll | antheo-motion `references/performance.md` |
| A bottom bar hides the last rows or the focused field | a sticky bar with no room made for it, or a see-through one | the bar rule below: opaque, a hairline, the content padded by the bar's height; or keep the button in the flow |
| A word splits in a narrow column ("Unlimite / d") | `overflow-wrap: anywhere` on labels or values | remove it; give the column room or stack the row; break only strings people typed |
| The header's edges don't line up with the content | bar padding differs from the page gutter | one gutter for the bar and the content (`--gutter`) |

## Sizes on touch

| Thing | On a phone |
|---|---|
| Buttons, fields, selects | `44px` tall (`--h-control` on a phone, from antheo-build's style block) |
| Rows in a list | `52px` (`--h-row`); at least `44px` |
| Switch | track `44×26`, knob `22px` (`--sw-*`) |
| Icon buttons and small marks | drawn at their normal size, hit at `44px` |
| Side gutter | `--gutter` from antheo-layout (16px at phone width); each block keeps its own sides |
| Type | the block's phone values: body `15px`, titles `17px`, a page title `22px`, a headline `28px`; fields `16px` |

A build changes nothing by hand for phones except layout: the style block's phone values re-size type, controls and
rows.

## The shell

- **The panel fills the screen:** it doesn't float, and has no corners or shadow.
- **Top bar** (only where the desktop screen has one): `--h-bar` tall with the top safe area added above, the surface colour, no
  line under it until content scrolls beneath. A neutral logo tile and the name at the start; a `44px` menu button at
  the end only if there is navigation.
- **Menu:** fills from under the bar to the bottom; is kept in the page but `inert` when closed, so a dialog opened from the
  menu isn't torn down with it; search first, then navigation, account, settings.
- **Bottom bar, only when the screen needs one.** A form or flow that fits in about a screen and a half keeps its
  button in the flow, after the last field. A longer one may fix its actions to the bottom, and then the bar is:
  **opaque** (the page ground, never a gradient or a fade), with a hairline on top, padded for
  `env(safe-area-inset-bottom)`, and the content gets `padding-bottom` equal to the bar's full height (publish it as a
  custom property) so the last row and the focused field are never under it. Check it with the keyboard open and in
  the error state, where the page is tallest.
- **The bar and the content share one gutter,** so their edges line up.

## A screen in a phone app

A full screen in an app (a "New contact", an "Edit profile", a checkout step) is built like the platform builds one,
not like a web page squeezed narrow. On an iPhone (393 × 852pt, the size to check first):

- **Viewport:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover,
  interactive-widget=resizes-content">`, so safe areas have values, and on Android the layout shrinks when the
  keyboard opens. Safari on iPhone ignores `interactive-widget`: there the page keeps its height and the keyboard
  covers the bottom 336pt, so the action bar is moved up by script with `visualViewport` (`references/recipes.md`,
  section 5). Ship both.
  The screen is a grid of `100dvh`: bar, a content area that scrolls, action bar.
- **Top:** the content starts below the status bar (`padding-top: env(safe-area-inset-top)`, about 59pt with the
  Dynamic Island). A `44px` navigation bar holds Cancel or Back at the start (a text button, `44px` hit area) and the
  screen's title, centred, in `--t-body` at `--w-strong`; or no title in the bar and a large title (28/34) under it.
  Never both.
- **Save goes in one place.** A short edit of existing data puts Save at the end of the navigation bar. A screen whose
  job is to create or send something puts its primary action in the bottom action bar (below), and the navigation
  bar holds only Cancel and the title.
- **Content:** a `16px` gutter; fields `--h-control` (44px on a phone) at 16px text, a label above each, `16px` apart; related fields
  grouped, one group per idea.
- **The action:** one primary button, full width inside the gutter, `--h-cta` (44px on a phone) tall, in an action bar at the bottom of
  the grid, above the home indicator (`padding-bottom: max(16px, env(safe-area-inset-bottom))`). When the keyboard
  opens it rides up above it: by itself on Android, and by the `visualViewport` script on iPhone. On a web page (not a
  full app screen) a short form keeps the button in the flow instead.
- **Check it** at 393 × 852 with the keyboard open (336pt): the focused field, its error and the action all visible.
- **The header never moves between states** of one screen, and follows the state (no "Log in" once signed in).

## What changes at phone width

| Desktop | Phone |
|---|---|
| Actions beside the title | below the title at full width, one per line, the primary first |
| A button pair in a dialog or flow | one above the other, the confirm first, `8px` between |
| Previous / Next | two equal halves on one line |
| A grid of columns | one column |
| A segmented control that doesn't fit | one button showing the current choice; tapping it lists the rest in a sheet |
| A row of filters | one line that scrolls sideways past the gutter, faded `20px` at each end; it never wraps |
| A tooltip | opens on tap |
| A dialog | a bottom sheet |
| A table | scrolls sideways inside its frame, the first column sticky while at least `88px` stays beside it; tapping anywhere on a row opens it |
| Flow actions | pinned to the bottom, one per line, the primary first |
| Long labels | shortened ("org", whole amounts lose ".00"), never truncated mid-value |

## Bottom sheets instead of dialogs

- **Form:** the screen's full width, `--r-sheet` (14px) on the two upper corners, one hairline along the top; at most
  `calc(100dvh - env(safe-area-inset-top) - 24px)` tall. Its fill continues past the bottom of the screen, so an
  upward pull never reveals a gap; the home-indicator space is a see-through bottom border, which leaves the
  sheet's own padding untouched.
- **A grab handle instead of a close ×:** a `36×5` pill floating `12px` over the sheet's upper edge, inside an `88×44` button
  labelled "Close". Tapping it, or pressing Enter or Space, closes the sheet.
- **Inside:** no title band; the title is a `20px` heading on the sheet. Facts that belong together share one raised
  card, in `--h-row` rows (52px on a phone). Actions stay outside it, underneath: full-width `--h-control` buttons
  (44px on a phone) with `8px` between.
- **Moving:** drag from anywhere on the sheet once the press has moved more than `4px` (anything less counts as a tap);
  a body that scrolls drags the sheet only from its top. Timing, closing distance, flick speed and the spring are
  antheo-motion's. Never draggable while it can't close (saving, paying).
- **Keys and focus:** antheo-access's dialog rules; the handle is a real button, not a gesture only.

## What generated UI gets wrong here

Check each in `references/habits.md` before calling it done: small targets · navigation or actions display: none on
a phone · a desktop layout squeezed · a hint hidden by the keyboard · a swipe that leaves the page · things that
only work on hover or a long press · 100vh panels that jump.

## Check on a phone

- [ ] The symptom reproduced, its cause named in code, the fix verified (in code and, where it needs one, on a device)
- [ ] No field zooms; no hover sticks; no grey tap flash; taps answer at once
- [ ] Nothing hidden behind the notch, the home indicator, the browser bars or the keyboard; no bar covering content in any state
- [ ] No word split mid-word; the header and the content share their edges
- [ ] Every target `44px`, no hit areas overlapping
- [ ] No sideways scroll on the page; rows and tables scroll inside their own box
- [ ] Sheets: tapping a row still works; a short drag or a flick dismisses; the handle works by keyboard
- [ ] Light and dark, at 200% zoom, on a real phone (iOS Safari and Android Chrome)
- [ ] Checked against every habit in `references/habits.md`

## Files

- `references/recipes.md`: the native-feel base CSS, the viewport meta, hover gating for Tailwind and plain CSS, the
  44px hit area, a bottom bar that clears the keyboard, the sheet's markup and CSS, a table that scrolls sideways
- uses antheo-motion `references/gestures.md` for the drag itself and antheo-review `scripts/check-page.mjs` at 360
  and 390px
- `references/habits.md`: what generated UI gets wrong here, each with its fix
