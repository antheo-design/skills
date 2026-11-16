# Behaviour traps

Things that look finished in a screenshot and break the moment someone uses them. Each has an ID, how to spot it,
and the fix. Before you say a component is done, search your code for the "spot it" column.

## Forms and submitting

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| F1 | Submit becomes `disabled` while sending, so focus drops to the page and the keyboard user is lost | `disabled={loading}` on the submit | keep it focusable: `aria-disabled="true"`, ignore repeat presses in the handler, show the spinner in place |
| F2 | Submit disabled until the form is valid, so people can't find out what's missing | `disabled={!isValid}` | always pressable; on press, show each error next to its field and focus the first |
| F3 | Errors shown while someone is still typing their first attempt | validation on `input` before the first blur | validate on blur, then live once a field has shown an error |
| F4 | What was typed is lost after a failed request | the form resets in the error branch | keep every value; only clear on success |
| F5 | Pressing Enter in a field does nothing, or submits a half-filled multi-step form | no `<form>`, or Enter not handled per step | a real `<form>` with a submit button; in steps, Enter means "next" |
| F6 | A number field rejects pasted "1,200" or " 42 " | `parseInt` on raw text | trim, strip the locale's grouping separator, then validate |
| F7 | Date-only values shift a day for people west of UTC | `new Date('2026-11-14')` then shown in local time | keep date-only values as strings or parse as local dates; never through a UTC midnight |

## Layers: menus, popovers, dialogs, toasts

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| L1 | Escape closes every layer at once, or the wrong one, when a menu is open inside a dialog | one global keydown handler | Escape closes the topmost layer only, then stops; the next Escape closes the next |
| L2 | A dialog is rendered conditionally, so it can't animate out and loses its scroll and form state | `{open && <Dialog/>}` | keep it mounted (`<dialog>` with `open`/`close()`, or an exit state) and let it animate out |
| L3 | A layer that is animating out still takes clicks and blocks the button behind it | no `pointer-events: none` during exit | `pointer-events: none` (or `inert`) the moment it starts to leave |
| L4 | A destructive confirm closes on an outside click, so a stray click cancels or (worse) confirms | backdrop click handler on an alert dialog | an alert dialog closes only by its buttons and Escape (Escape = cancel) |
| L5 | A submenu closes when the pointer moves diagonally toward it across the parent's other items | submenu closes on the first `pointerleave` | keep it open while the pointer moves toward it (a short delay or a triangle of intent) |
| L6 | A tooltip carries information found nowhere else, so touch and keyboard users never get it | info only in `title` / a hover tooltip | put essential info in the UI; tooltips repeat or name, and open on focus too |
| L7 | A popover opens off-screen at the edges or on small phones | fixed `top`/`left` | position with flip and shift (CSS anchor positioning with `position-try`, or Floating UI) |
| L8 | Page behind a dialog still scrolls, or jumps when the scrollbar hides | no scroll lock, or `overflow: hidden` alone | lock scroll and keep `scrollbar-gutter: stable` so nothing shifts |
| L9 | A toast disappears while someone is reading or tabbing to its Undo | a fixed timeout | pause on hover and focus; never under 6 seconds; Undo also reachable after (in the item or a history) |

## State order and appearance

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| S1 | Hovering a focused control hides its focus ring | `:hover` rule after `:focus-visible` that resets `outline` or `box-shadow` | order rules default → hover → focus-visible → active → invalid → disabled; hover never touches the ring |
| S2 | An invalid field shows the hover border instead of the error border while hovered | `:hover` overrides `[aria-invalid]` | invalid and focus outrank hover |
| S3 | Disabled controls still react to hover | no `:not(:disabled)` on hover rules | `:hover:not(:disabled, [aria-disabled="true"])` |
| S4 | An open menu's trigger looks like nothing is open | trigger has no `[aria-expanded="true"]` style | the trigger keeps a pressed or selected look while its menu is open |
| S5 | Font weight changes on hover or selection and the row jumps | `font-weight` in `:hover` / selected | change color or underline instead, or reserve the bold width with a hidden copy |
| S6 | A loading button changes width and the layout jumps | label replaced by a spinner alone | keep the width (its rest width as `min-width`); the label becomes the -ing form ("Sending…") with a spinner before it |
| S7 | A selected state shown by color alone | only `background` changes | add a check, weight, underline or icon |
| S8 | A focused control in error loses its focus ring | the `[aria-invalid]` shadow replaces the focus shadow | a combined rule: `[aria-invalid="true"]:focus-visible` draws both |
| S9 | An unanswered radio group looks fully chosen | `:indeterminate` styles also match every radio in a group with none chosen | style the mixed state as `[type="checkbox"]:indeterminate` |
| S10 | Something appears or disappears and moves what is under the pointer: an error cleared on blur pulls the next checkbox up as it is clicked; a hint shown on focus pushes the button down | messages added or removed on `blur` or `focus`; nothing reserves their room | clear errors while typing, not on blur; give lines that come and go a reserved line or animate their height; never re-flow on pointer-down |
| S11 | A state sheet's forced focus copy sits in the tab order, so tabbing to it changes nothing | `.is-focus` on a live, focusable control | make forced-state rows `inert`; they are pictures of a state |

## Lists, tables and data

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| D1 | Row actions only appear on hover, so keyboard and touch users never see them | `opacity: 0` until `:hover` | also show on `:focus-within`; always visible on touch (`@media (hover: none)`) |
| D2 | A whole-row link swallows the buttons inside the row | the row is an `<a>` wrapping buttons | one link on the main cell stretched with a `::after`, buttons above it with `position: relative; z-index: 1` |
| D3 | Sorting by a column sorts "10" before "9" or puts names with accents last | string sort on numbers; `a < b` | `Intl.Collator(locale, { numeric: true })` |
| D4 | Empty, loading and error look the same (a blank area) | one `if (!data)` branch | three branches with their own design (antheo-components `references/states.md`) |
| D5 | Infinite scroll with no way to reach the footer or come back to the same place | appended pages, no URL state | "Load 20 more" button, or keep the position in the URL |
| D6 | Optimistic update that silently reverts on failure | catch block resets state only | revert and say so ("Couldn't save. Your change was undone. Retry") |

## Input and gestures

| ID | Trap | Spot it | Fix |
|---|---|---|---|
| G1 | Something only works by drag, swipe or hover | no button path for the action | a visible button or menu item for every gesture (antheo-access) |
| G2 | A dragged thing trails behind the pointer | a CSS `transition` still on the dragged element | `transition: none` while dragging; move it in `requestAnimationFrame` (antheo-motion `references/gestures.md`) |
| G3 | Double-tap or double-click submits twice | no guard in the handler | ignore while pending (F1) and make the server request idempotent |
| G4 | An action fires on `pointerdown`, so it can't be cancelled by sliding off | `onPointerDown` / `onMouseDown` for actions | fire on `click` (pointer up); `pointerdown` only for drags and press visuals |
| G5 | Keyboard shortcuts fire while typing in a field | global `keydown` without a target check | ignore when focus is in an input, textarea or `contenteditable` |

## Check before you finish

1. Search the component for the "spot it" patterns above.
2. Walk it by keyboard only, then by touch (DevTools device mode), then with a slow network (Slow 4G).
3. Run `check-page.mjs` (antheo-review) and `a11y-probe.mjs` (antheo-access); both catch several of these.
