---
name: antheo-direction
description: Gives a landing, campaign or brand page its own identity, only when the person asks for an expressive page ("landing page", "make it distinctive", "bold", "playful") or praises a reference. It also holds the list of tells that make UI look generated or over-designed. Not for ordinary app screens, settings, forms or sections, which stay clean (antheo-build); a component built from an expressive reference, or one the person asks to be bold or playful, may take a direction (its play is antheo-creative's). Use when something looks AI-made or over-decorated, or before designing a brand page.
---

# Antheo Direction

Most screens need no direction at all: the familiar pattern, built precisely, is what people like best
(**antheo-build**). This skill is for the few pages whose job is to be remembered, and only when the person asked
for that. It also owns the list of tells, in both directions: the lazy defaults of generated UI, and the decoration
of UI that is trying too hard.

Values belong elsewhere: colours to **antheo-color**, type to **antheo-type**, sizes to **antheo-components**,
widths to **antheo-layout**. antheo-build's fundamentals outrank everything here.

## Clean or Brand

| | For | Identity comes from |
|---|---|---|
| **Clean** (the default) | components, app screens, dashboards, settings, forms, dialogs, pricing and other ordinary sections | real content, exact spacing, good words |
| **Brand** (only when asked) | a landing or campaign page, a launch, one illustration | one typeface, one colour field, one image, on the same clean structure |

Unsure which: Clean, and offer Brand as a variant.

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

The structure does not change: one content edge, matching siblings, the spacing scale, units beside their numbers,
nothing rotated or hand-drawn unless the person asked for exactly that. Sections share one ground unless a second
ground has a reason (the closing section, a quote). Plan the sections with `references/scenes.md`.

## Before you finish, one line each

1. Clean or Brand, and who asked for Brand.
2. For a Brand page: the three nouns, the direction, the one idea and the devices that carry it.
3. What you removed: every decoration that had no job.

## Done

- [ ] Clean unless the person asked for Brand; in Clean, no ornament from the subject
- [ ] No tell from `references/slop.md`: lazy, invented or over-designed
- [ ] A Brand page keeps antheo-build's "always" list: one idea, a readable text face, no decoration without a job
- [ ] Looked at on a phone and at 1280px before calling it done

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/slop.md`: the tells of generated and over-designed UI, each with what to do instead
- `references/directions.md`: the directions for Brand pages, and the kinds of image made from the subject
- `references/scenes.md`: planning a Brand page's sections, the hero, and the familiar parts done well
