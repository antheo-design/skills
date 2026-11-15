# Screen patterns

Each pattern is the familiar version of that screen. Every one is built from antheo-build's style block and usage rules: the block's sizes, widths, corners and shadows; at most four text sizes on an app screen; cards without outlines; hairlines only between repeating rows; chrome only as the request names it. Four have their own short card: `screens/pricing.md`, `screens/settings.md`, `screens/sign-up.md`, `screens/list.md`; read the one you need. The sizes in the patterns below predate the block: where a number differs, the block wins.

## The bar (app pages)

An app page gets one bar across the window: `--h-bar` tall, `--surface`, no line under it; a neutral logo tile (20px, with a simple one-shape mark inside, never an empty square) and the product name (`--t-body`, `--w-strong`) at the start; the one context the request names (a workspace's name) as `--text-2` text at the end. A sidebar only when the request lists destinations: plain rows of `--h-control` with 16px grey icons, the current one on `--selected`. Under the bar, one centred column from the block's widths.

## Landing page

**Job:** say what it is and get one action.

1. **Nav** (56 to 72px): brand on the content edge; 3 to 5 links at 14 to 15px; one action at the end.
2. **Hero:** a headline under about 12 words saying what it is, in one colour and weight; one sentence of why at
   18 to 22px, at most two lines; one primary button and at most one quiet link. Centred, or left-aligned with a real
   view of the product beside it. No real visual: centre the text.
3. **Middle sections (3 to 5):** the product shown working, three matching feature cards or a plain list, real proof if
   it exists, pricing, the questions people really ask.
4. **Closing:** one sentence and one button.
5. **Footer:** `--t-body` in `--text-2`, true links only.

Every section sits on one ground and one content edge, with one section gap. An expressive version (a display face,
a colour field, an illustration) is built only when the person asks for it, with antheo-direction.

Phones: the hero stacks (headline, sentence, button, visual); the nav becomes a menu button; sections keep their
order.

## Dashboard

**Job:** "How are things, and where should I look?"

1. **Header row:** page title, date range control, one primary action (export / new). One line.
2. **Key numbers:** the one that answers the job at 40 to 56px in the display face, with its change beside it; then 2 to 4 secondary numbers in one row, as matching cards or under a hairline. Each: label (sm, muted) → value (tabular) → change with arrow + sign + word ("up 12% vs last 30 days"), green/red *plus* the arrow. 
3. **Main chart:** full width (or 2/3 with the breakdown beside it), the trend that answers the job; 220 to 300px tall so the **first screen at 1280×800 shows the key numbers, the chart and the start of the breakdowns**. Line for time, bars for comparison. Direct labels; one accent series, others gray.
4. **Breakdowns:** 2 panels side by side (top items as a sorted horizontal bar list, a split by channel).
5. **Detail table:** the records behind the numbers, with a "View all".

Each panel owns its loading (skeleton shaped like it), empty ("No orders yet in this range. Change the range") and error ("Couldn't load orders. Retry") states. Never a full-page spinner.

Phones: numbers become a 2-column grid (hero metric full width); chart full width with fewer ticks; table becomes a list of rows with the 2 to 3 key fields.

Avoid: pies and donuts (except a single percentage with the number), gauges, 3D, rainbow bars for one measure, more than 6 panels on the first screen.

## Settings

Its own card: `screens/settings.md`.

## Sign-in / sign-up

Its own card: `screens/sign-up.md`.

## Pricing

Its own card: `screens/pricing.md`.

## List / table page (orders, invoices, records, people)

Its own card: `screens/list.md`.

## Detail page (a record, a product, a profile)

- Header: name (2xl), status badge, key meta inline, actions right (primary + "More" menu).
- Two columns on desktop: main content (≈2/3) and a side panel (≈1/3) with properties as label/value pairs.
- Activity/history as a vertical timeline at the end.

## Directory (people, places, items)

- Search first (it's how people use directories), then filters (team, location, role) as chips.
- Grid of person cards: photo/avatar (1:1), name (`--t-body`, `--w-strong`), role (`--t-body`, `--text-2`), one or two quick actions (message, copy email) visible on hover *and* focus.
- Group or sort by something meaningful (team, alphabet, location) with sticky group headers.
- A profile opens as a side panel on desktop (keeps your place in the list) and a full page on phones.
- Empty search: suggest close matches.

## Calendar

- Header: current range ("November 2026"), previous/next, Today, view switch (Month / Week / Day / Agenda).
- Month: 7-column grid; weekday labels short ("Mon"); today marked by a filled circle on the date, not a full cell fill; events as short bars with time + title, max 3 per day then "+2 more".
- Week/Day: time grid on the left, events as blocks sized by duration; "now" line in the accent.
- Agenda (list) is the default on phones.
- Keyboard: arrow keys move between days, Enter opens, PageUp/PageDown change month. Each day has an accessible name ("Thursday, 14 November, 3 events").

## Chat / assistant

- Messages column max ~45rem, centered; the person's messages right-aligned in a tinted bubble, the assistant's left-aligned without a bubble (it's the content).
- Composer pinned at the bottom: grows with text up to ~8 lines, send button inside, Enter sends / Shift+Enter new line.
- While waiting: a small typing indicator, then streaming text; a Stop button replaces Send.
- Errors inline under the failed message with Retry.

## Docs / article

- Text column 60 to 70ch; a table of contents on the right at ≥1200px (sticky); breadcrumbs above the title.
- Headings with anchor links; code blocks with copy; callouts sparingly.

## Onboarding

- Ask only what's needed to reach first value; 3 steps or fewer; progress shown ("Step 2 of 3"); every step skippable.
- Prefer teaching inside empty states over a forced tour.

## Empty state

- In the space the content will occupy, centered: a small illustration (≤ 240px, optional), one line saying what goes here, one primary action that fills it, an optional secondary (import, learn more).
- Three different empties: **first use** (invite to create), **no results** (offer to clear filters), **all done** (celebrate quietly).
