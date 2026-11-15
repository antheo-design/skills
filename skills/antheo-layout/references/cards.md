# Cards

## Card, list, table or grid?

| The items are… | Use |
|---|---|
| different kinds of content, each a small story (dashboard panels, mixed feed) | **cards** |
| many of the same kind, read one after another (messages, files, people in a team) | **list** |
| compared by their values (prices, stats, statuses) | **table** |
| mostly pictures (gallery, products with photos) | **image grid** with captions |
| 2 to 4 options to choose between (plans, shipping speeds) | **choice cards** (radio cards) |

## Anatomy, top to bottom

1. Media (optional): fixed `aspect-ratio`, `object-fit: cover`, top corners follow the card radius.
2. Eyebrow (optional, only if it carries information: category, status).
3. Title: `.t-title` (15px at `--w-strong`), max 2 lines (`line-clamp`).
4. Body: `--t-body` in `--text-2`, max 3 lines.
5. Meta: date, author, count; `--t-meta` in `--text-2`, one line.
6. Actions: bottom, pushed down with `margin-top: auto`; one primary (or a link), secondary in a "More" menu.

A card is the block's `.card`: `--surface`, padding `--pad-card` (`--s-6` for a plan card), `--r-card`, and `--sh-card` for its edge. Never a visible border, never a coloured edge, never a card inside a card. The one card to notice gets `--sh-lift`, at the same size as its neighbours.

## Card grids

```css
.grid { display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
.card { display: flex; flex-direction: column; }
.card .actions { margin-top: auto; }   /* aligns actions across a row */
```

- Same width in a row; heights may differ; let them, or align the footer with `margin-top: auto`. Never fix heights in px.
- 3 or 4 columns on desktop, 2 on tablets, 1 on phones (the grid above does this by itself).
- In a mixed grid, a featured card spans 2 columns (`grid-column: span 2`); use it for the one thing that matters most.

## Clickable cards, done right

One real link (on the title), stretched over the card. Keeps one tab stop and a sensible name for screen readers.

```html
<article class="card">
  <img src="…" alt="">
  <h3><a href="/bikes/ridgeline" class="card-link">Ridgeline gravel bike</a></h3>
  <p>Steel frame, 40 mm tyres, fits mudguards.</p>
  <button class="card-secondary">Add to basket</button>
</article>
```

```css
.card { position: relative; }
.card-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
.card-secondary { position: relative; z-index: 1; }              /* stays clickable above the stretched link */
.card:focus-within { outline: 2px solid var(--focus); outline-offset: 2px; }
.card-link:focus-visible { outline: none; }                      /* the card shows focus instead */
.card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: var(--sh-lift); opacity: 0; pointer-events: none; transition: opacity var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) { .card:hover::after { opacity: 1; } }
```

Don't nest links. Don't make the whole card a `<button>` that contains other buttons.

## Hover and press

- Hover, only on a card that opens something: raise it by fading in `--sh-lift` drawn on `::after` (`opacity` transition, `--dur-fast`, `--ease-out`), never transition `box-shadow` itself, and never a border that appears.
- No lift, tilt or scale on hover. A static panel has no hover state at all.
- Press: no scale on big cards (it looks like the page wobbles). `--scale-leave` (0.98) is fine on small choice cards.

## Choice cards (radio cards)

```html
<fieldset class="choices"><legend>Shipping</legend>
  <label class="choice"><input type="radio" name="ship" value="std" checked> <span>Standard</span> <small>3 to 5 days · Free</small></label>
  <label class="choice"><input type="radio" name="ship" value="exp"> <span>Express</span> <small>Tomorrow · $9</small></label>
</fieldset>
```

```css
.choice { display: grid; grid-template-columns: auto 1fr; gap: 0 var(--s-3); padding: var(--s-4); border: 1px solid transparent; border-radius: var(--r-control); background: var(--raised); box-shadow: var(--sh-control); cursor: pointer; }
.choice:has(input:checked) { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--accent); }   /* the radio is still visible: colour is never the only sign */
.choice:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
```

## KPI tiles (dashboard cards)

- Label (`--t-body`, `--text-2`) → value (`.t-num`, tabular) → change (`--t-body`: sign and word, in `--success` or `--danger`) → optional sparkline (no axes, 32 to 40px tall).
- A tile only for a number the request names. Never four identical tiles of invented metrics, each with a "▲ 12%".
- Say the comparison period once, in the header ("vs previous 30 days"), not on every tile.
- The most important metric gets 2 columns or a bigger value.
