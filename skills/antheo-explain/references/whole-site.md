# Explaining a whole site or app

Part of antheo-explain. Open it when the question is about the whole thing ("how is this site built?", "what makes
this app feel like that?") and not one effect. The answer is the system behind the pages: the few values and parts
that repeat, and the ideas that carry over. It is not a tour of every page.

## 1. Pick the pages

Four to six pages, one of each kind the site has. More pages of the same kind add nothing.

| Kind | Why it is in the sample |
|---|---|
| The home or landing page | the loudest type, the widest layout, the most motion |
| A list or index (search results, a table, a feed) | density, rows, the repeated card |
| A detail page (an article, a product, a record) | body type, line length, the reading width |
| A form or settings page | controls, fields, states, validation |
| A dense app screen behind the login, if they can reach it | the product itself, where the system is strictest |
| An empty, error or 404 page | what the system does with nothing to show |

Say which pages were sampled and which kinds were left out ("no page behind the login was read"). A value seen on
one page is that page's; a value seen on most of them is the system's.

## 2. Measure them together

```bash
node <this-skill>/scripts/inspect.mjs --site <home> <list> <detail> <form>            # 1280px, light
node <this-skill>/scripts/inspect.mjs --site <home> <list> <detail> <form> --width 390
node <this-skill>/scripts/inspect.mjs --site <home> <list> <detail> <form> --dark --json site.json
```

Each run opens every page at one width and theme and counts the values its visible elements use at rest. It prints
each value with its count and the number of pages it was found on, most widely shared first. Run it three times:
wide, phone and dark. A value that changes between the runs is responsive or themed, and is reported as both.

Proof it ran: the first line reads `Measured at rest at 1280px, light, on 4 of 4 pages`. A page that fails to load
is named on a `not read:` line and left out of the counts. Exit 1 means no page was read.

What the survey does not see, and where to get it:

| Not seen | Get it from |
|---|---|
| Hover, focus, pressed and open states | `inspect.mjs <url> "<selector>"` on one control, or DevTools forced state |
| Motion driven by script, canvas or WebGL | the `running animations` count, the `canvases` count, then `references/pitfalls.md` |
| Inside iframes and shadow roots | each page line says how many it skipped: open the frame's own URL as a page |
| The face that is really drawn | the `fonts loaded` line, checked against the first family named |
| Which blocks are one component | your eyes, on a screenshot of each page |

No browser: use `references/no-browser.md` and report declared values instead of computed ones.

## 3. What to report

One short block per row. Give the values, the count of distinct ones, and the pattern behind them.

| Report | From the survey | Say |
|---|---|---|
| Type faces | `TYPE FACES`, `fonts loaded` | which face does which job (display, text, mono, numbers), and how many |
| Type scale | `TYPE SIZES`, `WEIGHTS` | the sizes that recur, the step between them, the weights, the body line height |
| Colours by role | `TEXT COLOURS`, `FILL COLOURS`, `EDGES` | page, surface, text, muted text, edge, accent, status: one value each, per theme |
| Spacing | `GAPS`, `PADDING` | the base unit (4 or 8), the steps in use, the gap between sections |
| Corners | `CORNER RADII` | how many, and what each is for (controls, cards, pills) |
| Depth | `SHADOWS`, `EDGES` | shadows, edges or fills: which one separates surfaces, and how many levels |
| Recurring components | `CONTROLS`, the screenshots | the 5 to 8 parts every page is made of, each with its height, corner and type |
| Motion habits | `MOTION`, `running animations` | the durations and curves that repeat, what moves, and what never does |
| Layout widths | `WIDTHS`, at 1280 and 390 | the content width, the reading width, the gutters, where the layout changes |
| How it is built | the page source, not the survey | the framework, from its marks in the markup (`__NEXT_DATA__` or `/_next/`, `data-astro-`, `data-v-`, `ng-version`, `data-sveltekit-`, a generator meta); whether the first HTML already holds the content (rendered on the server) or an empty root (in the browser). A guess, with the mark that led to it |
| How it is served | the network panel or the `<head>` | fonts (self-hosted or a font service, `font-display`, preloaded or not), images (formats, `srcset`, lazy below the fold), and what loads before the first paint. Measured where a file was read, guessed otherwise |

Tag each line the way the skill always does:

- **Measured:** a value the survey printed, with the width and theme it was read at. "Body text is 15px on a
  1.5 line, on 4 of 4 pages (measured, 1280px, light)."
- **Worked out:** a role or a pattern that follows from measured values. "The sizes step by about 1.2 (worked out)."
  "`rgb(10, 102, 255)` fills every main button and nothing else, so it is the accent (worked out)."
- **Guessed:** anything about intent, tooling or what was not sampled. "The spacing looks like a 4px grid
  enforced by tokens (guessed)."

Roles are always worked out or guessed: the browser gives a colour, never its job. Class names and frameworks are in
`references/pitfalls.md`: they are the build's output, not the design.

## 4. Close on the few ideas that carry over

Three to five, each one sentence, each something the person could apply tomorrow with their own values. Lead with
the constraint, not the value: "two weights and four sizes do all the work", "one accent, used only on the main
action of each screen", "nothing moves longer than 200ms and nothing loops". Then name the Antheo skill that would
build each with their values (antheo-type, antheo-color, antheo-surface, antheo-motion, antheo-layout). Never close
on a copy of their palette.

## Done

- [ ] Four to six pages of different kinds sampled; the pages and the missing kinds named
- [ ] Surveyed at 1280px, at 390px and in dark; what changed between runs reported as responsive or themed
- [ ] All eleven rows reported, each line tagged, each measured value with its width and theme
- [ ] What the survey did not see is listed as not read, not guessed
- [ ] Ends on three to five ideas that carry over, each with the skill that builds it
