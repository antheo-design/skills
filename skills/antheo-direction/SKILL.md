---
name: antheo-direction
description: Plans any landing, company or product page (its kind, the material the brief really has, the sections and one of five hero compositions, each a finished page), and gives a landing, campaign or brand page its own identity, only when the person asks for an expressive page ("make it distinctive", "bold", "playful", a campaign or a launch) or praises a reference; a landing page alone is planned here and stays Clean. It also holds the list of tells that make UI look generated or over-designed. Not for ordinary app screens, settings, forms or sections, which stay clean (antheo-build); a component built from an expressive reference, or one the person asks to be bold or playful, may take a direction (its play is antheo-creative's). Use when something looks AI-made or over-decorated, or before designing a brand page.
---

# Antheo Direction

Most screens need no direction at all: the familiar pattern, built precisely, is what people like best
(**antheo-build**). This skill is for the few pages whose job is to be remembered, and only when the person asked
for that. It also owns the list of tells, in both directions: the lazy defaults of generated UI, and the decoration
of UI that is trying too hard.

Values belong elsewhere: colours to **antheo-color**, type to **antheo-type**, sizes to **antheo-components**,
widths to **antheo-layout**. antheo-build's "always" list (the task works, access holds, nothing invented, nothing
broken) holds on every page here. The Quiet preset's numbers do not: a Brand page chooses its own sizes, weights and
colours.

## Clean or Brand

| | For | Identity comes from |
|---|---|---|
| **Clean** (the default) | components, app screens, dashboards, settings, forms, dialogs, pricing and other ordinary sections | real content, exact spacing, good words |
| **Brand** (only when asked) | a campaign or launch page, a landing page the person asked to be expressive, one illustration | one typeface, one colour field, one image, on the same clean structure |

Unsure which: Clean, and offer Brand as a variant.

## Any landing page: plan it first

Clean or Brand, a landing, company or product page is planned before it is styled, with `references/landing.md`:
name the **kind** (software, product, service, place, event), list the **material** the brief really has, choose
four to seven **sections** in the usual order for that kind, and choose one of five **hero compositions** (Split,
Stage, Object, Visit, Statement), each a finished page in `references/pages/`. Every choice is made from the brief and
said in one line; nothing is dealt at random. With no real picture, the hero is a Statement, never a text block beside
an empty half. The h1, one hard fact and the main action fit the first screen at 390px and 1280px. **No photograph
unless the page needs one** (`references/photos.md`): the client's own first; with none, a stand-in from
`scripts/stand-ins.mjs` (open licences, no key) for a detail only, credited, never the main picture; else nothing.

A Brand page still loads fast, because its headline and its image are the first thing anyone waits for: one display
font file, subset and preloaded; the hero image sized, in a modern format, with its dimensions set and
`fetchpriority="high"`; nothing above the fold waiting on a script. The headline paints within 2.5 seconds on a
phone connection and nothing shifts after it (antheo-review's page check reports both). "One file" means one
display family in one weight, cut to the characters the page sets in it; self-hosted and preloaded in production.

## In Clean, the subject is content, never ornament

A parcel tracker does not draw a postal route; a booking picker does not wear a desk calendar; a pricing page for a
feedback tool does not get sticky notes. The subject shows as real content: places, times, people, things, numbers.
A component that **is** a physical thing (a bank card, a dial, a ticket) is not ornament: it is drawn as that thing,
inside its own edge only (antheo-surface `references/objects.md`).

## Remove the tells, both kinds

**First, the principle:** every visible choice serves the task, the content, the audience or the chosen reference.
Keep interactions recognisable, make the product's identity specific, and remove unsupported claims, irrelevant
decoration and unfinished behaviour.

**Hard rules (trust), always:** no invented proof, numbers, testimonials or customers; no control wired to nothing;
no content hidden until a decoration finishes; no contrast, keyboard or recovery given up for style; no navigation,
data or chrome invented to fill space.

**Everything else is a question, not a ban:** was this chosen for the audience, the brand, the reference or the
material, and does it stay usable? If yes, keep it; if it is there by default, it is a tell. Banning a colour only
makes the same generic page in another colour. The list below is what to ask about, with what to do instead; the full
list is `references/slop.md`.

**Lazy defaults:**
- Purple-to-blue gradients, glow on every surface, five or six bright colours.
- Emoji as icons; tags and pills everywhere; status dots on things with no status.
- Uppercase eyebrows over every heading; section numbers as decoration.
- Cards in cards; a thick coloured border down one side of a card; one big radius on everything.
- A two-tone headline (one grey half, one dark; one coloured or italic word).
- Hype words, invented proof, lorem ipsum.

**Invented styles** (the look of generated UI):
- An outline on every card, a coloured outline on the important one; big round corners; pill buttons.
- Six text sizes and three weights on one screen; a huge headline that wraps.
- Pills and dividers everywhere; a hue on twenty things.
- Chrome nobody asked for: a site header on a section, a sidebar of made-up destinations.

**Trying too hard:**
- Tilted notes, stickers, tape, stamps; fake hand-drawn circles, underlines and arrows; highlighter marks.
- Bands of clashing background colours; grain and paper textures.
- A quirky display face used for body text and controls.
- A familiar layout bent out of shape to look original (a pricing table squeezed into cards, a hero pushed off
  centre above a centred grid, a split screen whose second half is a placeholder).
- Extra metadata, panels and "ticket" cards nobody asked for.

The familiar patterns are **not** tells: a centred hero, two to four plan cards, an FAQ, equal section padding. Done
precisely, they are what people prefer.

## A Brand page: three decisions, on the clean structure

1. **Three nouns** from the subject's physical world: materials, tools, places, objects. Never feelings.
2. **One direction** picked from the nouns (`references/directions.md`), and from it:
   - one display face for headlines only, with a neutral text face for everything read or pressed (antheo-type);
   - one colour field and one accent taken from the nouns (antheo-color);
   - **one** image made from the subject: the product itself as UI, the object drawn, or a diagram of how it works.
3. **One expressive idea for the whole page,** chosen with the person, carried by as many devices as it needs (a
   display face, a colour field, an image, an unusual layout) as long as each serves that idea and has a job. Two
   ideas competing at full volume is the failure, not the number of devices. When the person hasn't chosen, offer two
   or three coherent directions from the nouns, each a whole idea, and let them pick.
4. **Type at the size of the idea.** The preset's 36px ceiling is for product pages. On a Brand page the headline
   is often the image: `clamp(48px, 9vw, 120px)` is ordinary, a poster runs 120 to 200px, and two or three words that
   are the whole image may be sized to the window (`references/pages/poster.html`), with tight tracking and leading
   near 1. Check it at 320px: no word breaks, nothing scrolls sideways. Text people read stays at reading
   size.

The craft does not change: one content edge, matching siblings, the spacing scale, units beside their numbers,
nothing rotated or hand-drawn unless the person asked for exactly that. Sections share one ground unless a second
ground has a reason (the closing section, a quote). Plan the sections with `references/scenes.md`.

## Before you finish, one line each

1. Clean or Brand, and who asked for Brand. On a landing page, the four plan lines (kind, material, sections, hero).
2. For a Brand page: the three nouns, the direction, the one idea and the devices that carry it.
3. What you removed: every decoration that had no job.

## Done

- [ ] Clean unless the person asked for Brand; in Clean, no ornament from the subject
- [ ] Every tell from `references/slop.md` answered: removed, or kept on purpose with the reason said
- [ ] A Brand page keeps antheo-build's "always" list: one idea, a readable text face, no decoration without a job
- [ ] A landing page: planned from the brief (kind, material, sections, hero), and the page check run with `--landing`
- [ ] Looked at on a phone and at 1280px before calling it done

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/slop.md`: the tells of generated and over-designed UI, each with what to do instead
- `references/directions.md`: the directions for Brand pages, and the kinds of image made from the subject
- `references/photos.md`: when a page needs a photograph, where it comes from, stand-ins and their credits
- `scripts/stand-ins.mjs`: finds and fetches openly licensed stand-in photographs from Openverse and Wikimedia
  Commons (no key), records each licence, prints the credits line
- `references/landing.md`: planning any landing page: the kind, the material, the sections and the five hero
  compositions
- `references/pages/hero-split.html`, `hero-stage.html`, `hero-object.html`, `hero-visit.html`,
  `hero-statement.html`: one finished Clean landing page for each composition, on the style block
- `references/scenes.md`: planning a Brand page's sections, the hero, and the familiar parts done well
- `references/pages/poster.html`: one finished Brand page (the Poster direction, an event) that passes the page
  check with the preset off; open it to see the idea, the type size and the craft held together
