# Parity: when one component replaces another

Part of antheo-system. Open it at migration step 3, after the behaviour contract is written
(`references/design-folder.md`) and before the first call site is moved. The contract says what the old component
does. This audit proves the new one does the same at every place it is used, and that a form still sends what it
sent.

## 1. Count the call sites, and take the hardest first

Search for every import and every use of the old component, and write the count in the contract. Then rank them. A
call site is hard when it has any of these:

- the most props, or a spread (`{...rest}`) whose contents you cannot see at the call site
- a `ref`, a `className` or a `style` passed in from outside
- a place inside a form, a dialog, a menu or a table cell
- children passed as a function, or a slot filled with another component
- a test that finds it by role, text or test id

Move the two or three hardest first. If the new component cannot serve them, you find out before forty easy ones
have moved. Easy call sites prove nothing about the hard ones.

## 2. The audit

One row per check, each marked same, different (fixed or absorbed by the wrapper) or decision (raised with the
person). Nothing is left blank.

| Check | Same means | How to prove it |
|---|---|---|
| Props | every prop any call site passes has a home in the new one: kept, renamed by the wrapper, or dropped by decision with the count of places it was used | list the distinct props from the call sites, and tick each against the new component's props |
| Defaults | a prop left out gives the same result as before | compare each default in the two files; a different default changes every call site that omits it |
| Variants and sizes | every variant, size and combination in use still exists and looks the same | render old and new side by side on one page (antheo-stress `references/harness.md`), then `pixdiff.mjs` |
| States | hover, focus, pressed, disabled, loading, invalid, selected, open | the same page, one cell per state |
| Accessible names and roles | each control says the same thing to a screen reader | `controls.txt` before and after is identical (`references/baseline.md`) |
| Keyboard | the same keys do the same things: Enter, Space, Escape, arrows, Home, End, typing to find | press each key on the old one and write what happens; repeat on the new one |
| Focus | Tab order unchanged; focus lands in the same place on open and returns to the same place on close; the ring shows | the order in `controls.txt`; open and close by keyboard and note `document.activeElement` each time |
| Visible strings | every word the component brings itself: placeholder, "Close", "Loading", the empty text, error text, `aria-label`, `title` | list the string literals in the old file; each is in the new one or passed by the wrapper |
| Events | the same callbacks, with the same arguments, the same number of times | log each callback in one hard call site: on every key or on blur, on mount or not, a string or a number, `null` or `""` for empty |
| What others hold on to | `id`, `name`, `data-testid`, the element a `ref` points at, `className` passed through | the tests that find it still pass unchanged; search the codebase for each id and test id |
| Form behaviour | a button's `type`, Enter submitting the form, a disabled field left out of the submit, autofill and `autocomplete` | submit by Enter and by click on old and new; see section 3 |

Three that are missed most: a button that was a native submit and is now `type="button"`, so Enter no longer
sends the form; a default that changed, so call sites that passed nothing look different; a `ref` that pointed at
the input and now points at a wrapper.

## 3. Forms and anything that writes: the request is the same

A screen that looks identical and sends a different request is a broken screen that passes every screenshot.
For each action that writes (save, create, delete, upload, search with filters), on a development or test backend,
never on real data:

1. **Fix the input.** Write down one set of values that covers the formats: a date, a time near midnight, a
   decimal amount with a thousands separator (`1,234.50`), a negative, a zero, an optional field left empty, text
   with spaces at both ends, a long value, a checkbox off, a multi-select with none and with two, a file if the
   form takes one.
2. **Capture before.** On the old screen, with the values from step 1:

   ```
   node <this-skill>/scripts/requests.mjs capture <url> --fill "#amount=1,234.50" --fill "#due=2026-11-17" \
     --press "button[type=submit]" --out design/baseline/<screen>/request-<action>.json
   ```

   It fills and presses in the order given and writes each request the screen tries to send: method, path, query,
   content type, and the body with its keys sorted. Nothing is sent. Every write is held back in the browser.
   By hand, when the script cannot drive the screen (a sign-in it cannot pass, a file picker): enter the values
   and submit. In DevTools, Network, select the request and copy it (method, URL with query, content type, body).
   Sort the body's keys so order alone does not show as a change. In a test suite, a mocked endpoint that records
   the body does the same.
3. **Capture after.** The same command on the migrated screen, with the same `--fill` and `--press` in the same
   order, written to `design/after/…`.
4. **Compare.**

   ```
   node <this-skill>/scripts/requests.mjs diff <before> <after>
   ```

   It exits 0 when the two are the same and 1 when anything differs, and names each difference field by field:
   `body.amount: 12 (a number) before, "12" (a string) after`. For captures made by hand,
   `git diff --no-index --exit-code <before> <after>` does the same job. Any line that differs is a change in
   what the server receives: fix it, or raise it. It is never "close enough".

What drifts when a field component changes:

| In the request | Before and after can differ as |
|---|---|
| Dates | `2026-11-17`, `2026-11-17T00:00:00.000Z`, `17/11/2026`; a local midnight sent as UTC lands on the day before |
| Numbers | `"48.20"` (a string) or `48.2` (a number); `1,234` read as `1`; a decimal comma in another locale |
| Empty | `""`, `null`, or the key left out |
| Booleans | `"on"`, `"true"`, `true`; an unchecked native checkbox sends nothing at all |
| Lists | `tag=a&tag=b`, `tag[]=a`, `["a","b"]`, `"a,b"` |
| Text | trimmed or not; line endings; a maximum length that now cuts |
| Field names | taken from the `name` attribute, which the new component may not pass on |
| Encoding | form-encoded, JSON or multipart |
| How many | one request or two (a button no longer disabled while it sends); an autosave on every key |

Also check the way back: open a saved record and save it without touching anything. The request must carry the
values that were loaded, unchanged. A date that moves a day on each save is found this way.

## 4. Record it

In the contract file, under the table: the number of call sites, the hard ones moved first by name, each audit row
with its result, and the request diffs by path. "Parity: 14 of 14 call sites; hardest first: InvoiceForm,
MemberTable, FilterBar; 2 differences absorbed by the wrapper; request diff empty for save and delete."

## Done

- [ ] Call sites counted and ranked; the two or three hardest moved first
- [ ] Every audit row marked same, different or decision; none blank
- [ ] `controls.txt` identical before and after; keys and focus tried by hand on old and new
- [ ] For each writing action: one fixed input, the request captured before and after, the diff empty or raised
- [ ] Open and save with no edits sends the loaded values unchanged
- [ ] The result written in the contract file
