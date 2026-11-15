# The design folder: templates

Copy these into `design/` at the project root. Keep each file short enough to read before every build.

## design/system.md

```markdown
# <Product> design system
Updated: <date> · Tokens: <path to tokens.css> · Components: <path to shared components>

## Identity (one line each)
Subject: … · Nouns: … · Direction: … · Signature: …

## Color roles
| Role | Token | Light | Dark | Use for |
|---|---|---|---|---|
| Page | --color-bg | #… | #… | the page behind everything |
| Surface | --color-surface | … | … | cards, inputs, menus |
| Text | --color-text | … | … | body and headings |
| Muted text | --color-text-muted | … | … | help text, captions |
| Accent | --color-accent | … | … | the one main action, selection |
| Field | --color-field | … | … | full-bleed statement bands |
| Status | --color-success / warning / danger / info | … | … | status only, with an icon and words |

## Type
Display: <family> <weight> · Text: <family> · Mono: <family>
Scale: xs 12 · sm 14 · base 16 · lg … · display-1 … to …

## Space, shape, depth, motion
Gaps by role: label 8 · inline 8 · item 12 · field 24 · group 40 · sections dense/regular/airy
Radii: xs … sm … md … lg … xl … (cards use …, inputs use …, pills only for …)
Elevation: shadow-1 resting card · shadow-2 menu · shadow-3 dialog · shadow-4 toast
Motion: 100 / 160 / 220 / 320 / 450ms · ease-out arriving · ease-in leaving · spring for toggles and drags
Layers: base 0 · sticky 10 · dropdown 20 · overlay 30 · modal 40 · toast 50

## Components: which one to use
| Job | Use | Not |
|---|---|---|
| Main action | `<Button variant="primary">` | the old `<PrimaryBtn>` (being migrated) |
| … | … | … |

## Decisions
- <date> · <decision> · <why>
```

## design/taste.md

```markdown
# What <person/team> likes
Read before every build. Newest first. Each rule has a scope; newer rules replace older ones.

## <date> · <short title>
Rule: <the rule, specific enough to apply>
Why (their words): "<quote>"
Scope: whole app | <section> | <screen>      Source: <correction | praise | review> on <where>
```

Examples of well-written entries:

```markdown
## 2026-11-14 · Corners: less round
Rule: cards and inputs use --radius-sm (6px); full pills only for badges and toggles.
Why (their words): "everything looks like a toy"
Scope: whole app      Source: correction on settings

## 2026-11-12 · Drawn objects are welcome
Rule: heroes and empty states may use a drawn object from the subject (flat fills, one stroke weight).
Why (their words): "love the tin, that's the vibe"
Scope: marketing pages and empty states      Source: praise on the landing page

## 2026-11-10 · No orange accent on cream
Rule: avoid the cream paper + dark brown band + orange accent combination; take field and signal from different nouns.
Why (their words): "every page looks the same now"
Scope: whole app      Source: review of five pages
```

## design/migration.md

```markdown
# Migration to the <Product> system
Started: <date> · Raw values at start: <n> · Now: <n>

## Steps
- [ ] 1. Exact matches → tokens (no visual change); screens checked: …
- [ ] 2. Close matches → tokens, colors; visible changes: …
- [ ] 3. Close matches → tokens, spacing and radii; visible changes: …
- [ ] 4. Components: <old> → <new> on <screens>
- [ ] 5. Strays decided (see system.md Decisions)
- [ ] 6. Lock: CI fails if raw values increase

## Log
- <date> · <what changed> · raw values <before> → <after> · screenshots: <folder>
```

## design/contracts/<component>.md (before replacing a component)

One per component being replaced. Fill it from the old component's code and every place it is used; then check the
new component against each row and mark the result.

```markdown
# Contract: <OldName> → <NewName>
Written: <date> · Used in: <n> places (<the 3 to 5 main ones>)

| Area | The old one does | New one satisfies? | Note |
|---|---|---|---|
| Props kept | `variant` (primary, secondary, ghost), `size` (sm, md), `disabled`, `loading`, `href` | yes / no / wrapper | e.g. `href` renders a link |
| Props dropped | `fullWidth`, used in 4 places | decision | replace with a layout rule |
| Slots / children | `icon` before the label; label text | | |
| States | default, hover, focus, pressed, disabled, loading (label stays, spinner replaces icon) | | |
| Keyboard | Enter and Space activate; Tab order unchanged; disabled is skipped | | |
| Focus behaviour | visible ring; stays on the button while loading; returns to it after a dialog closes | | |
| Events | `onClick` (not fired while disabled or loading), `onFocus`, `onBlur` | | |
| Strings shown | none of its own; loading adds `aria-busy`, no visible text | | |
| Accessible name | from the label; icon-only requires `aria-label` | | |
| Layout | min height 40px; does not shrink below its label | | |
```

A "no" is fixed in the new component, absorbed by a wrapper, or written up as a decision. Do not delete the old
component until every row is yes or decided.

Splitting a large migration across agents: `references/parallel.md`.
