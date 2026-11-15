# Screen readers: structure, announcements, hidden content, testing

## 1. Landmarks and headings

| Landmark | Element | Rule |
|---|---|---|
| banner | `<header>` directly in `body` | one per page |
| navigation | `<nav>` | name every nav when there are 2+ (`aria-label="Main"`, `"Footer"`, `"Breadcrumb"`); do not add the word "navigation" to the name |
| main | `<main>` | exactly one; skip-link target (`id="main" tabindex="-1"`) |
| complementary | `<aside>` | related, not required content; named if more than one |
| contentinfo | `<footer>` directly in `body` | one |
| search | `<search>` or `<form role="search">` | around the search form |
| region | `<section aria-labelledby="h">` | only for sections users will want to jump to; at most 6 per page |

All content sits inside a landmark. Do not turn every `div` into a region.

Headings: one `h1` that names the page; `h2` for sections; never skip a level down; do not pick a level for its size. Check the outline: read only the headings in order; it must read like a table of contents. Breadcrumbs: `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` on the last item.

## 2. Live regions

The container **must be in the DOM, empty, before** you put text in it. Inserting a region that already has text usually announces nothing. Keep messages short (under 120 characters), write the whole sentence, and send each message once.

| Situation | Markup | Notes |
|---|---|---|
| Saved, copied, filtered "12 results" | `role="status"` (= `aria-live="polite"` + `aria-atomic="true"`) | Default choice |
| Form submit failed, connection lost, session expiring | `role="alert"` (= assertive + atomic) | Interrupts. One at a time. Never for success |
| Chat, activity feed, console | `role="log"` (polite, not atomic) | New items appended |
| Countdown that matters | `role="timer"` (no announcements by default) | Announce only at milestones via status |
| Progress bar | `<progress value max>` or `role="progressbar"` + `aria-valuenow` | Add a status message at 25% steps; never announce every percent |
| Live search results | `role="status"` updated 500ms after typing stops: "8 results for 'lamp'" | Do not announce the list itself |
| Loading | `aria-busy="true"` on the region being filled, status "Loading orders" at the start, "12 orders loaded" at the end | Remove `aria-busy` when done |
| Marquee/ticker | avoid; if needed `role="marquee"` with pause control | |

```html
<div id="live" role="status" class="sr-only"></div>
```
```js
const live = document.getElementById('live');
function say(text) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); }  // clears first so repeated text is announced again
```
Do not use `aria-live` on a region that updates more than once per second; do not nest live regions; do not put focusable content inside one. Test in at least NVDA and VoiceOver: live-region timing differs.

Errors on async results: put the text in the region **and** show it on screen next to what failed; the status line alone vanishes. Loading skeletons are hidden from AT (`aria-hidden="true"`) and the container has `aria-busy`.

### SPA route changes

```js
function onRouteRendered(titleText) {
  document.title = `${titleText} - Site`;
  const h1 = document.querySelector('main h1'); h1.tabIndex = -1; h1.focus({ preventScroll: false });
  say(`${titleText}, page loaded`);        // optional if focus move already reads the h1
}
```
Focus the h1 (or `main`) once the new view is in the DOM. Do not focus on the first render, on hash-only or filter changes, or when the user stayed on the same page. Restore scroll for back/forward; do not restore focus to a removed node: focus the heading instead.

## 3. Hidden content: pick one

| Want | Use | Visible | In accessibility tree | Focusable |
|---|---|---|---|---|
| Gone for everyone | `hidden` attribute, `display:none`, `visibility:hidden` | no | no | no |
| Off-screen panel that still exists (closed drawer, inactive carousel slide) | `inert` (plus `visibility:hidden` after the transition) | maybe | no | no |
| Text for screen readers only | `.sr-only` class | no | yes | n/a (only for static text) |
| Decoration | `aria-hidden="true"` on the icon, `alt=""` on an image | yes | no | must not contain focusable |
| Visible to AT but not seen, becoming visible on focus | skip link pattern | on focus | yes | yes |

```css
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.sr-only:focus-visible, .skip:focus-visible { position: fixed; top: 8px; left: 8px; width: auto; height: auto; margin: 0; padding: 12px 16px; clip-path: none; z-index: 1000; background: var(--surface); outline: 2px solid var(--focus); }
```
Never `aria-hidden="true"` on a focusable element or its ancestor (focus lands on something the reader says does not exist). Never `.sr-only` on an interactive control. `display:none` on a label hides it from the accessible name. `opacity:0` does not remove anything. `tabindex="-1"` alone does not hide anything from a screen reader.

## 4. Icons, SVG, images

Icon: `<button aria-label="Close"><svg aria-hidden="true" focusable="false">…</svg></button>`. Icon beside text: hide the icon. Meaningful standalone SVG: `<svg role="img" aria-labelledby="t"><title id="t">Sales up 12%</title>…`. Icon font glyphs: `aria-hidden="true"` and the text elsewhere. Emoji: wrap decoration in `<span aria-hidden="true">`.

Alt text, as a decision tree:
1. Is it inside a link or button and the only content? **alt = where it goes or what it does** ("Home", not "logo").
2. Does it carry information the text nearby does not? **Describe the information** in under 125 characters ("Line chart: signups doubled from March to June").
3. Does the nearby text already say it (photo beside its caption, card thumbnail)? **`alt=""`**.
4. Is it purely decorative (divider, texture, background)? **`alt=""`** or CSS background.
5. Is it text in an image? **Alt is the same text.** Avoid text in images.
6. Is it a complex diagram/chart? Short alt that names it plus a long description on the page (see 6) linked with `aria-describedby` or an adjacent `<details>`.
Never write "image of", never leave `alt` off (a missing alt makes screen readers read the file name).

## 5. Tables

```html
<table>
  <caption>Invoices, 2026<span class="sr-only">. Sort by selecting a column heading.</span></caption>
  <thead><tr><th scope="col" aria-sort="descending"><button type="button">Date</button></th><th scope="col">Amount</th></tr></thead>
  <tbody><tr><th scope="row">14 Nov</th><td>$40.00</td></tr></tbody>
</table>
```
Native `table`, `caption`, `th` with `scope`; complex tables with two header levels use `id`/`headers`. Do not set `display:block/flex` on table parts without restoring `role` (it removes table semantics in some readers). Empty cells hold "-" with `<span class="sr-only">no data</span>`. A responsive table either scrolls in a wrapper (`tabindex="0" role="region" aria-label="Invoices table"`) or stacks with `data-label` text kept in the DOM. Sorting: see patterns.md.

## 6. Charts and data visualisation

A chart must be understandable without sight and without colour.

1. Give the chart a text name and summary: `<figure role="group" aria-labelledby="c-t" aria-describedby="c-s">` with a one-sentence takeaway ("Revenue grew 18% in Q3, led by Europe").
2. Provide the data as an HTML `<table>` (visible, or in a `<details><summary>View data</summary>` beneath). This is the real accessible alternative.
3. SVG: `role="img"` + `aria-label` on the whole chart when the table exists; otherwise make points focusable buttons (`tabindex="0"` roving) with names like "March, 4,200 signups".
4. Never encode by colour alone: use direct labels, patterns, shapes, or line styles; 3:1 between adjacent marks and against the background.
5. Tooltips on hover must also appear on focus and be dismissible (1.4.13); keyboard users move between points with arrows.
6. Animations on load respect reduced motion; no flashing.
Interactive range sliders for filtering follow the slider map (patterns.md).

## 7. The 15-minute manual pass

Do these in order. Stop at the first broken step, fix, restart that step.

| Min | Test | Pass when |
|---|---|---|
| 0-3 | **Keyboard only.** Unplug the mouse. Tab from the address bar through the whole page; Shift+Tab back; open every menu, dialog, tab, accordion; operate every control | You can do everything the page does; focus is always visible, always logical, never trapped; Escape closes layers and returns focus |
| 3-6 | **Screen-reader quick tour** (below). Page title, then headings list, landmarks list, links list, one form, one dialog | Titles, headings and landmarks read like an outline; every control reads name + role + state; dialog and errors are announced |
| 6-8 | **200% and 400% zoom.** Ctrl + to 200%, then 400% (a 320px-wide window) | No horizontal scroll (except tables), no cut-off text, no overlap, sticky bars leave room, nothing missing |
| 8-10 | **Text spacing.** Apply the bookmarklet/style in vision.md | Nothing clipped or overlapping |
| 10-12 | **Forced colors.** DevTools > Rendering > Emulate CSS media feature forced-colors: active (and prefers-contrast: more) | Every control has a visible edge, focus ring shows, icons visible, state (checked, selected) readable |
| 12-13 | **Reduced motion.** Rendering > prefers-reduced-motion: reduce | No sliding, parallax, autoplay; the page still makes sense |
| 13-15 | **Probe + automated scan.** `node scripts/a11y-probe.mjs <url>` and axe DevTools or Lighthouse | No blockers; every serious item fixed or justified |

What automated tools catch (axe, Lighthouse, WAVE, the probe): missing names, labels and alt, colour contrast on plain backgrounds, bad ARIA attributes and roles, duplicate ids, heading skips, missing landmarks and `lang`, small targets, invisible or hidden focus stops, clipped text under spacing override, horizontal scroll. What they miss: whether a name is *right*, whether the order makes sense, custom widget keys, focus management quality after dynamic changes, live-region timing, meaningful alt text, cognitive load, contrast over images and gradients, touch behaviour, whether error text helps.

## 8. Screen-reader commands

Pairings to test: NVDA + Firefox (Windows), NVDA + Chrome, VoiceOver + Safari (macOS and iOS), TalkBack + Chrome (Android), JAWS + Chrome if you have it. Never test with a screen reader and a different browser than your users use.

| Task | NVDA (Windows) | VoiceOver (macOS) |
|---|---|---|
| Start / stop | Ctrl+Alt+N / NVDA+Q (NVDA key = Insert or Caps Lock) | Cmd+F5 |
| Stop speech | Ctrl | Ctrl |
| Read page title | NVDA+T | VO+F2 (VO = Ctrl+Option) |
| Read from here | NVDA+Down | VO+A |
| Next / previous item | Down / Up (browse mode) | VO+Right / VO+Left |
| Next heading | H (Shift+H back); 1-6 by level | VO+Cmd+H |
| Headings list | NVDA+F7 (elements list) | VO+U then choose Headings |
| Landmarks | D (Shift+D); list in NVDA+F7 | VO+U, Landmarks (or VO+Cmd+L) |
| Next link / button / field | K / B / F | VO+Cmd+L (links), VO+Cmd+J (form controls) |
| Next table / cell | T / Ctrl+Alt+Arrows | VO+Cmd+T; VO+Arrow in table |
| Toggle browse / focus mode | NVDA+Space | automatic (Quick Nav: Left+Right arrows together) |
| Elements list | NVDA+F7 | Rotor: VO+U |
| Activate | Enter / Space | VO+Space |
| Read current element's description | NVDA+Tab | VO+F3 |
| Where am I (focus) | NVDA+Tab | VO+F3 |
| iOS VoiceOver | Swipe right/left = next/prev; double-tap = activate; rotor = twist two fingers (Headings, Links, Landmarks) | |

What to listen for: "Close, button" (name + role); "Notifications, switch, on" (state); "Email, edit, required, invalid entry, Enter an email like…" (form); "Delete project, dialog" (name of a dialog on open); "3 of 5" for tabs and menu items; and silence where there should be an announcement. If speech says "clickable", "group" or "link, link", the semantics are wrong. Write down what each reads before you fix; re-read after.
