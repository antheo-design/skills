# Test harness recipes

A component that was only ever seen with its happy-path sample is unreviewed. Build a small harness so every state,
variant and awkward input can be looked at, measured and compared. The harness is a throwaway page (or a route
behind a dev flag); it never ships.

## 1. The state switcher

One page that renders the component in each state, either all at once or one at a time with `?state=`.

States to cover, in this order: **loading, empty, error, partial, long, success, disabled** (plus "default" first).

```html
<!-- harness.html: ?state=loading|empty|error|partial|long|success|disabled|all -->
<script type="module">
  const fixtures = {
    default: { name: 'Priya Raman', email: 'priya@fieldnotes.co', plan: 'Team', amount: 4800 },
    loading: { loading: true },
    empty:   { items: [] },
    error:   { error: "We couldn't load your invoices. Check your connection and try again." },
    partial: { name: 'Priya Raman', email: '', plan: null, amount: null, avatar: 'https://x.invalid/a.png' },
    long:    { name: 'Alexandria Montgomery-Featherstonehaugh III', email: 'alexandria.montgomery.featherstonehaugh@a-very-long-company-name.example.com', plan: 'Enterprise (annual, invoiced)', amount: 1234567 },
    success: { name: 'Priya Raman', email: 'priya@fieldnotes.co', plan: 'Team', amount: 4800, saved: true },
    disabled:{ name: 'Priya Raman', email: 'priya@fieldnotes.co', plan: 'Team', amount: 4800, disabled: true },
  };
  const want = new URLSearchParams(location.search).get('state') ?? 'all';
  const list = want === 'all' ? Object.keys(fixtures) : [want];
  for (const s of list) mount(fixtures[s], { label: s });   // mount() renders the real component, labelled by state
</script>
```

Rules:

- Render the **real component**, never a copy of its markup. If it needs data, pass fixtures through its normal props.
- Fixtures look like product data: real-sounding names, plausible amounts and dates, sentences an editor would write.
  Never "Lorem ipsum", "Test 1", "foo@bar.com".
- In "all" mode, put each state in its own labelled cell at the component's real width. Label with the state name
  only; no chrome that changes the layout.
- A state that cannot be produced from props (a network error, a slow load) is produced by the harness: a fake
  fetch that rejects or waits, selected by the same `?state=`.
- `check-page.mjs <harness>?state=long --stress --shots` and the same for every other state gives one report per state.

## 2. The variant picker on the real page

To compare two or three versions in place, put them on the real page, behind `?variant=`:

```js
const variant = new URLSearchParams(location.search).get('variant') ?? 'a';
// a = current, b = the denser version, c = the version with the summary moved up
```

- The variants differ in structure or hierarchy, not in a color or a pixel; the page and its data are identical.
- Each variant is complete: every state, both themes, phone and wide.
- Compare the same URL with only `?variant=` changed: screenshots at one width, then `scripts/pixdiff.mjs` to see
  exactly which regions differ, and `scripts/latency-probe.mjs` to compare how they feel under the pointer.
- When one wins, delete the picker and the losing variants in the same change.

## 3. Scenario axes from the component's own props

Don't use a generic matrix. Read the component's props and slots, and pick the axes it can actually vary on:

| Axis | What to vary | Look for |
|---|---|---|
| Content length | shortest real value, typical, longest real value, 3x longest, one unbroken word | wrapping, ellipsis with the full value reachable, overflow, a button pushed off the row |
| Shape | the optional parts present or absent: no image, no subtitle, no icon, one action vs three | gaps left behind, misaligned baselines, a collapsed row |
| Quantity | 0, 1, many (50+) for every list, table, tab set, chip row | empty state, singular wording, scroll or pagination, layout jump |
| Container width | the width the component gets in each place it is used: 240, 320, 480, 768, full | breakpoints inside the component (use a container query, not the viewport) |
| State | the seven states above, plus hover, focus, pressed, selected, expanded | one family of states; nothing jumps between them |
| Environment | light and dark, reduced motion, right-to-left, 200% zoom, forced colors, a slow 4x CPU | contrast, mirrored icons and padding, motion that stops, text that reflows |

Name the axes you chose and the ones you skipped (with the reason) in the report. An axis the component cannot vary
on (a fixed-width badge has no container-width axis) is skipped, not forgotten.

## 4. The fixtures list

Keep these ready and push them through every text, number and image slot the component has.

**Names and text**
- A very long name with no break opportunity: `Maximiliana-Alexandrina Featherstonehaugh-Montgomery`
- A very long single word, 60+ characters, in a heading and in a table cell
- Apostrophes and accents: `Siobhán O'Brien-Núñez`, `Zoë D'Souza`, and a curly apostrophe `O’Neil`
- A right-to-left name with a Latin handle: `محمد الفاسي (@mfassi)`
- Emoji in a name: `Sam 🌱🚀`, including a ZWJ sequence `👩🏽‍💻`
- Empty string, a single space, and one character
- A string with markup-like text: `<b>Ana</b> & Co "Ltd"`

**Email addresses**
- A 64-character local part (the SMTP maximum): `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl@example.com`
- A `+` alias: `jo+billing@example.com`, and one with dots `first.last+news.2026@example.co.uk`
- A short one, `a@b.co`, for min-width problems

**Numbers and money**
- A 7-digit amount: `1,234,567.89` (check the column width and the tabular figures)
- A negative amount: `-48.20` (sign, color not the only signal, alignment of the decimal point)
- Zero: `0` and `0.00` (does it show "0" or hide, and is "0 items" worded right?)
- A very small value (`0.004`), and a value that rounds up (`9.995`)
- The same amounts formatted for another locale (`de-DE`, `ar-EG`, `ja-JP`) through `Intl`

**Dates and times**
- Today, yesterday, one year ago, a date in the far future, and a time zone near midnight

**Images**
- A broken image URL: `https://example.invalid/missing.png` (alt text visible, box does not collapse, no broken icon)
- A very wide image, a very tall one, a tiny one, a transparent PNG on a dark surface
- No image at all (the avatar fallback)

**Counts**
- 0, 1, 2, 99, 100, 1000 for any badge or counter (is "99+" handled, is singular right)

For each fixture write one line: held, or what broke. Use `check-page.mjs --stress` for the bulk cases and the
harness for the ones that need to land in a specific slot.
