# States

Design all of these at once, as one family: they share layout, size and tone, so switching between them never makes the page jump.

## Loading

| Wait | Show |
|---|---|
| under ~200ms | nothing (a flash of a spinner is worse than nothing) |
| 0.2 to 1s for content | skeleton shaped like the content |
| 0.2 to 1s for an action | the button's loading state (spinner inside, label kept) |
| 1 to 10s | skeleton or spinner + a short line ("Loading orders…") |
| over 10s | progress bar with % or steps, time estimate, Cancel |

- Skeletons mirror the real layout (lines for text, a box for an image), not a generic gray block.
- Keep a shown loader up for at least ~400ms to avoid a blink.
- Never show "No results" before the data has loaded.
- Optimistic updates for quick actions (likes, toggles, reorders): show the result at once, roll back with a message if the server refuses.

## Empty

Three different empty states. Don't reuse one for all:

1. **First use**: nothing created yet. Say what will live here and give the action: "No projects yet. Projects keep your files and tasks together. [New project]". A small illustration is welcome here.
2. **No results**: a search or filter found nothing. Say what was searched, offer to clear: "No orders match 'refund' in the last 30 days. [Clear filters]".
3. **Done**: everything handled. Quiet celebration: "You're all caught up." This is a good place for the one delightful moment.

## Error

- **Field errors:** below the field, red text with an icon, `aria-invalid` + `aria-describedby`, focus the first invalid field on submit, and a summary at the top for long forms with links to each field.
- **Panel errors:** inside the panel that failed, not a page-wide banner: "Couldn't load revenue. [Retry]". Other panels keep working.
- **Page errors (404, 500):** plain words, a way forward (home, search, back), no jokes that blame.
- **Network/offline:** a slim banner "You're offline. Changes will sync when you reconnect." and disabled actions that need the network.
- Always keep what the person typed.

## Success

- Quiet confirmation where the action happened: the button shows "Saved ✓" for 2s, or a toast for things that happen elsewhere.
- Big moments (first order, finished onboarding) can have the screen's one delight.

## Disabled and permission states

- Disabled controls stay readable and explain why on hover/focus or with text nearby ("Only admins can delete projects").
- Prefer hiding actions people can never take; disable actions they could take after doing something ("Add a payment method to upgrade").

## Content extremes (test every list and card with these)

- 0, 1, 2, 100 and 10,000 items
- A 2-letter name and a 60-character name; a word with no spaces (URLs, emails, IDs)
- Missing image, missing avatar (initials), missing optional fields
- Very large and very small numbers, negative numbers, zero
- Right-to-left text and a language 30% longer than English (German, Finnish)
- Dates far in the past and future, time zones

Fix with: `min-width: 0` + ellipsis + full text on hover/focus; `overflow-wrap: anywhere`; `line-clamp`; fallbacks for every optional field; `Intl` for numbers and dates.

## Test data that breaks things

Put these through every list, table, card and form before calling it done (antheo-stress, with antheo-review's `--stress`, covers long
text, long words and right-to-left automatically; the rest is by hand):

| Field | Values |
|---|---|
| Names | "Al", "Maximiliana Ottilie Wilhelmina von Hohenzollern-Sigmaringen", "O'Brien", "Zoë Saldaña-Øster", "李小龙", "محمد عبد الله" with the handle "@m.abdullah", a name with an emoji |
| Emails | a 64-character local part, `jo+billing@studio.example`, `first.last@sub.domain.co.uk`, an uppercase address |
| Amounts | 0, -42.50, 7 digits (`1234567.89`), a currency with no decimals (JPY), one with three (KWD) |
| Text | an empty string, a single word of 40 letters, a paragraph of 600 characters, a line break in a title |
| Counts | 0, 1, 2, 99, 100, 10 000 (badges, plurals, pagination) |
| Media | a broken image URL, a very tall image, a very wide image, a missing avatar |
| Time | today, yesterday, a date next year, a time zone 13 hours away, a date-only value near midnight |
