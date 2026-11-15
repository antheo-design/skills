# Sections of a Brand page

Only for a page the person asked to be expressive (antheo-direction). An app screen or an ordinary section does not
use this file. antheo-build's fundamentals hold on every section here.

Plan the page as **4 to 7 sections**, one sentence each before building. Each has one job.

## What stays the same on every section

- **One content edge.** Every section sits on the same page grid; the header's brand, each heading and each block
  start on it. A centred section centres everything in it, heading and content together; never a left-aligned
  heading above a centred grid.
- **One ground.** Sections share the page background. A second ground is used once at most, where it has a reason
  (the closing section, one large quote), and never alternates down the page.
- **One section gap** from the scale (`--section`), with `--section-dense` only for a strip of small things.
- **One text face** for everything read or pressed.

Variety comes from what a section holds, never from changing its edge, its ground or its padding.

Section vocabulary: hero · one statement · the product shown working · a short list · a comparison or spec table ·
one big number · one real quote · how it works · pricing · questions people really ask · a closing line and button.

## The hero

- A headline, a subline of at most two lines at 18 to 22px, **one** primary button and at most one quiet link.
- Centred, or left-aligned with a real visual beside it: the product, the object, or a working piece. Never a text
  block beside an empty or placeholder half; if there is no real visual, centre the text.
- The headline is one colour and one weight.

## The familiar parts, done well

These patterns are familiar because they work. Build them precisely instead of replacing them.

| Part | Done well |
|---|---|
| Feature list | Three matching cards or a plain list, each a claim and one real detail; no icon in a coloured circle unless the icon adds meaning |
| Key numbers | Real numbers with their units beside them; the most important one larger; no invented deltas |
| Proof | One real quote with a name and role, or none. Never invented |
| Pricing | Two to four plan cards in a row, matching in width, padding and the order of what is inside: name, one line, price with its unit beside it, the button, a checklist. The recommended plan is marked in words and has the only filled button. A full comparison table goes below, not inside the cards |
| Questions | The 3 to 6 questions people really ask, as an accordion or a plain list |
| Closing | One sentence and one button, then a small footer |
| Hover | Changes one meaningful thing; never a lift on every card |

## Finish is most of it

A page with a strong idea and loose spacing reads as generated. After building, look at it at 390px and 1280px in
light and dark, check antheo-build's fundamentals with your eyes, then run antheo-review.
