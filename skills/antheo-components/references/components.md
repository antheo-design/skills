# Components: anatomy, states, keyboard, markup

Sizes and colours follow `look.md`, depth and corners antheo-surface; the values here are the same ones. "Keys" lists what the keyboard must do; the browser does it for you when you use the native element.

---

## Actions

### Button
- **Variants:** primary (ink fill, one per surface), secondary (raised: white with the ring and 1px drop), ghost (no fill, for toolbars), danger (danger text; red fill only in its final confirm), link (inline).
- **Sizes:** 28 / 36 / 44px tall; padding-inline 10 / 14 / 18px on both sides; label 13px 500, −0.01em.
- **Icon + label:** icon 16px (20px beside 16px text), 6px gap, exactly 2px less padding on the icon side.
- **Icon-only:** square (same height), `aria-label`, tooltip with the same words.
- **Loading:** keep the width (set `min-width` before swapping), spinner replaces the icon or sits before the label, `aria-busy="true"`, ignore further clicks.
- **Don't disable a form's submit button** because fields are empty or invalid; keep it pressable and explain what is missing on submit.
- **Markup:** `<button type="button">` (or `type="submit"` in forms). A link that looks like a button stays an `<a href>`.
- **Keys:** Enter and Space.

### Button group / segmented control
- Joined buttons for 2 to 5 mutually exclusive options that apply instantly (view: list/grid; range: 7d/30d/90d).
- A well track with 2px padding, fully round; the chosen segment raised (white, ring and drop). Equal-width segments, the same padding both sides of every label. A raised pill gliding between options is a good place for a short spring.
- **A segment holds a label and nothing else.** A saving or a count goes beside the control or under it as text ("Yearly saves 2 months"), never inside a segment.

The style block has it as `.seg`: `<div class="seg" role="radiogroup" aria-label="Billing period">` holding
`<button role="radio" aria-checked="true">` items; arrow keys move the choice.

- In Windows high-contrast mode backgrounds vanish: give the chosen segment `forced-colors` Highlight and keep `aria-checked`.
- **Markup:** `role="radiogroup"` with `role="radio"` + `aria-checked`, or real radio inputs styled. **Keys:** arrows move and select.

### Link
- In text: the text colour (or the project's link colour), underlined (`text-underline-offset: 0.2em; text-decoration-thickness: 1px`), thicker underline on hover.
- Standalone ("View all →"): no underline needed if it's clearly a link by position and color; underline on hover.
- Text says where it goes ("View all orders"), never "click here". External links: `↗` icon + "(opens in new tab)" for screen readers if `target="_blank"`.

## Inputs

### Text field
- **Anatomy:** label (above, 13px 500, 6px gap) → optional hint (12px text-2) → field → error or helper message (6px below).
- A well: the block's `.field` (`--h-control`, padding-inline `--s-3`, `--r-control`, no border, `--well` with `--well-edge`); 16px text on touch screens (`--t-field`), so a phone never zooms in on focus.
- **States:** hover (the well one step deeper), focus-visible (the well deepens again plus the 2px focus ring), filled, disabled (text-2, no hover), read-only (no well, reads as text), error (a 1px danger ring + a message with an icon), success (only where it helps, e.g. "Username available").
- **Markup:** `<label for="work-email">Work email</label>` then `<input id="work-email" type="email" autocomplete="work email" aria-describedby="work-email-hint work-email-error">`. Error message: `id="work-email-error"`, and `aria-invalid="true"` on the input.
- Optional fields say "(optional)" in the label. Required ones don't need asterisks if most fields are required.
- **Validation timing:** on blur, not while typing; once a field shows an error, re-check on every keystroke and clear it the moment it's fixed. Fixed-length fields (code, card) check when full.

### Textarea
- Same as text field; min 3 rows; `field-sizing: content` to grow (with `max-height` and scroll); show a character count only near the limit ("12 characters left").

### Select / combobox
- ≤ 7 options and no search needed → native `<select>` (styled border and chevron). 2 to 3 options → radios or a segmented control instead.
- Many options or search → combobox: input with `role="combobox"`, `aria-expanded`, `aria-controls` → listbox `role="listbox"` with `role="option"` + `aria-selected`.
- **Keys:** ↓/↑ move, Enter selects, Esc closes (then clears on second Esc), Home/End, typing filters. Focus stays in the input; `aria-activedescendant` points to the highlighted option.
- Show "No matches for 'xyz'" inside the list. Highlighted option: the hover fill, in place; selected: a check icon.

### Checkbox, radio, switch
- Checkbox: independent yes/no choices, or a list where many can be chosen; submit-to-apply.
- Radio: one of 2 to 6 choices; always one selected by default when there's a sensible default.
- Switch: an instant on/off setting (applies immediately). The label describes the ON state.
- Box 16px, 4px corners; the whole label is clickable; 8px between label and control; focus ring around the box.
- Switch: a track `--sw-w` × `--sw-h` (32×20; 44×26 on a phone), a white knob `--sw-knob` with a 2px inset; on fills the track with the brand colour (`--accent`), off is a grey that still passes 3:1 against its surface. It takes effect at once; a setting that needs Save is a checkbox.
- Indeterminate checkbox for "some selected" in a table header.
- **Keys:** Space toggles; arrows move between radios.

### Slider
- For approximate values (volume, size). Always show the value; offer a number field when exactness matters.
- A well track 4px, a raised thumb 16px with a 36 to 44px hit area, the filled part in ink.
- `role="slider"` + `aria-valuenow/min/max/valuetext` (native `<input type="range">` does this). **Keys:** arrows step, PageUp/PageDown jump, Home/End.

### Date picker
- Typing a date must always work (`<input type="date">` or a text field with format hint "DD/MM/YYYY"). The calendar popover is a helper.
- Calendar grid: `role="grid"`; arrows move by day/week, PageUp/PageDown by month; today outlined; selected filled with ink; disabled dates struck/dimmed with a reason.

### File upload / dropzone
- A visible button ("Choose files") inside a drop area; drag-and-drop is a bonus, never the only way.
- Say accepted types and size up front ("PNG or JPG, up to 10 MB"). Show each file as a row: name, size, progress, remove. Refusals are explained in the zone itself ("report.pdf isn't an image").

### Search
- `<search>` landmark or `role="search"`; input with a search icon, clear (×) button when filled, "/" shortcut on desktop sites (shown as a `kbd` hint).
- Results update after ~250ms debounce; announce the count in a polite live region ("12 results").

## Overlays

### Dialog (modal)
- For decisions that need full attention or short focused tasks. Not for things that could be inline.
- Width 360 to 480px for a decision, up to 640px for a task (a bottom sheet on phones); padding 20px; 20px corners; the dialog edge, drop and backdrop from antheo-surface.
- **Anatomy:** the panel head (a `.t-title` title, a `--t-body` `--text-2` description, a `--h-small` close button) → body → footer with quiet then primary sharing the width (on phones stacked, primary on top).
- **Markup:** `<dialog aria-labelledby="t">` opened with `showModal()`. Focus goes to the first field (or the least destructive button); Tab is trapped; Esc closes; focus returns to the trigger.
- Close button (×) top-right with `aria-label="Close"`.

### Confirmation of a destructive action
- Title names the thing: "Delete 'Q3 plan'?" Body says what is lost and whether it can be undone. Buttons: "Cancel" (secondary, focused by default) and "Delete plan" (danger). For very destructive actions, type the name to confirm.
- **Prefer Undo over confirming** for reversible actions (archive, remove from list): do it, then show a toast with Undo for 6 to 8 seconds.

### Drawer / sheet
- A drawer slides from the edge it belongs to: right for details and filters on desktop, bottom on phones. Use instead of a dialog when people need to see the page behind it, or the content is long.
- Width 24 to 32rem (desktop); bottom sheet with a drag handle and snap points on phones; always a close button and Esc.

### Popover, dropdown menu
- Grows from its trigger (`transform-origin` at the trigger side) in 150ms and leaves in 120ms; the menu edge and drop from antheo-surface; 12px corners, 4px from the edge to the items (3px padding plus the 1px transparent border), items 32px tall with 8px corners.
- Menu items: icon (optional) + label + shortcut (at the end, text-2). Groups are set apart by 4px of space, or a 12px text-2 label; no lines. The highlight fills the item in place. Destructive item last, in danger text.
- **Markup:** `<button aria-haspopup="menu" aria-expanded>` + `role="menu"` + `role="menuitem"`; or the `popover` attribute for non-menu popovers.
- **Keys:** Enter/Space/↓ opens and focuses the first item; ↑/↓ move; Home/End; typing jumps to an item; Esc closes and returns focus; Tab closes.

### Tooltip
- A short label for icon-only controls or truncated text. Never the only place important info lives; never interactive content inside.
- Appears 400ms after hover, at once if another closed within the last 300ms, and on keyboard focus; the pointer can move onto it without it closing (WCAG 1.4.13); disappears on leave, blur and Esc. `role="tooltip"`, referenced by `aria-describedby` (or it *is* the `aria-label`).

### Toast
- Brief news about something that happened ("Invoice sent"), optional single action ("Undo", "View"). Bottom-right (desktop) or bottom-center (phones), max 3 stacked.
- `role="status"` (polite). Errors that need action are **not** toasts; show them inline.
- A status toast stays at least 6s (1s more per 10 words) and pauses on hover and focus; one with an action (Undo) or an error stays until dismissed, and is never the only place an error is said. A close button always.

### Command palette
- ⌘K / Ctrl+K. Input at top, grouped results, recent items first, shortcut hints at the end. It's used all day, so it is ready to type into at once: a short grow from its trigger (under 200ms) at most, and from the keyboard it simply appears. Same keyboard model as a combobox.

## Navigation

### Top bar / sidebar
- Show **where you are**: the current item gets the selected fill **and** `aria-current="page"`, plus `--w-strong` or an indicator bar.
- Sidebar 240 to 280px, collapsible to 64px icons with tooltips; group items under small headings; account and settings at the bottom.
- Phones: ≤ 5 primary destinations in a bottom bar (icon + short label, 56px + safe area), the rest in a menu.

### Tabs
- For 2 to 6 views of the same thing. Not for steps (use a stepper) or navigation between pages (use links).
- Selected tab: text colour + a 2px ink indicator that slides between tabs; unselected tabs in text-2.
- **Markup:** `role="tablist"` / `role="tab"` (`aria-selected`, `aria-controls`) / `role="tabpanel"`. **Keys:** ←/→ move and select, Home/End.

### Breadcrumbs
- `<nav aria-label="Breadcrumb">` with an ordered list; the last item is the current page (`aria-current="page"`, not a link); separators are decorative (`aria-hidden`).

### Pagination
- "Showing 51 to 100 of 1,284" + Previous / Next + a few page numbers; current page `aria-current="page"`. Or "Load 50 more" that says how many remain. Infinite scroll only for feeds, with the footer still reachable.

### Stepper
- For 3 to 6 sequential steps: number + label per step, done steps with a check, current step bold. People can go back to finished steps.

## Data display

### Table
- Numbers, density, sorting and the phone version: **antheo-data**. The short form:
- Header row sticky, 36px, `--t-meta` at `--w-strong` in `--text-2`; rows `--h-row`, a `--line` hairline between rows (the one place lines belong), no vertical lines, no zebra; text at the start, numbers at the end with tabular figures; the first column is the name and may be a link.
- Sortable headers are buttons with `aria-sort`; selection checkboxes in the first column; row actions at the end (visible on hover **and** focus, always visible on touch).
- Phones: becomes a list of rows showing the 2 to 3 key fields, or scrolls inside a labeled region with the first column sticky.

### List
- The list row in `look.md`: a 28 to 32px avatar or tile → name (13/500) over one fact (12px text-2) → trailing value. No dividers; space and a hover fill in place group the rows.

### Card
- See antheo-layout `references/cards.md`.

### Badge / status
- Prefer a word or a dot in the status ink. When it must be a pill: the status tint fill with its own text colour, 12px 500, 20px tall, 8px padding both sides; flat and smaller than the controls beside it, so nobody tries to press it. Always words ("Paid", "Failed"), never colour alone. One badge per row at most.

### Avatar
- Circle, sizes 24 / 32 / 40 / 64; image with `alt` = person's name (or `alt=""` when the name is right next to it); fallback initials on a tint picked from the name (stable per person); a group overlaps by 25% with a 2px ring in the background color and "+3" at the end.

### Empty state, skeleton, progress
- See `states.md`. Progress bar for known durations (with %), spinner for unknown short waits, skeleton for content.

### Stat / KPI
- Label → value (tabular, 3xl) → change (arrow + sign + period). See antheo-data `references/charts.md`.

### Accordion / disclosure
- `<details><summary>` (keyboard and screen readers for free). Summary row ≥ 44px, chevron that rotates 90° or 180° on open. Allow several open unless there's a reason not to.

### Code / kbd
- Code blocks: mono 12px in a well, a copy button at the top end whose icon turns to a tick for 2s. Inline `kbd`: 11px, raised (ring and drop), 4px corners, 4px padding.
