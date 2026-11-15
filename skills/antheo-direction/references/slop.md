# The generated look, and what to do instead

These are the patterns that make a UI read as "an AI made this": the lazy defaults, and the decoration of UI that is trying too hard. **Fix every one you find.** The fix is never something more original: it is the familiar pattern built precisely (antheo-build), with real content.

## Color and surface

| # | Tell | Instead |
|---|---|---|
| 1 | Purple-to-blue gradients, glowing blobs, aurora backgrounds | Flat surfaces in a palette derived from the subject; one deliberate visual |
| 2 | Default blue (#3b82f6) or indigo as the accent | A brand color taken from the product's world (antheo-color) |
| 3 | Cream background + forest green + terracotta ("artisanal" by default) | Only if the subject truly calls for it, and then make one choice that isn't expected |
| 4 | Glassmorphism (blurred translucent cards) everywhere | Solid surfaces; translucency only for floating chrome over media |
| 5 | Neon glows and colored shadows | Neutral, tinted, layered shadows |
| 6 | Gray text that fails contrast to look "subtle" | `--text-2`, which passes 4.5:1 |

## Costume (components and app screens)

| # | Tell | Instead |
|---|---|---|
| C1 | The subject drawn into the UI: a postal route, a calendar page curl, stamps, tickets, perforations, tape | The subject in the content (real places, times, people) and in one moment from the job |
| C2 | Paper, kraft, cream or parchment grounds; grain, dots or halftone on a control | The block's `--surface` on `--bg`, flat |
| C3 | A serif or display face inside a component; a title over 15px | One grotesk; a 15px title at weight 550; size only for the one value that matters |
| C4 | Brown, olive or cream neutrals; the brand hue on borders, headings and panels | Warm grey at chroma ≤ 0.01; the ink as the accent; colour only from content |
| C5 | Dashed or dotted borders and dividers | Solid hairlines between repeating rows only; space between sections |
| C6 | Uppercase tracked labels (EXPECTED, STATUS) | Sentence case at 12px in the second text tone |
| C7 | A sparse or fake demo: "Item 1", one short name, lorem ipsum | Real-looking content with long and short values; only what the request names; lists stop at 5 to 6 rows |

## The new list (users, 2026)

People now call these slop on sight. Each alone is a tell; two together are certain.

| # | Tell | Instead |
|---|---|---|
| N1 | Tags and pills everywhere: "New", "Beta", "Pro", roles and counts as pills, a tag on every card or row | At most one tag per card and two per screen. The one thing to notice (a saving, the recommended plan, a real status) may be the accent tag; a role, a count or "You" is plain text; a status in a table is a word with a dot |
| N2 | Italicised words for emphasis, italic pull quotes | Emphasis through the words themselves |
| N3 | Instrument Serif (or Fraunces) with tight negative kerning as the headline | A face chosen for the subject, at its natural spacing; in product UI, no serif at all |
| N4 | Over-the-top detailed UI: every row with icon, badge, meta, avatar, menu; invented stats, panels, navigation and chrome | Only what the request names. No site header on a section, no sidebar of made-up destinations, no avatar or "Log in" nobody asked for; lists stop at what was asked |
| N5 | Dividers: between rows of a short list, under headings and card headers, between sections, between a price and its features | Space groups. A hairline only between repeating rows of a list or table, and under a sticky bar once content scrolls |
| N6 | Many shades and opacities of one colour; a hue on twenty things (ticks, badges, edges, the logo, avatars) | Two text tones, a few surface steps, one accent used only for "on" and one highlight: at most four accent things on a screen |
| N7 | Containers with borders: an outline on every card, a coloured outline on the important one, boxes around groups, cards in cards | A card is a surface with a faint edge (about 5%) and a soft drop, never a line. Emphasis is a deeper drop. Space groups; a well when it must |
| N8 | Diagrams, and the more detailed the worse | One simple shape, or the real product doing the thing |
| N9 | Code breadcrumbs: `~/app/…` paths, `// comments`, `<tags>`, mono file names as decoration | Plain words; mono only for code a person copies |
| N10 | Numbers as decoration: `01 / 02` eyebrows, numbered section labels | Claim headings. A real step count in a flow ("Step 2 of 3") is information and stays |
| N11 | The tasteful default: cream ground + serif display + forest or sage green (any two of the three) | A decision taken from the subject, written in the brief |
| N12 | The warm wash: amber accent on cream, "the em-dash of design" | A disciplined accent on a plain light ground |
| N13 | Eyebrow chrome: an uppercase micro-label with a dot and a trailing line | Nothing above the heading |
| N14 | Big round corners: 14 to 16px cards, pill buttons, every box at the same large radius | Three small corners: 10px cards, 6px controls, 4px tags; fully round only for switches and avatars |
| N15 | Animation spam: hover scale on every card, fade-up on every section | At most one signature moment, on a rare event (antheo-moment); everything else quiet. Removing all motion is not the fix |

A tell is an **unspecified default**, not a banned colour: swapping purple for emerald is a new default, not a fix.

## Type

| # | Tell | Instead |
|---|---|---|
| 7 | A tiny uppercase letter-spaced label ("FEATURES", "HOW IT WORKS") above every heading | Let the heading speak; use a label only when it adds information (step 2 of 3, a category) |
| 8 | Serif headline with one italic, accent-colored word | One style per headline; emphasis through words, not decoration |
| 9 | A quirky display face for body text, labels and buttons | A neutral text face for everything read or pressed; a display face only for headlines on a Brand page. A plain face such as Inter is fine when the spacing and hierarchy are precise |
| 10 | Many sizes and weights: six sizes on a screen, 400 against 700, a 48px headline that wraps, 300-weight body | At most four sizes on an app screen and five in a marketing section; two weights (450 and 550); a headline of 36px at most, two lines at most |
| 11 | Title Case On Every Button And Heading | Sentence case |

## Layout

| # | Tell | Instead |
|---|---|---|
| 12 | A familiar layout bent out of shape to look original: a hero pushed off-centre above a centred grid, a pricing table squeezed into cards, a split screen whose second half is a placeholder | The familiar pattern, precisely: a centred hero or text beside a real visual; 2 to 4 matching plan cards; one column for a form |
| 13 | Feature cards that say nothing: an icon in a coloured circle, a two-word title, two vague lines | Three matching cards or a plain list, each a claim and one real detail; an icon only where it adds meaning |
| 14 | Four identical KPI cards with "▲ x% vs last period" | Size by importance; one hero metric; fewer boxes |
| 15 | Sections that change background, alignment or padding for variety | One ground, one content edge, one section gap; variety comes from the content |
| 15b | Craft failures: labels that almost line up, a different left edge per section, a header off the content edge, siblings that do not match, a unit floating away from its number, a word broken mid-word, a bar covering content, arbitrary gaps, a dark theme nobody looked at | antheo-build's usage rules 13 to 18, checked close up in the screenshots |
| 16 | Cards inside cards inside cards | Use space and type for hierarchy; one level of container |
| 17 | Everything rounded to the max (24px on every box, pills everywhere) | Three corners by role (10, 6, 4); nested radii = outer − padding |

## Content

| # | Tell | Instead |
|---|---|---|
| 18 | Invented proof: "Trusted by 10,000+ teams", 4.9★, fake press logos, stock testimonials | Real, sourced proof, or none, or a clearly marked slot |
| 19 | Hype words: seamless, elevate, unlock, supercharge, effortless, all-in-one | Say what it does, specifically |
| 20 | Emoji as icons (🚀 ✨ 💡) | One icon set, one stroke weight |
| 21 | Lorem ipsum, "John Doe", "Acme Inc", round fake numbers ($10,000) | Realistic, varied sample content |
| 22 | "Get started" / "Learn more" as every button; an arrow on every link | Verb + outcome ("Start a free trial", "See how billing works"); an arrow only on the one exit action |
| 22b | Section headings that are labels: "Features", "How it works", "Why choose us" | Headings that are claims: "Most repairs are back by Friday" |

## Interaction

| # | Tell | Instead |
|---|---|---|
| 23 | Everything fades and slides in on scroll; hover lifts on every card | One entrance at most; motion only where it explains something |
| 24 | Only the happy path: no empty, loading or error states | All states (antheo-components `references/states.md`) |
| 25 | Charts in rainbow colors, donuts and gauges for everything | One accent for one measure; bars and lines; direct labels |

## Confirmed again in 2025 to 26 writing on AI-made UI

Named in several independent sources (Fountain Institute, noqta, superdesign), so they are among the first a reader
notices:

| # | Tell | Instead |
|---|---|---|
| R1 | A thick coloured border down one side of a rounded card | No side border; a status is a word or a dot in the status ink |
| R2 | Status dots and pulsing "Live" or "New" pills on things that are neither live nor new | Status only where there is a status, said in words |
| R3 | Emoji as icons, bullets, nav items or section heads | One icon set, sized and stroked to the text |
| R4 | Five or six competing bright colours, or a glow on every surface | One accent; colour only for meaning and content |
| R5 | Four or more of the tells above on one page | Rebuild from antheo-build: the style block, the pattern card, real content, nothing added without a job |

Treat these as a problem when they are unchosen defaults. Most sources are writers' observations and detector
rules, not measured studies.

## What the detectors look for (2026)

Several tools now scan pages for generated-looking patterns (Impeccable, Hallmark, pixelslop, a survey of 1,590
launch pages). These are the patterns they share that the tables above don't name. Skill by skill, the full lists
sit in each skill's `references/habits.md`.

| # | Tell | Instead |
|---|---|---|
| D1 | Framework fingerprints: `indigo-600`, `slate-900`, `rounded-2xl`, `shadow-lg` and `p-6` on everything; a stock component kit left untouched | The block's variables only; search the build for palette names |
| D2 | The replacement default: after purple, cyan on near-black or acid green on black; after Inter, Space Grotesk or Plus Jakarta Sans | A hue and a face taken from the brief, written down as values |
| D3 | Gradient text on a headline or number; a gradient border; a gradient-filled button | Solid ink, solid fills |
| D4 | A pill above the hero headline; a sub-line that repeats the headline; a filled button beside a ghost one | No pill; a sub-line that adds a fact; one action |
| D5 | The fixed page order: hero, three features, logos, pricing, questions, footer | Sections that come from the content; none without real content |
| D6 | A stat band of three or four huge figures ("10M+", "99.9%", "3×") | A real number inside a sentence, or nothing |
| D7 | The same big soft shadow on every card; border, shadow and tint together | Nearly flat at rest; a real drop only for what floats |
| D8 | An icon in a tinted round or rounded-square tile above every heading | The icon beside the text with no container, or none |
| D9 | The "anti-AI" costume: hard offset shadows, thick black borders, dot or grid-line grounds, hairline-ruled "broadsheet" pages | Only when the person asks for that look |
| D10 | Product chrome faked in boxes: a browser bar, a phone frame, a dashboard of grey bars; a gradient block for a missing picture; a mascot drawn from circles | A real screenshot or image, or no slot |
| D11 | Dark by default with grey text; pure black under pure white | Light unless asked; the block's dark values |
| D12 | Everything centred: headings, paragraphs, lists and forms | Centre a short heading over a centred row; everything else on the left edge |
| D13 | One value for everything: the same padding, gap, radius and card height across the page | Tight inside a group, looser between groups; corners by role |
| D14 | Forced-contrast copy ("Not a tool. A platform."), two-beat slogans, a dash in every sentence | antheo-writing; `copy-lint.mjs` flags them |
| D15 | Stock sample data: Sarah Johnson, Michael Chen, Acme, Globex; 47%, 10,000+, 99.9% | Names and figures that fit the product |
| D16 | Motion that performs: a logo marquee, a blinking cursor on static text, scroll-jacking; content invisible until a script runs | antheo-motion; visible by default |
| D17 | Controls wired to nothing, a "Thanks" with no request behind it; "TODO", "Coming soon", a template's old title | Press every control; search for leftovers before done |

A ban alone only moves the default: a model told "no purple" lands on the next most common look. What works is a
decision written as a value (this hue, this face, this size), which is what the style block is.

## Over-designed is slop too

Output that is trying too hard reads as generated just as fast as the lazy defaults. All of these came from real
builds.

| # | Tell | Instead |
|---|---|---|
| O1 | A tilted sticky note, sticker, tape or stamp | Delete it; say it in the headline or the subline |
| O2 | Fake hand-drawn circles, underlines and arrows; marks that draw themselves | Delete them; emphasis comes from position and size |
| O3 | A highlighter mark on a phrase | A plain label ("Recommended") and the only filled button |
| O4 | Full-width bands of clashing colours down the page | One ground; a second only once, with a reason |
| O5 | A price at 56 to 72px with its unit floating far away or on two lines | 32 to 40px, the unit on its baseline 4 to 8px after it, on one line |
| O6 | A split screen with a placeholder half ("Shown here", "Pick a time") | One column |
| O7 | Spec tables full of "Not included" inside plan cards | A short checklist per plan; the full comparison below |
| O8 | Invented metadata, "ticket" cards and panels the request never named | Only what was asked |
| O9 | Grain, paper and noise textures | Flat surfaces |
| O10 | An error said three ways (summary, helper, inline) in different words | One inline message; a summary only for several fields, in the same words |
| O11 | Text beside every switch saying "On" or "Off" | The switch shows its state; its label says what it controls |

## Words and finish

| # | Tell | Instead |
|---|---|---|
| W1 | A full stop after a title, label, button or tag ("You're in.") | No trailing full stop on anything that isn't a sentence in body text |
| W2 | Verbose, redundant text: a 19-word sub-line, a description under every title that repeats it, a helper under every control | A sub-line only if it adds something, in 12 words at most; a helper line only for a constraint or a consequence |
| W3 | A control missing the one thing a person needs: a file button with no formats, a destructive action with no counts, a yearly price with no total | That one line, in the small muted size |
| W4 | Thin or shifting states: a tiny "Saved", an error with no way out, a layout that jumps | The button says "Saved" and one line says what changed; errors offer the way out; the layout never moves |
| W5 | A label repeating the control under it ("Avatar" over "Change photo") | Drop the label |
| W6 | Styles invented per screen: new colours, sizes, corners and shadows each time | Paste the style block and use only its variables (antheo-build) |

## The question that catches the rest

**"If I removed this, would anyone miss it?"** If not, remove it. Then count: text sizes, weights, corner sizes,
accent things, tags, hairlines (antheo-build's limits). One of these alone is not slop; five together without a
reason is. Then: do the edges line up, do the siblings match, does every number sit beside its unit?
