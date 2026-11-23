# How the Antheo skills work

A short guide for people using the skills, at any level. The skills themselves are written for the agent; this page
explains how they fit together.

## One entry point, then only what the work needs

Every UI request starts in **antheo-build**. It decides two things: what must hold in any style, and whether the
**Quiet preset** applies. Then it opens another skill only when the work reaches that skill's job:

| The work involves | The skill that owns it |
|---|---|
| a single control, its states and behaviour | antheo-components |
| a table, chart or figure | antheo-data |
| words on the screen | antheo-writing |
| something that opens, closes or moves | antheo-motion |
| keyboard, screen reader, zoom, touch | antheo-access |
| a phone | antheo-mobile |
| colour, type, layout, surfaces, tokens | antheo-color, antheo-type, antheo-layout, antheo-surface, antheo-tokens |
| an app that already has a look | antheo-system |
| any landing, company or product page: its plan and hero | antheo-direction (and its words: antheo-writing) |
| a landing or brand page someone asked to be expressive | antheo-direction, and antheo-moment for one rare peak |
| "is it ready?" | antheo-review, with antheo-stress for awkward content |
| an opinion, or "how was this made?" | antheo-critique, antheo-explain |
| every animation in an app | antheo-motion-audit |

Each skill keeps its entry file short and opens a reference only when a step points to one, so twenty-one skills cost
little until they are used.

## Always, and the four looks

**Always, in any style:** the task is clear and can be finished; every control works and every state is reachable;
keyboard, names, contrast, targets and zoom hold; real content survives every width and both themes; the project's
existing system is kept; nothing is invented; and every claim comes with the check that shows it.

**The looks.** The style block comes in four looks that share every name and every rule (few text sizes, two weights,
three corner sizes, faint edges, colour only for "on"):

| Look | For | Chosen when the request says |
|---|---|---|
| Quiet (the default) | any product screen | nothing else |
| Studio | dense pro tools: editors, consoles, inspectors | "pro tool", "dense", "editor", "IDE", many panes |
| Editorial | pages people read: articles, docs, case studies | "article", "blog", "docs", "story" |
| Playful | products meant to be enjoyed: habits, learning, kids | "playful", "fun", "friendly", "for kids" |

The agent never asks which look and never switches for variety. Every look gives way to a person's explicit direction
and to a project's own design system; then outlined cards, pills, more weights or several colours are choices, not
defects. The page check follows the same split: `--preset studio` (or editorial, playful) judges that look, and
`--preset none` keeps every universal check and drops the look's own.

## Depth follows the person

The agent reads who is asking from how they ask, and changes how much it explains, never the quality of the work:

- **New to design:** the sensible default, built and working, in plain words, with the one mistake to avoid.
- **Practised:** the options, their trade-offs, and how it fits the existing code.
- **Senior:** constraints, exceptions, the behaviour contract and the evidence.
- **Lead:** the outcome for people and the business, the options with cost and owner, rollout and how success is
  measured.

A small component task gets no strategy memo.

## Check in proportion to the change

| Level | When | What gets checked |
|---|---|---|
| Small change | a fix, a copy edit, one control | the changed behaviour and its states, at 390 and 1280px, light and dark |
| Component or flow | a component, a form, a screen | the above, plus keyboard and focus, errors, empty and loading, awkward content, two reviewers kept apart |
| Release or migration | a launch, a redesign, a migration | every changed route at seven widths, the access probe, real devices, an independent reviewer, regressions, rollout and rollback |

Whatever a level leaves out is reported as not checked, never as passed.

## The gate and its five outcomes

`gate.mjs` keeps the agent working until the automated checks pass. It never reports one outcome as another:

| Says | Exit | Means |
|---|---|---|
| `GATE: PASS` | 0 | nothing blocking found; not a full release review |
| `GATE: PASS, PARTLY MEASURED` | 0 | nothing blocking in what was measured; it lists what it could not read, and the person is told |
| `GATE: OPEN` | 1 | findings to fix; one round used |
| `GATE: DONE, UNRESOLVED` | 3 | three rounds ran out with work open; the person is told what is left |
| `GATE: TOOL ERROR` | 4 | a checker failed; nothing was verified |

Each round deletes the last report before checking, so a crashed checker can never leave an old pass behind. The
gate also checks itself: a checking tool edited after arming, page code that tests for the checker, or more than five
waivers keeps the work open. Armed with `--landing`, it adds the landing-page checks (the first screen, contact
details to confirm, share tags) and lints the copy as marketing. A throwaway sketch or an early direction skips the
gate; it is armed once the person picks one to keep, before the build is called done.

antheo-stress scales the same way: a quick pass on one screen checks a long name, the empty state and a 390px phone;
the full harness (every state, every slot) is for shared components, new flows and releases.

## How the skills are tested

`node tests/self-test.mjs --browser` checks the skills themselves: their front matter, links and token names; that
the tools still pass ten example pages built from the style block; and that they catch each defect planted in a set
of pages broken on purpose (low contrast in RGB and in OKLCH, sideways scroll, too many sizes, an unnamed button,
tiny targets, a stale report, an unresolved gate, a landing page with its hero below the fold, a heavy image, a page
that tests for the checker); and that the five landing pages in antheo-direction pass the landing check. The `evals/` folder grades a skill by running the same brief with
and without it.
