# The seven directions

**Only for a Brand page the person asked for** (antheo-direction). Never for app screens, components or ordinary
sections. antheo-build's fundamentals hold in every direction: one content edge, matching siblings, a neutral text
face for everything read or pressed, units beside their numbers, nothing covering content. Pick **one** expressive
device for the page (the display face, the colour field or the image). Anything rotated, hand-drawn, stamped or
textured is used only when the person asked for exactly that.

For an expressive page only. Each has its own type, colour, imagery, section vocabulary and motion; mixing two
produces mush. Pick from the nouns, not the mood, and write the reason in one line in the brief.

Pick **one**. Each has its own type, color, imagery, section vocabulary and motion. Mixing two produces mush.

### Editorial
For publishing, food, craft, studios, writing tools, anything with a story.
- **Type:** a serif with character for display (Newsreader, Young Serif, Gloock; Instrument Serif and Fraunces only as
  a real decision, never the reflex, never with tight negative kerning, never italic) at 400;
  a quiet sans for text. Headlines stay in one style: no single italic or colored word (the most common generated
  tell); let the words carry the emphasis.
- **Color:** cream or paper ground, near-black ink, one deep field color (oxblood, ink blue, forest) for one or two
  scenes.
- **Image:** large drawn objects, a pull quote at 32 to 44px, 1px rules, oldstyle figures. No section numbering.
- **Sections:** asymmetric 5/7 splits, the heading in the narrow column; long left-aligned text blocks.
- **Motion:** almost none: fades at 400ms, a headline revealing once.

### Catalogue
For physical goods, hardware, tools, shops that sell objects.
- **Type:** a grotesk (Familjen Grotesk, Schibsted Grotesk, Geist, Hanken Grotesk) plus a mono for specs (JetBrains
  Mono, IBM Plex Mono) at 12 to 13px, uppercase, +0.06em tracking.
- **Color:** flat light-grey or white field, black ink, one signal color (orange, red, yellow) under 5% of the area.
- **Image:** each object drawn large on a flat field, with spec rows beside it. Rigid grid, visible rules, index
  numbers.
- **Sections:** product grid, then one object full width, then a spec table. Almost no marketing prose.
- **Motion:** small and mechanical: a knob turns, a drawer slides, 150 to 200ms.

### Product stage
For software, apps, developer tools: anything whose product is a screen.
- **Type:** a grotesk at display size (500 weight, -0.035em) with the same family for text, or a grotesk plus a mono.
- **Color:** a very light or a very dark ground, one accent used rarely, product UI in its real colors.
- **Image:** **the product itself**, built in HTML at 1.2 to 1.5× scale with real content, cropped by a viewport edge.
  Then crops of single features, each with a short callout beside the detail it names.
- **Sections:** claim headings ("Receipts file themselves", not "Features"); a bento of unequal tiles, each a working
  mini-demo; a changelog-style list.
- **Motion:** the product UI moves as it really would: a row arrives, a cursor clicks, a number ticks. One loop.

### Poster
For events, launches, culture, bold consumer brands.
- **Type:** one loud display face (Bricolage Grotesque at its wide width, Unbounded, Syne, or a condensed grotesk) at
  120 to 200px, words cropped by the edge or spanning the full width; a plain sans for text.
- **Color:** two or three flat, saturated colors as whole fields; no greys in the big areas.
- **Image:** the type is the image.
- **Sections:** few; one colour field for the page.
- **Motion:** one bold entrance, maybe a marquee that pauses on hover and stops for reduced motion.

### Playful object
For consumer apps, kids, games, hobbies.
- **Type:** a rounded or quirky face (Bricolage Grotesque, Nunito, Fredoka) at 600; generous size.
- **Color:** two or three candy colors with dark ink; colored sections rather than white cards.
- **Image:** one illustrated object made in SVG or CSS (a character, a gadget, the thing the app is about) that
  reacts to the pointer or a press.
- **Sections:** rounded fields, big friendly numbers, one interactive toy.
- **Motion:** springs with a little bounce, on the object only.

### Field notes
For local services, outdoors, travel, food made by hand, community projects.
- **Type:** a humanist sans for text; a serif or slab for display; handwritten notes only as drawn SVG, never a
  script font for text.
- **Color:** paper ground, two earthy inks, one bright mark color (like a highlighter or a stamp).
- **Image:** a map or route, a labelled diagram, the thing itself drawn simply.
- **Sections:** a notebook rhythm: dated entries, annotated diagrams, a table that looks hand-ruled.
- **Motion:** quiet; antheo-motion's defaults.

### Quiet utility
For internal tools, finance, settings, admin: work people repeat every day.
- **Type:** one neutral sans (Hanken Grotesk, Figtree, Source Sans 3) in 3 sizes and 3 tones; mono for IDs.
- **Color:** tinted neutrals, one accent in under 3 places per screen, status colors only for status.
- **Image:** none needed. The memorable part is **one detail** (see App screens below).
- **Sections:** hairlines and space instead of cards; label-left/control-right rows.
- **Motion:** state changes under 200ms; nothing that repeats daily animates.

## The one image, made from the subject

No stock photos and no icon rows. Every scene gets **one dominant visual**, taking half its area or more. Build it
from one of these:

| Kind | How | Fits |
|---|---|---|
| **The product, as UI** | Build the real screen in HTML at 1.2 to 1.5× scale, with real content. Crop it by a viewport edge by 10 to 25%. Use a 1px inner border (ink at 8 to 10%), a two-layer shadow, and fade the cropped edge with `mask-image: linear-gradient(...)`. | Product stage, Quiet utility |
| **The object, drawn** | An SVG of the subject's object (a tin, a wheel, a ticket, a mug) from 10 to 30 simple shapes in 2 to 3 palette colors plus ink, at one stroke weight (2px), front-on or isometric but not both. Large; upright. | Catalogue, Editorial, Playful object |
| **A diagram of the mechanism** | What actually happens, drawn: nodes, arrows, labels, 1.5px strokes, two colors plus ink. Explaining beats decorating. | Product stage, Field notes |
| **A pattern from the subject's primitive** | Repeat one unit from the subject's world (route tape stripes, calendar days, a stamp shape, a tread pattern) in 2 to 3 colors as a field or a band. | Poster, Catalogue |
| **Type as image** | One word or number at 18 to 30vw, cropped by the edge, or behind content at 8 to 15% contrast. Once per page. | Poster, Editorial |
| **An Antheo art piece** | When the registry has art whose mood truly matches (`/r/art/scenes.json`, or `pick_scene` in the MCP), use it as the one level-4 visual. Never force one that doesn't fit the subject. | Any, for the hero or a large empty state |


```html
<svg width="0" height="0" aria-hidden="true"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/></filter></svg>
<style>.field { position: relative; isolation: isolate; } .field::after { content: ""; position: absolute; inset: 0; filter: url(#grain); opacity: .06; pointer-events: none; z-index: -1; }</style>
```

### The signature
One thing taken from what the subject **does**, that no other product would have, placed where people will meet it:
for the bike shop, a "what's that noise?" picker that names the likely fault; for a ceramics studio, glaze test tiles
you can flip to see the fired result; for a freight tool, a container that fills as a shipment's paperwork is
completed. It is interactive where possible, and there is **only one**.
