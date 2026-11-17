# Mechanics: style, plain language, hype list, typography

Use with SKILL.md Step 3. Pick one answer per product for every "choose" below, write it in the vocabulary table, and keep it.

Contents: 1 case and punctuation, 2 numbers, 3 dates and times, 4 money and units, 5 abbreviations, 6 contractions, 7 voice and person, 8 plain language and reading age, 9 inclusive language, 10 hype and filler list, 11 exclamation marks, emoji, please and sorry, 12 typography in copy, 13 substitution table, 14 widows and wrapping.

## 1. Case and punctuation

- **Sentence case** (the house default; a product that already uses title case on buttons and menus keeps it, one casing per kind of element) for page titles, headings, buttons, tabs, menu items, labels, column headers, toasts. Capitals: first word, proper nouns (Figma, London), acronyms (PDF).
- Product feature names: capitalize only if they are real proper names and used the same way everywhere. Otherwise lowercase ("the invoice editor").
- **No end punctuation** on buttons, labels, tabs, menu items, short headings, table headers. Full stops on sentences, including help text and errors.
- **Colons:** a label may end with a colon in a dense form; no colon after a heading. Do not put a colon before a list of one line.
- Lists: bullets for items that are parallel in grammar (all start with a verb, or all nouns). Short fragments need no stops; whole sentences do.
- **Serial comma:** use it in English ("A, B, and C") when the product's voice is US; skip it if voice is UK. Pick one. (`Intl.ListFormat` does this for you in lists.)
- Do not use `&` in sentences; use "and". `&` is fine in a proper name or a tight tab ("Terms & privacy" is not: write "Terms and privacy").
- Do not use slashes for alternatives ("and/or", "he/she"); say "or" or restructure.
- Do not use parentheses to hide plurals ("item(s)").
- Hashtags and `@` only for the thing they name.
- No ALL CAPS in source text. If a style calls for capitals, use `text-transform: uppercase` on a short label only (and not for Turkish or German `ß` text; do not use for sentences).

## 2. Numbers

- **Digits for all numbers in UI** ("3 files", "1 hour"), including one through nine. Exception: a number that starts a sentence, or "one" used as a pronoun ("pick one").
- Use the locale's separators via `Intl.NumberFormat` ("1,234" vs "1.234"). In English source copy: comma for 1,000 and above; leading zero on decimals (0.5); a space or comma consistently.
- Ranges: an **en dash** with no spaces for numbers and dates ("9–5", "2–4 days"), or "to" in prose ("from 2 to 4 days"). Never use a hyphen. In a sentence, do not mix: "from 2–4" is wrong, use "from 2 to 4".
- Negative values: a real minus sign `−` (U+2212), not a hyphen ("−5 °C").
- Percent: attach with no space in English ("25%"), per locale format in other languages (French uses a narrow no-break space before `%`). Use `Intl`.
- Approximate: "about 20 seconds", not "~20 sec" or "20-ish".
- Large numbers: say "1.2 million" in prose, or compact notation in tight UI ("1.2M"). Do not mix in one view.
- Phone numbers: international form with `+`, and non-breaking spaces within groups. Do not split them with a line break.
- Ordinals ("1st", "2nd") only through `selectordinal`; avoid in UI when you can ("Step 2 of 4").
- Counts next to nouns: always plural-aware (see `international.md`). "1 file", "2 files", "0 files" (or "No files").
- Tabular numerals (`font-variant-numeric: tabular-nums`) for columns and anything that updates.

## 3. Dates and times

- Source of truth: `Intl.DateTimeFormat` with the user's locale. Never hand-build.
- Where you must write a date in English copy: **"14 Nov 2026"** (day, short month, year; no comma, no ordinal) or **"Nov 14, 2026"** (US). One style per product. Month in full when space allows ("14 November 2026"); abbreviate only in tight tables.
- Never numeric-only dates in prose ("04/05/26" means two dates). In a field hint, show an example in the locale's order.
- Times: "5:30 pm" or "17:30", chosen by locale (`timeStyle: 'short'`). Spell out "noon" and "midnight". Use "11:59 pm" for unambiguous deadlines. Add the **time zone** when people may be elsewhere ("5:30 pm GMT").
- Date ranges: "14–16 Nov 2026", or "14 Nov to 2 Dec 2026". Use `formatRange`.
- Relative times: "5 minutes ago", "yesterday", "in 2 hours" via `RelativeTimeFormat`. Switch to an absolute date after about a week. Keep the exact value in `<time datetime>` and a `title`.
- Durations: "2 min 30 s" or "2:30". Say "about" when approximate.
- Say "today", "tomorrow" only if the user's clock decides it. Do not say "this Friday" in an email that may be read next week; give the date.

## 4. Money and units

- Currency symbol or code **with** the amount, formatted by `Intl.NumberFormat`: "$12", "€1,234.50". No decimals when the amount is whole and decimals are noise ("$12" not "$12.00" in marketing; prices tables stay consistent: all with decimals or none).
- State the period and basis: "$12 per editor a month, billed yearly". State tax: "incl. VAT" or "plus tax".
- Say the currency when symbols are ambiguous ("USD 12", "CA$12").
- Use "per" or "a" consistently ("a month" or "per month"). Do not use "/mo" in body text.
- Units: number, **non-breaking space**, unit symbol ("50 kg", "2 MB", "21 °C" with the space; "21°C" is acceptable if one style is used everywhere). SI symbols have no full stop and no plural "s" ("5 km", not "5 kms"). Spell the unit out in prose when the reader is not technical ("2 megabytes").
- Use the user's system: do not show miles to a metric user. Convert in code; format with `style: 'unit'`.
- File sizes: "2.4 MB" (base 1000) or "2.4 MiB"; pick one and match the OS people use.

## 5. Abbreviations

- Spell out on first use, then abbreviate: "single sign-on (SSO)". Do not abbreviate a word just to fit; widen the layout or shorten the sentence.
- Avoid "e.g.", "i.e.", "etc.", "vs", "ASAP", "FYI", "N/A", "Qty", "Acct". Write "for example", "that is", "and so on" (or end the list), "versus", "as soon as possible", "not available".
- Screen readers read "etc." and "e.g." oddly; translators lose them.
- Acronyms in capitals without full stops (PDF, URL, API). Pronounced as a word? Still capitals if short (NASA); never "Url".
- Common technical acronyms people know (PDF, URL, USB, ID) need no spelling out; a team's internal acronyms always do.
- Do not invent abbreviations for a product's own concepts.
- Time and weekday abbreviations: use `Intl`; do not type "Mon", "Tue", "Jan".

## 6. Contractions

- Consumer and workplace products: **use contractions** ("can't", "we'll", "you're") for a natural voice. They are not rude and they read faster.
- Government, health, finance, legal, safety and anything translated mainly by machine: write "cannot", "do not", "will not" in full. Negative contractions are easy to misread ("can" vs "can't") on a quick scan.
- Never mix styles on one screen. Pick by voice.
- Do not contract a noun and verb ("The server's down" is fine; "The invoice'll be sent" is not).
- Use the typographic apostrophe `’` ("can’t"). (See typography.)

## 7. Voice, person, active voice

- **Second person**: "your projects", "You can add members". The product speaks as **"we"** only when a team is responsible ("We couldn't save"). Not "I", not "the system", not "Acme" about itself.
- **One of "my" or "your" per screen** for the same thing; menus and account labels: "Your account" or "Account", not "My account" in one place and "Your account" in another.
- **Active voice**: "We sent your invoice", not "Your invoice has been sent". Passive is fine when the actor is unknown or unimportant ("Your session expired").
- **Present tense** for states, **past** for completed actions in confirmations ("Saved"), **imperative** for instructions ("Enter your email").
- **Positive framing**: "Use 8 or more characters", not "Passwords under 8 characters are not allowed".
- **Specific over general**: numbers, names, dates. "3 files" beats "some files".
- **One idea per sentence; 20 words or fewer; 2-3 sentences per message.**
- **Front-load**: put the key word first in headings, links, buttons, list items, notifications.
- Do not narrate the interface ("In this section you can…"). Say the thing.
- Do not refer to the UI by position or color ("below", "to the right", "green button"); name it ("Select Save changes").

## 8. Plain language and reading age

- Target **reading age about 12** (US grade 7 to 8; a reading ease score of 60 or higher) for general products; **age 9 to 11** for public services, health and money. Specialist tools may go higher for expert terms, never for sentence structure.
- Average **15 to 20 words** a sentence, **under 25** always. Words of 1 to 3 syllables.
- Replace: utilize → use; initiate / commence → start; terminate → end; prior to → before; in order to → to; is unable to → can't; subsequently → then; assistance → help; additional → more; approximately → about; purchase → buy; remainder → rest; endeavor → try; regarding → about.
- No jargon without a plain word beside it. Error codes are for logs.
- No stacked nouns ("user account permission settings page"). Add "for" or "of" or restructure.
- Check with a readability tool (Hemingway-style or a Flesch score) for long copy; for UI strings, read aloud.
- Do not write for a screen reader differently: good plain text is accessible text. Keep `aria-label`s short and the same words as the visible label.

## 9. Inclusive language

- Say **"select" or "choose"**, not "click" (touch, keyboard, voice, switch users). "Tap" only on touch-only screens.
- Replace: whitelist/blacklist → allowlist/blocklist; master/slave → primary/replica (or leader/follower); sanity check → check, confidence check; dummy → placeholder, sample; crazy/insane → unexpected, surprising; lame → weak, disappointing; blind spot → gap; tone deaf → unaware; grandfathered → legacy, exempt; guys → everyone, team, folks; man-hours → person-hours, work hours; manpower → staffing; chairman → chair; user "stupid", "idiot" never.
- Describe people by what they do, not their limits: "people who use screen readers", not "the blind". Do not say "suffers from", "confined to", "wheelchair-bound".
- Use **singular "they"**; avoid gendered defaults and examples (all the CEOs "he", all the nurses "she").
- Avoid idioms and culture-bound metaphors (home run, ballpark, slam dunk, "throw under the bus", "low-hanging fruit", food and sport analogies).
- Example names and photos: vary them; do not make only Western names.
- Avoid "just", "simply", "easily", "obviously": they shame people who do not find it simple.
- Do not assume age, ability, family, income, region, device or religion in examples and defaults ("Mother's maiden name", "your husband").

## 10. Hype and filler list

**Remove all of these.** Replace with what the thing does, with a fact. If deleting the word loses nothing, delete it.

| Class | Words and phrases | Instead |
|---|---|---|
| Empty praise | seamless, effortless, frictionless, powerful, robust, sleek, stunning, breathtaking, amazing, awesome, incredible, delightful, beautiful (about your own product), intuitive, magical | Show it working; state what it does |
| Buzzwords | leverage, synergy, holistic, innovative, innovation, transformative, groundbreaking, revolutionary, next-level, cutting-edge, state-of-the-art, world-class, best-in-class, game-changing, mission-critical, turnkey, end-to-end, ecosystem (for a product), paradigm | Name the specific capability |
| Action fluff | elevate, unlock, supercharge, empower, streamline, harness, unleash, reimagine, revolutionize, delve | The plain verb: improve → say how; "lets you" → "you can" |
| Scale and speed claims | lightning-fast, blazing fast, all-in-one, one-stop shop, at your fingertips, "10x" | A number you can source: "loads in 1.2 s" |
| Filler | simply, just, basically, actually, literally, very, really, quite, easily, obviously, of course, "please note that", "in order to", "it is important to note" | Delete |
| Marketing openers | "Welcome to…", "Say goodbye to…", "Whether you're a … or a …", "In today's fast-paced world", "We're excited to…", "Join thousands of…", "Take X to the next level" | Start with the fact or the action |
| Apology and softening | "We're so sorry", "Unfortunately", "Oops", "Whoops", "Uh-oh", "An error has occurred" | What happened and what to do |
| Fake urgency and proof | "Don't miss out", "Limited time", "Trusted by 10,000+", "Best in class", 4.9★ with no source | Real dates, real numbers, or nothing |
| Pompous | utilize, endeavor, commence, facilitate, optimal, ensure (use "make sure") | Use, try, start, help, best, make sure |

Test: could a competitor print this sentence? If yes, replace it with a fact only you have. (This list extends antheo-direction `references/slop.md` item 19.)

## 11. Exclamation marks, emoji, please, sorry

- **Exclamation marks:** at most one per screen, only for a real win ("Your first invoice is paid!"). Never in errors, warnings, buttons, labels or headings. Never two in a row.
- **Emoji:** not as icons or bullets, not in buttons, labels, errors, subject lines of transactional mail. In a consumer voice a single emoji in a celebratory moment is acceptable if it has a text equivalent nearby. Emoji read aloud as long names ("rocket", "sparkles") and render differently by device.
- **"Please":** drop it in instructions ("Enter your email", not "Please enter your email"). Allowed once when asking for a real favour or for something that costs the person effort or trust ("Please keep this tab open while we upload"). Never in every message; never in errors.
- **"Sorry":** only when the product caused harm or real loss, said once, followed immediately by the fix and, if there is one, what you are doing about it ("We lost your draft. We're sorry. It's restored to 2:14 pm."). Never for validation ("Sorry, that's not a valid email") and never "sorry for the inconvenience".
- **"Thanks":** thank people after they have done something for you ("Thanks, we've got your feedback"), not as a filler or as thanks for patience.
- **"Oops", "whoops", "uh-oh":** never. They make a failure sound cute and tell the person nothing.

## 12. Typography in copy

Type the real characters in copy, not the typewriter stand-ins. They are easy to type once you set up a snippet or replace on save. Use the Unicode character in strings and `&…;` entities in HTML if your editor cannot.

- **Curly quotes** “ ” (double) and ‘ ’ (single). The closing single quote is also the **apostrophe** ’. Straight `"` and `'` are a code habit. Use the locale's quotes in other languages (« » in French, „ “ in German, 「 」 in Japanese); the translator supplies them.
- **Ellipsis** `…` (one character, U+2026) for truncation, loading text and menu items that ask for more ("Rename…", "Saving…"). Not three dots. Not for a pause in a sentence in UI copy.
- **En dash** `–` (U+2013): ranges (9–5, 2026–2027, pp. 12–14), connections (Paris–London), and, with spaces, as a pause in British style ("Billing history – Acme").
- **Em dash** `—` (U+2014): not in interface text. Break the sentence with a colon, a comma or a full stop; in UI an em
  dash reads as written by a machine. Long-form prose (articles, docs) may use one, at most two in a paragraph.
- **Hyphen** `-`: only inside compound words and for line breaks (well-known, e-mail). Not for ranges, not for minus, not as a dash.
- **Minus** `−` (U+2212) for negative numbers and subtraction ("−5 °C", "−$12"). The hyphen has no width match with `+`.
- **Multiplication** `×` (U+00D7) for sizes and counts: "1920 × 1080", "3×". Not the letter x.
- **Non-breaking space** U+00A0 (`&nbsp;`) or the narrow no-break space U+202F:
  - between a **number and its unit**: "50 kg", "2 MB", "10 min", "5 pm", "21 °C";
  - between **initials and names**: "J. R. R. Tolkien";
  - after **short words in headlines** so a line never ends on one: "a", "an", "the", "to", "of", "in", "on", "at", "or", "and" up to 2-3 letters: "Same-day repairs for the city" → "for the city" glued; in languages like Czech and Polish this matters most (single-letter words);
  - in **phone numbers**, **currency amounts** ("€ 12"), "Page 3 of 5", "No. 7";
  - before **units of measure** in tables;
  - inside **product names** that must not break ("Pro Max").
- **Thin or narrow spaces** (U+2009, U+202F) around slashes or in tight data, optional.
- **Ordinal and degree signs:** the degree sign `°` (U+00B0), not a superscript "o"; the ordinal indicators come from `selectordinal`.
- **Fractions:** `½` or "1/2"; for UI numbers use a decimal.
- **Trademark and copyright:** `©`, `™`, `®` (U+00A9, U+2122, U+00AE), not (c), (TM), (R).
- **Arrows:** `→` (U+2192) in running UI copy only for a real direction or navigation ("Settings → Billing"), and mirror it in RTL via CSS or text. A `›` chevron in breadcrumbs is an icon, not text.
- **Bullets** `•` or a real list element. Never a hyphen as a bullet.
- **Spaces:** one space after a full stop. No double spaces. No space before `?`, `!`, `:`, `;` in English (French uses a narrow no-break space before them; the translator supplies it). No trailing spaces.
- **Lowercase after a colon** unless a proper noun or a full sentence follows.
- **Math and code:** `<code>` for literals; do not typeset code with curly quotes (the lint skips `<code>` and `<pre>`).

## 13. Substitution table

| Type this | Not this | Code point | HTML |
|---|---|---|---|
| “quoted” | "quoted" | U+201C U+201D | `&ldquo; &rdquo;` |
| ‘quoted’ | 'quoted' | U+2018 U+2019 | `&lsquo; &rsquo;` |
| don’t, Maria’s | don't, Maria's | U+2019 | `&rsquo;` |
| Loading… | Loading... | U+2026 | `&hellip;` |
| 9–5, 2–4 days | 9-5, 2-4 days | U+2013 | `&ndash;` |
| a break — like this | a break - like this, a break -- like this | U+2014 | `&mdash;` |
| −5 °C | -5 °C | U+2212 | `&minus;` |
| 1920 × 1080 | 1920x1080, 1920 x 1080 | U+00D7 | `&times;` |
| 50 kg | 50 kg (breaking space) | U+00A0 | `&nbsp;` |
| 21 °C | 21 ° C, 21oC | U+00B0 | `&deg;` |
| © 2026 Acme | (c) 2026 Acme | U+00A9 | `&copy;` |
| Acme™ | Acme(TM) | U+2122 | `&trade;` |
| Settings → Billing | Settings -> Billing, Settings > Billing | U+2192 | `&rarr;` |
| • item | - item, * item | U+2022 | `&bull;` |
| for example | e.g. | none | none |
| and so on | etc. | none | none |

The linter finds the typewriter forms in visible text (not in `<code>`, `<script>`, `<style>`, attributes other than visible ones, or URLs) and the number–unit breaking space.

## 14. Widows, wrapping and truncation

- **No single word on the last line of a heading or short paragraph (a widow).** Use `text-wrap: balance` for headings and short blocks (up to about 6 lines) and `text-wrap: pretty` for body paragraphs. Where unsupported, add a non-breaking space between the last two words, and keep a heading's last two words together.
- **Do not hand-break lines with `<br>`** in translatable copy. Let the container wrap; use `text-wrap: balance`.
- Line length 45 to 75 characters for body text; 30 to 45 for narrow columns; headlines can be shorter than 12 words.
- **Truncate only data** (file names, user text), never labels or instructions. Truncate in the middle for file names ("report-final…2026.pdf"), at the end for titles; keep the extension visible; give the full text on focus and on hover.
- **No hyphenating** headings (`hyphens: manual`); allow hyphenation in narrow body columns with `hyphens: auto` and the right `lang`.
- Keep a number with its unit, a name with its initials, a heading's first two words with each other when they form a unit ("Step 2").
- Widows and orphans in printed or exported documents: `widows: 2; orphans: 2`.
