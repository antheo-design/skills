# Widget patterns: keys, roles, markup

Source of truth: the ARIA Authoring Practices Guide (w3.org/WAI/ARIA/apg/patterns). Rule: if a native element does it, use it and skip this file. Every custom widget below must be tried with a screen reader before you ship it (see screen-readers.md).

## Focus models

| Model | Use when | How |
|---|---|---|
| Native focus | button, link, input, details, dialog | nothing to do |
| Roving tabindex | tabs, radios, menu, toolbar, tree, grid, listbox, carousel controls | current item `tabindex="0"`, others `-1`; arrow key moves the 0 and calls `.focus()` |
| `aria-activedescendant` | combobox (focus must stay in the text input), virtual lists | container keeps focus; `aria-activedescendant="id-of-current"`; current item gets a visible highlight |

Roving tabindex, copy-ready (works for tabs, toolbar, menu, radios, listbox):

```js
function rove(container, itemSel, { orientation = 'horizontal', wrap = true, onMove } = {}) {
  const items = () => [...container.querySelectorAll(itemSel)].filter((i) => !i.disabled && !i.hidden && i.getAttribute('aria-disabled') !== 'true');
  const set = (el) => { items().forEach((i) => i.tabIndex = i === el ? 0 : -1); el.focus(); onMove?.(el); };
  container.addEventListener('keydown', (e) => {
    const list = items(); const i = list.indexOf(document.activeElement); if (i < 0) return;
    const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight', prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const rtl = getComputedStyle(container).direction === 'rtl' && orientation === 'horizontal';
    let t = null;
    if (e.key === (rtl ? prev : next)) t = list[wrap ? (i + 1) % list.length : Math.min(i + 1, list.length - 1)];
    else if (e.key === (rtl ? next : prev)) t = list[wrap ? (i - 1 + list.length) % list.length : Math.max(i - 1, 0)];
    else if (e.key === 'Home') t = list[0];
    else if (e.key === 'End') t = list[list.length - 1];
    if (t) { e.preventDefault(); set(t); }
  });
  const start = items().find((i) => i.getAttribute('aria-selected') === 'true' || i.getAttribute('aria-checked') === 'true') || items()[0];
  items().forEach((i) => i.tabIndex = i === start ? 0 : -1);
}
```

## Key maps

Notation: **Tab** moves to the next tab stop; "arrow" means roving. All maps assume the item is focused.

### Button, link, checkbox, switch

| Widget | Keys | Markup |
|---|---|---|
| Button | Enter, Space activate (Space on keyup) | `<button type="button">`; toggle: add `aria-pressed="true/false"`; never change the label and pressed together |
| Link | Enter | `<a href>`; `aria-current="page"` for the current one |
| Checkbox | Space toggles | `<input type="checkbox">`; mixed: `indeterminate = true` in JS |
| Switch | Space toggles (Enter optional) | `<button role="switch" aria-checked="false">Label</button>` or `<input type="checkbox" role="switch">`. Label stays the same ("Email alerts"), state is `aria-checked`. |

### Radio group

`<fieldset><legend>Plan</legend><input type="radio" name="plan">…`. Tab enters on the checked radio (or first); arrows move **and select**; Space selects the focused one. Custom: `role="radiogroup"` with `aria-labelledby`, items `role="radio" aria-checked`, roving tabindex.

### Menu button and menu (actions only, never site navigation)

| Key | Result |
|---|---|
| Enter, Space, ArrowDown on the button | Open, focus first item |
| ArrowUp on the button | Open, focus last item |
| ArrowDown, ArrowUp in menu | Next, previous item (wrap) |
| Home, End | First, last |
| Letter | Next item starting with it |
| Enter, Space on item | Run it, close, focus returns to button |
| Escape | Close, focus returns to button |
| Tab | Close, move on |
| ArrowRight, ArrowLeft | Open, close a submenu (menubar: next, previous top item) |

```html
<button id="m-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="m">Actions</button>
<ul id="m" role="menu" aria-labelledby="m-btn" hidden>
  <li role="menuitem" tabindex="-1">Rename</li>
  <li role="menuitem" tabindex="-1">Duplicate</li>
  <li role="separator"></li>
  <li role="menuitemcheckbox" aria-checked="true" tabindex="-1">Show hidden</li>
</ul>
```
Site navigation is **not** a menu: use `<nav><ul><li><a>` and, for submenus, a disclosure button (`aria-expanded`) that reveals more links. `role="menu"` makes a screen reader switch to forms-style reading and breaks link browsing.

### Menubar (desktop-app style only)

`role="menubar"` of `role="menuitem"`; one tab stop; ArrowLeft/Right between top items; ArrowDown opens the submenu and focuses its first item; Escape closes submenu and returns to the top item; Home/End.

### Listbox (native `<select>` first)

`role="listbox"` (name required, `aria-multiselectable` for multi) with `role="option" aria-selected`. Single select: arrows move focus and select (selection follows focus); Home/End; type-ahead; multi: Space toggles, Shift+Arrow extends, Ctrl+A all. One tab stop (roving or activedescendant).

### Combobox with listbox popup (autocomplete)

```html
<label for="city">City</label>
<input id="city" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="city-list" aria-activedescendant="" autocomplete="off">
<ul id="city-list" role="listbox" hidden>
  <li role="option" id="o1">Berlin</li>
</ul>
<div role="status" class="sr-only" id="city-count"></div>
```

| Key (focus stays in the input) | Result |
|---|---|
| Typing | Filter; open popup; set `aria-expanded="true"`; announce count in the status region ("5 suggestions") |
| ArrowDown | Open if closed; move highlight (`aria-activedescendant` = option id; `aria-selected="true"` on it) |
| ArrowUp | Previous; from first, back to the input text |
| Enter | Accept highlighted option, close; with nothing highlighted, submit the form |
| Escape | Close popup; second Escape clears the text |
| Alt+ArrowDown | Open without moving highlight |
| Tab | Accept nothing (or accept if `aria-autocomplete="both"`), move on |
| Home, End | Move caret in the text (they belong to the input) |

`aria-autocomplete`: `list` when suggestions match typed text, `both` when the input is also completed inline, `none` for static options.

### Tabs

| Key | Result |
|---|---|
| Tab | Into the tablist (on the selected tab); next Tab goes to the panel |
| ArrowRight/ArrowLeft (ArrowDown/Up if `aria-orientation="vertical"`) | Previous/next tab (wrap) |
| Home, End | First, last |
| Space, Enter | Activate (only when activation is manual) |

```html
<div role="tablist" aria-label="Billing">
  <button role="tab" id="t1" aria-selected="true" aria-controls="p1">Plan</button>
  <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Invoices</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>…</div>
```
Select on focus only when the panel is already in the DOM and shows instantly. If the panel loads data, use manual activation. `tabindex="0"` on a panel only when it has no focusable child. Tabs switch content on the same page; if each goes to a URL, they are links in a `nav`.

### Slider (native `<input type="range">` first)

Custom: `role="slider"`, `aria-valuenow/min/max`, `aria-valuetext` when the number is not meaningful ("Tuesday", "$40"), `aria-orientation` only if vertical, named by label. Keys: Right/Up +1 step; Left/Down -1 step; PageUp/PageDown +/-10 steps; Home min; End max. A two-thumb range is two sliders, each with its own name ("Minimum price", "Maximum price"). Always offer a typed number field too (2.5.7).

### Dialog and alert dialog

| Key | Result |
|---|---|
| Tab, Shift+Tab | Cycle inside the dialog only |
| Escape | Close (alert dialogs: Escape = the safe choice) |

```html
<dialog id="d" aria-labelledby="d-h" aria-describedby="d-p">
  <h2 id="d-h">Delete project?</h2>
  <p id="d-p">This removes 14 files. You cannot undo it.</p>
  <form method="dialog"><button value="cancel" autofocus>Keep project</button><button value="delete">Delete project</button></form>
</dialog>
```
```js
opener.addEventListener('click', () => d.showModal());
d.addEventListener('close', () => opener.focus());   // native restores too; this covers removed DOM
```
`<dialog>` gives inert page, Tab containment, Escape and `aria-modal` for free. Alert dialog: `role="alertdialog"` on the dialog, description is required (`aria-describedby`), focus the safe action. Never put `tabindex` on `<dialog>`. Always include a visible Close or Cancel. Non-modal panel: `dialog.show()` or `[popover]`; no trap, Escape still closes, focus goes back on close.

Own implementation, minimum: `inert` on all siblings of the dialog (or the app root), `role="dialog" aria-modal="true"`, a name, focus the chosen element on open, Escape handler, restore focus, `overscroll-behavior: contain` on the panel, `body { overflow: hidden }` while open.

### Disclosure and accordion

Disclosure: `<details><summary>Question</summary>Answer</details>` (Enter/Space toggles; styled with CSS; use `name="group"` for exclusive accordions). Custom: `<button aria-expanded="false" aria-controls="x">` + `<div id="x" hidden>`. Accordion: headings wrap the buttons (`<h3><button aria-expanded>`); optional keys: ArrowDown/Up between headers, Home/End. Do not use `role="region"` on more than 6 panels (landmark noise).

### Tree (file tree, nested nav)

`role="tree"` > `role="treeitem"` (`aria-expanded` on parents, `aria-level`, `aria-selected`) with children in `role="group"`. One tab stop (roving). Keys: ArrowDown/Up next/prev visible; ArrowRight on closed parent opens, on open parent moves to first child; ArrowLeft on open parent closes, on child moves to parent; Home/End; Enter activates; `*` opens all siblings; type-ahead. Use a tree only for real hierarchies; a nested list of links is simpler.

### Data table, sortable, and grid

Static data: native `<table>` with `caption`, `th scope="col|row"`; no ARIA. Sortable column:

```html
<th scope="col" aria-sort="ascending"><button type="button">Name <svg aria-hidden="true">…</svg></button></th>
```
Only the sorted column carries `aria-sort` (`ascending|descending`); others omit it. After sorting, announce through a status region ("Sorted by Name, ascending"); focus stays on the button. Interactive spreadsheet-like data: `role="grid"` with one tab stop; arrows move cell to cell; Home/End row start/end; Ctrl+Home/End first/last cell; PageUp/PageDown; Enter edits; Escape cancels the edit. Do not use `role="grid"` for a plain table with buttons in it.

### Toolbar

`role="toolbar"` with `aria-label`; one tab stop; ArrowLeft/Right between controls; Home/End; do not put text inputs inside (arrows belong to them). Use only when there are 3 or more related controls.

### Carousel

```html
<section aria-roledescription="carousel" aria-label="Featured">
  <button type="button" aria-pressed="false">Pause</button>
  <div aria-live="off" id="slides"> <div role="group" aria-roledescription="slide" aria-label="1 of 4">…</div> </div>
  <button type="button" aria-label="Previous slide">‹</button><button type="button" aria-label="Next slide">›</button>
</section>
```
Rules: autoplay off by default or stops on hover, focus and when reduced motion is set; a visible Pause/Play button first in the DOM; `aria-live="off"` while rotating, `polite` once the user drives it; the previous/next buttons are real buttons; hidden slides are `inert` or `hidden`, not just off-screen; a slide never contains the only way to reach important content.

### Toast

A `role="status"` region that already exists in the DOM; insert the message into it. Do not move focus. Minimum 6 seconds plus 1 second per 10 words, pause on hover and focus, closable by keyboard, never the only copy of important information. A toast with an action (Undo) stays until dismissed. Errors that need action are not toasts; show them inline.

```html
<div id="toasts" role="status" aria-live="polite" aria-atomic="true"></div>
```

### Tooltip

Tooltip = short, non-interactive, supplementary text. `role="tooltip"` on the bubble, `aria-describedby` on the trigger (not `aria-labelledby`: the trigger already needs its own name). Opens on hover **and** focus, closes on Escape (without moving focus), stays open while the pointer is over the bubble (1.4.13), delay 400ms in, 0 out. Touch: no tooltip, put the text on screen. Never put links or buttons in a tooltip; use a popover/dialog instead.

### Popover (native)

`<button popovertarget="p">` + `<div id="p" popover>`. Light dismiss and Escape are built in; focus returns to the invoker; `aria-expanded` is implied. Use `popover="manual"` for toasts you control; for menus still add the key map above.

### Date picker

Prefer `<input type="date">` on mobile and in internal tools; the text field with a format hint ("DD / MM / YYYY") is the most reliable pattern for desktop. A calendar popup is a dialog (`role="dialog"` named "Choose date") containing a `role="grid"` of day buttons:

| Key | Result |
|---|---|
| Arrow keys | Day +/-1, week +/-1 |
| Home, End | Start, end of week |
| PageUp, PageDown | Previous, next month (Shift: year) |
| Enter, Space | Pick the date, close, focus back on the input, announce "Selected 14 November 2026" |
| Escape | Close without picking |

Always allow typing the date; never make the calendar the only input. Each day button has a full name (`aria-label="Saturday 14 November 2026"`), the selected one `aria-pressed` or `aria-selected`, today marked with text not only colour, and unavailable days are `aria-disabled="true"` with the reason available.

## Verify a widget

1. Unplug the mouse. Reach it with Tab only; do every keystroke in its table.
2. Check the ring is visible at every position.
3. Open the Accessibility tree in browser DevTools: role, name, state are right and update when state changes.
4. Run NVDA or VoiceOver once: the name, role, state and position ("2 of 5") are announced.
5. `node scripts/a11y-probe.mjs` opens every `aria-haspopup`/`aria-expanded` trigger, checks focus moved in, Escape closes and focus returned.
