# Objects: when the component is a thing

Most components are **parts**: a field, a menu, a filter, a table, tabs. They wear the style block and stay quiet. A
few are **objects**: the component stands for a physical thing people already know, and the thing itself is what
they use. A bank card in a wallet, a radio dial, a thermostat, a knob, a record player, a ticket, a game cartridge, a
light switch, a camera shutter, a cassette, a key fob. An object drawn as a grey box with a label is the most common
reason a creative component looks unfinished: it is correct, and nobody wants to touch it.

## Part or object?

Ask two questions. Does it stand for a real thing people could pick up? Is that thing the control (you turn it,
flip it, slide it, tilt it, press it)? Two yeses: an object. One: a part with a little character (a weather card is a
part that shows a sky; a tuner is an object you turn).

The boundary is the object's own edge. Inside it: material, light, print, texture and its own colours. Outside it:
labels, buttons, lists, helper text and the page stay parts, in the block and the Quiet rules. A wallet stack is
objects (the cards) inside parts (the list, the Done button). Mark the object's root `data-object` so the page check
knows its texture is the job, not a costume.

Never let the object leak: no card-stock texture on the page behind it, no brushed metal on the buttons beside it,
no "retro" type in the labels. Costume is the subject spread over the chrome; an object is the subject, drawn once,
well.

## The bar

1. **Recognised without a label,** at thumbnail size, from shape, material and light alone. Squint: a card still reads
   as a card, a knob as a knob.
2. **Someone would screenshot it.** Put it next to a photo of the real thing: it doesn't have to be photographic, but
   it must be as considered.
3. **It feels like the thing when used.** A knob has detents and inertia; a card tilts and its foil catches the light;
   a switch snaps; a dial settles. The motion carries as much of the object as the drawing.

## Start from the real thing

Before any code, look at the real object (a photo the person gives, or a search) and write down:

| Note | Example: a bank card |
|---|---|
| True proportions | 85.6 × 53.98 mm, so `aspect-ratio: 1.586`, corners about 3.2% of the width |
| The materials, each part | matte PVC body, a gold contact chip, embossed or printed digits, a glossy hologram |
| Where the light falls | a soft sheen across the top third; the chip catches a bright line |
| The three details that make it read | the chip, the brand mark in its corner, the digits in groups of four |
| How it moves when used | slides from a pocket, tilts in the hand, the stack fans |

Three details, drawn well, beat ten drawn roughly. Pick the ones that make the thing recognisable, and leave the
rest out.

## One light, everywhere

Every object on the screen is lit by the same light: above, a little to the left, a little in front. Every layer
obeys it, in this order from the bottom up:

| Layer | What it does | CSS |
|---|---|---|
| Cast shadow | the object's shadow on the ground, offset down and away from the light, soft | a large blurred `box-shadow` or a blurred `::before` under it |
| Contact shadow | the dark line where it touches the ground | a tight shadow, 1 to 2px, darker |
| Body | the material's base colour, a little lighter towards the light | `linear-gradient(170deg, lighter, base 45%, darker)` |
| Edges | a bevel: light on the edges facing the light, shade on the others | `inset 0 1px 0 light, inset 0 -1px 0 shade` |
| Surface | print, grain, brushing, knurling | gradients and masks, at low opacity |
| Highlight | the specular sheen, the brightest thing, on the side facing the light | a soft white gradient with `mix-blend-mode: soft-light` or `screen` |

In dark mode the light stays where it is: the body gets darker, the highlight weaker, and the cast shadow becomes a
faint rim of light on the ground side instead. Check the object on both grounds; an object designed for white often
looks pasted onto dark.

## Its own colours, kept in one place

An object may use colours outside the block (a gold chip, a walnut cabinet, an amber display), but only as its own
custom properties, defined once on its root for light and dark, and never used outside it:

```css
.bank-card {
  --card-body: oklch(0.32 0.04 265);
  --card-sheen: oklch(1 0 0 / 0.22);
  --card-chip: oklch(0.80 0.10 85);
  --card-ink: oklch(0.97 0.01 265);
  aspect-ratio: 1.586; border-radius: 3.2% / 5%;
  color: var(--card-ink);
  background:
    radial-gradient(120% 80% at 20% 0%, var(--card-sheen), transparent 60%),
    linear-gradient(170deg, oklch(from var(--card-body) calc(l + 0.06) c h), var(--card-body) 55%, oklch(from var(--card-body) calc(l - 0.05) c h));
  box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), inset 0 -1px 0 oklch(0 0 0 / 0.25),
    0 1px 2px oklch(0 0 0 / 0.2), 0 12px 28px -8px oklch(0 0 0 / 0.35);
}
@media (prefers-color-scheme: dark) { .bank-card { --card-sheen: oklch(1 0 0 / 0.12); } }
```

Text printed on the object still meets contrast against the object (4.5:1 for words, 3:1 for large digits), measured
at its lightest spot. A name or number that matters is also in the accessible name, not only on the drawing.

## Materials

Each recipe is a starting point. Tune it against the photo, and keep the surface layers faint: texture you notice
first is too strong.

- **Matte plastic.** A gentle body gradient (lightness 4 to 6% across), a soft wide sheen, edges at 10 to 18%
  opacity. No hard highlights.
- **Gloss plastic or enamel.** The same body, plus one sharp highlight: a narrow band of white at 30 to 50% near the
  top edge, `linear-gradient(180deg, transparent 8%, oklch(1 0 0 / 0.4) 9%, transparent 22%)`.
- **Brushed metal.** Fine lines along the brushing on a grey gradient:
  `repeating-linear-gradient(90deg, oklch(1 0 0 / 0.05) 0 1px, transparent 1px 3px)` over the body. For a disc
  (a knob face, a dial), brush in circles with `repeating-radial-gradient(circle, …)` and add a
  `conic-gradient` of light and shade for the sheen that turns.
- **Knurled grip.** The ridges around a knob's edge: `repeating-conic-gradient(shade 0 2deg, light 2deg 4deg)`,
  masked to a ring with `mask: radial-gradient(circle, transparent 78%, black 80%)`. The knob turns, the ridges turn
  with it, the light does not: keep the sheen on a layer that doesn't rotate.
- **Paper and card stock.** An off-white body, a grain at 3 to 5% (an SVG `feTurbulence`, `baseFrequency` 0.8 or
  more), and a slightly soft edge shadow. Print sits on it with `mix-blend-mode: multiply`.
- **Foil and holograms.** A `conic-gradient` of a few hues behind a mask of the foil's shape, with
  `mix-blend-mode: color-dodge` or `overlay`. The gradient's angle follows the pointer or the device's tilt
  (`--tilt-x`, `--tilt-y` set by script), so the colours slide as it moves. Under reduced motion, a still angle.
- **A lit display.** A dark well, digits in the display's colour with a faint glow
  (`text-shadow: 0 0 6px currentColor` at low opacity), the unlit segments at 8 to 12% of the same colour, and a
  very faint glass sheen on top. Tabular figures; nothing that flickers.
- **Rubber and soft-touch.** Low contrast, almost no highlight, a slightly larger contact shadow: it reads as soft.
- **Wood.** Long, uneven lines along the grain at 4 to 8%, two or three tones from one hue; never a photo texture.
- **Embossed text.** Two `text-shadow`s, light on the side facing the light and shade on the other, each 1px:
  `text-shadow: 0 1px 0 oklch(1 0 0 / 0.25), 0 -1px 0 oklch(0 0 0 / 0.3)`.

## Icons and marks on an object

An icon on a button-like object (a candy toggle, a key, a dial's face) fills about **40% of the object's shorter
side** (35 to 50%). Bigger reads cramped and childish; the reference's ratio, measured, wins over this number.
Centre it by its **ink**, not its box: a heart, a play triangle or a bolt has its weight off the box's middle, so
zoom a screenshot to 3× and move it until it sits in the middle to the eye. On and off must differ in more than
colour: a small dot or check under the icon, a lit rim, or the icon's own fill.

## Crisp, not soft

Gloss on candy, gel, enamel or glass-like plastic is a **shape with an edge**: a strip of white at 40 to 60% across
the upper part, or a sharp-edged ellipse, plus a 1 to 2px rim one tint lighter than the fill. A soft radial blur
everywhere reads as out of focus. Keep the blur for shadows and glows; keep the highlights sharp.

## 3D lettering

Type that stands as an object (an extruded headline, a sign) is extruded **letter by letter**, and its side planes
are drawn: the side colour, with the ink line along the edges where a plane turns, not only around the back. Its
depth points one way for every letter. To make it turn, animate the direction of the depth, not the letters, and
swing it as far as the reference does: a timid sway reads as a wobble.

## Depth that moves

An object in a hand moves in three dimensions. Give its root a perspective (`perspective: 900px` on the parent) and
tilt it at most 8 to 12 degrees towards the pointer on hover, with the highlight sliding the opposite way. The
tilt follows the pointer with a short spring, returns on leave, and is off for touch (no hover) and under reduced
motion. A stack (cards, records, tickets) keeps each item's own small offset and rotation (1 to 3 degrees), so it
looks placed, not generated.

## The play is the point

Every object has one thing people do with it just for the pleasure of it: tuning across the static between stations,
squashing a candy button, flicking a card stack, turning a knob past its clicks. Find that thing first and make it
rich, because it is why the component exists. A radio that jumps from station to station is correct; a radio whose
screen fills with static and clears as a station comes in is the one people play with.

The real thing's feedback is part of it: a screen's static or grain while it searches, a needle that wobbles and
settles, a hiss, a click at each detent (sound only after a press, off by default), a light that warms. None of this is
decoration or a costume; it is the object behaving. The app-chrome timing rules (300ms, "the more often, the less it
moves") are for menus and fields, not for the play: it may run as long as the hand keeps going, as long as it answers
at once, can be interrupted, and becomes a short fade under reduced motion.

## How it behaves

The drawing makes people want to touch it; the behaviour makes it feel real. From antheo-motion's gestures and
springs:

| Object | Feels real when |
|---|---|
| A knob or dial | it has detents (a small snap and, on phones, a tick of vibration at each step), turns at a rate that matches the hand, and keeps a little momentum |
| A switch or lever | it resists, then snaps past the middle; it never stops half way |
| A card or ticket | it lifts on press (a larger, softer shadow), tilts with the pointer, slides out of its stack and back |
| A slider with a body (a fader) | the thumb stays under the finger, the track fills behind it, the ends rubber-band |
| A display | values roll rather than swap (antheo-motion recipe 11); the light changes with the state; while it searches it shows it (static, a sweep, "Tuning…") |

Every object is still a control: a name, a role (a knob is a `slider`, a switch is a `switch`, a card in a picker
is a `radio`), keyboard steps, a visible focus ring outside the object's edge, and a plain alternative for anything
done by drag (antheo-access).

## Check it

1. **Beside the reference, zoomed.** Put a screenshot of the object next to the photo it came from, both at 2 to 3×.
   Measure three ratios in each (an icon to its button, the main text to the body, a rim or gap to the whole) and
   match them within 10%. Name what is missing: usually the light, a detail or the proportions.
2. **Squint, and shrink it.** At 25% size, blurred, it still reads as the thing.
3. **Both grounds.** Light and dark, side by side: the light comes from the same place and the object belongs on
   each.
4. **Film it** (antheo-motion `scripts/filmstrip.mjs`): pressing, turning, tilting. Each frame composed; the light
   never jumps.
5. **The page check** with the object's root marked `data-object`: its texture is exempt from the costume checks,
   and its text is still measured.

## What goes wrong

- **The flat stand-in.** A grey rectangle with a label where the thing should be. Draw the thing.
- **Several lights.** One highlight on the top left, a shadow straight down, a sheen from the right. One light.
- **Texture you see first.** Grain or brushing strong enough to notice at a glance; halve it.
- **The object everywhere.** The card's gradient on the page, the knob's metal on the buttons. Keep it inside its
  edge.
- **A drawing that doesn't move like the thing.** A knob that slides, a card that fades. The behaviour is half the
  object.
- **The icon too big, or off centre.** About 40% of the button, centred by its ink.
- **Everything soft.** Highlights with no edge; a rim lost in a blur.
- **The play cut out.** The fun part (the static, the squash, the flick) trimmed to fit an app timing table. Keep it.
- **Fake detail.** Screws, stitching, stickers and scratches added to look rich. Only what the real thing has, and
  only the three details that make it read.
