---
name: antheo-writing
description: Writes and fixes every word in an interface (buttons, labels, errors, empty states, confirmations, toasts, onboarding) so it is plain, specific and ready to translate, with numbers, dates and money formatted for each language. Use to name a button, write error messages, fix copy that sounds generic, or prepare strings for translation.
---

# Antheo Writing

Words are the most-read part of an interface. Write like a calm, competent person talking to someone busy: say what
is true, what to do next, and nothing else. Every string must also survive translation. Where the words sit and how
much room they get belongs to **antheo-layout**; the names screen readers hear to **antheo-access**; the shared
glossary across a whole app to **antheo-system**.

## Decide the words before writing any

In an existing product, read what is there first: the strings and locale files, the casing on buttons and menus, the
words already chosen. New copy joins that system; a change to it is proposed, never slipped in.

List every noun the product shows and every verb people do, pick one word for each, and record the rejected ones:

| Concept | Use | Never | Why |
|---|---|---|---|
| a person on a team | member | user, teammate, seat | matches billing |
| gone for good | delete | remove, trash | it is permanent |
| out of a list only | remove | delete | the thing still exists |

Use the people's word, not the database's. Then three voice traits from the subject, each with a do and a don't.
Voice stays; tone moves with the stakes: errors steady, destructive actions plain, money, health and legal steps exact
and unhurried, success brief.

## Every string answers four things

Who reads it, where, what they just did, what they do next. A string with no next step (or no reason there is none)
is unfinished.

## Limits by string type

| String | Limit | Shape |
|---|---|---|
| Button | 1 to 3 words, 25 characters | verb + object: "Save changes", never "Submit", "OK", "Yes" |
| Link | 2 to 6 words | makes sense alone; a repeated "Learn more" says about what ("Learn more about exports") |
| Field label | 1 to 4 words | a noun, never a question; "(optional)" when it is |
| Placeholder | an example only | "name@example.com", never the label |
| Help text | one line, 90 characters | what to type, in what format |
| Error | usually two sentences | what happened. How to fix it. Never blame, never a code alone |
| Toast | one sentence, 60 characters | past tense, with Undo or the next step |
| Empty state | heading, one line, one action | what will be here, why it is empty, what to do |
| Page title | 65 characters | "Billing history · Acme" |

Every type with before-and-after pairs: `references/strings.md`.

## Undo before confirm

A reversible, frequent action happens at once and offers Undo ("Project archived. Undo"). Confirm only what is
irreversible, affects many items or other people. A confirmation names the thing and the loss ("Delete Q4 plan? Its
12 tasks are deleted too. This can't be undone."), with a verb-and-object button ("Delete plan") and Cancel. Deleting
a workspace, account or repository asks the person to type its name, with the button off until it matches (the one
time a primary button is off, and the line above it says why).

## Toggles name what "on" means

"Email me when someone mentions me", never "Email notifications: off". A toggle label never starts with "Don't",
"Disable" or "Hide". The switch shows its state, so no "On" or "Off" text sits beside it.

## Fewer words, and the one line a person needs

- **A helper line only for a constraint or a consequence:** "JPG or PNG, up to 2 MB"; "At least 8 characters";
  "Removes 14 projects and 1,208 tasks for all 9 members"; "$144 per seat, billed yearly". One per control at most,
  90 characters at most. Not under every control.
- **A sub-line only if it says what the title doesn't,** in 12 words at most. A description that repeats its title
  goes.
- **No full stop at the end of a title, label, button or tag.** Sentences in body text keep theirs.
- **Cut, then cut again:** remove a third of the words and keep going while it still reads well.
- **In-progress and done strings match:** "Saving…" then "Saved"; "Creating account…" then "Account created".

## Sample content is content

- **No invented data:** no extra rows, stats, panels, testimonials or features to look "real". The frame a real
  product has around a screen, and the helper line a control needs, are not inventions.
- **One made-up person** across every state of a screen: the same name, email and numbers in the default, error
  and done states. If the dialog says 38 projects, so does the page.
- **No placeholder text** in anything shown: no "Shown here", "Lorem", "Item 1", "TBD".
- **Prices people would publish:** in the precision the product and currency use, on every billing period (15 monthly,
  12 yearly; or 9.99 and 7.99), never a computed 9.60.
- **An amount says what it is:** "$16.00 due", "$144.00 paid today", never a bare figure that could be a price, a
  balance or a refund.
- **A provider's code becomes words:** `insufficient_funds` reads "Your card does not have enough money. Add funds or
  use another card." What happened, then what to do; the code itself is for support, shown only when asked for.
- **Each link once:** one "Log in" on a sign-up screen, and none after signing in.

## The mechanics

1. Sentence case everywhere, as the house default. A product that already uses title case on buttons and menus
   keeps it; either way, one casing per kind of element.
2. Front-load the word people scan for: "Billing history", not "View your history of billing".
3. Plain words: about a 12-year-old's reading level, 20 words or fewer a sentence, active voice, "you".
4. No hype or filler: seamless, powerful, unlock, effortless, supercharge, "Welcome to X!".
5. No "please" or "sorry" in normal flows; no "Oops"; at most one "!" a screen, for a real win.
6. Device words: "select" when it could be either, "tap" on touch, "click" only where there is always a pointer.
   Never point by position or colour ("the green button on the right").
7. Real characters: curly quotes, `…`, an en dash in ranges (9–5), `×`, `−`, a no-break space between a number and
   its unit. **No em dashes in interface text** (a house default: they read as generated and break badly in narrow columns): a
   colon, a comma or a full stop instead.
8. Contractions in a consumer voice; "cannot" and "do not" in legal, health, finance and government flows.

The full style, the hype list and inclusive language: `references/mechanics.md`.

## Ready for every language

1. One whole sentence per message, with named variables: `Showing {shown} of {total} rows`, never joined pieces.
2. Plurals and gender with ICU MessageFormat (`{count, plural, one {# file} other {# files}}`), never `file(s)`.
3. Format with `Intl` and the person's locale: `NumberFormat` (money, units, percent), `DateTimeFormat`,
   `RelativeTimeFormat`, `ListFormat`, `PluralRules`, `Collator` for sorting.
4. Room to grow: labels under 10 characters can grow 2 to 3 times; sentences about 40%.
5. No text in images; "start" and "end", never "left" and "right".
6. People's names and messages isolated (`<bdi>`, `dir="auto"`), and times and ranges too in a right-to-left page.
7. No idioms, puns or word play.

Recipes: `references/international.md`.

## Pages that sell

A landing, company or product page needs more than good strings: open `references/marketing.md` before writing
one. In short: fill the fact sheet from the brief first and state nothing outside it (an assumption that stays is
marked `data-assumed` and listed); write a three-line voice card and choose one register; the h1 names the category
(and, for an unknown name, who it is for or where) with one hard fact on the first screen; each device (a
two-fragment heading, a contrast frame, a "no X, no Y" run) stays within its budget; then lint with `--marketing`.

## Payload strings are not copy

Prompts, code and API examples, clipboard values and quoted terms are exempt from these rules; say so per element,
not per file.

## Check it

```bash
node <this-skill>/scripts/copy-lint.mjs <file | folder> --json copy.json
```

It checks HTML, JSX, TSX, Vue, Svelte, Astro, Angular templates, server templates (Jinja/Django, ERB, Blade, Twig,
Liquid, Handlebars, Nunjucks, EJS, HEEx) and JSON locale files, and reports file, line, rule and fix. On a landing or
company page add `--marketing` for the devices of generated selling copy. Fix every high and medium finding or say
why it stays. Then read every string aloud in the order a person meets them, search the page
for each rejected word (zero hits), and run the swap test: with a rival's name in, does the copy still fit? Add one
fact only this product has.

## What generated copy gets wrong

Check each in `references/habits.md` before calling it done: forced contrast · two-beat slogans · two-noun feature
names · a dash in nearly every sentence · a sub-line that repeats its heading · stock sample data · leftovers ·
nothing specific.

## Done

- [ ] One word per concept; rejected words absent; three voice traits
- [ ] Every string has a next step; buttons are verb + object; errors say what happened and how to fix it
- [ ] Undo before confirm; confirms name the thing and the loss; toggles name "on"
- [ ] Sentence case; no hype, "please", "sorry", "oops" or em dashes; one "!" at most
- [ ] Whole sentences, ICU plurals, `Intl` formatting, room to grow, people's text isolated
- [ ] Sample content: only what was asked, one person across states, no placeholders, prices as a business publishes them
- [ ] copy-lint clean or justified (`--marketing` on a page that sells); read aloud once
- [ ] A page that sells: every claim on the fact sheet, the h1 names the category, devices within budget
- [ ] Checked against every habit in `references/habits.md`
- [ ] Reported in antheo-review's format (`references/report.md` there): Block or Approve first, then Seen, Why
      and Fix with the value before and after

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `scripts/copy-lint.mjs`: the copy linter (no dependencies)
- `references/strings.md`: every string type, with rules, limits and before-and-after pairs
- `references/mechanics.md`: case, numbers, dates, contractions, plain and inclusive language, the hype list, characters
- `references/international.md`: ICU MessageFormat, gender, text growth, bidi, sorting, `Intl` recipes
- `references/habits.md`: what generated copy gets wrong, each with its fix
- `references/marketing.md`: copy for a page that sells: the fact sheet, the voice card, five registers, what each
  part of the page does, the budget for devices, what fixing the tells breeds
