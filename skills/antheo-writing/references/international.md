# Ready for every language

Use with SKILL.md Step 4. Goal: a translator can translate every string alone, and the layout, sorting, numbers and dates work for any locale without a code change.

Contents: 1 message rules, 2 ICU MessageFormat, 3 plural forms by language, 4 gender and people, 5 text growth, 6 text in images and layout, 7 direction and bidi, 8 sorting and searching, 9 Intl recipes, 10 translator notes and testing.

## 1. Message rules

1. **One message = one whole sentence (or one label).** Never join pieces. Word order, case endings and articles change by language, so the pieces cannot be reordered.

| Bad (breaks in other languages) | Good |
|---|---|
| `"Showing " + shown + " of " + total + " rows"` | `"Showing {shown} of {total} rows"` (word order moves between languages) |
| `` `${n} item(s)` `` | `{count, plural, one {# item} other {# items}}` |
| `"Delete " + name + "?"` | `Delete {name}?` |
| `t('hello') + ', ' + name` | `Hello, {name}` |
| `<p>Posted <b>2 hours</b> ago by Sam</p>` built from three strings | `Posted {time} by {author}` with `{time}` rendered by `Intl.RelativeTimeFormat` |
| a "label" key plus a "suffix" key | one key with the whole text |
| `status ? t('on') : t('off')` glued into a sentence | `{status, select, on {Notifications are on} other {Notifications are off}}` |

2. **Name placeholders with meaning**: `{name}`, `{count}`, `{date}`. Never `{0}` or `%s` (a translator cannot tell what `{1}` is, and cannot swap order of positional ones safely).
3. **Pass formatted values, not words.** Pass the number and let the formatter format it; pass a date object, not "Tuesday". Never pass a word that you inserted (a noun, a verb) into another sentence.
4. **No string reuse across meanings.** "Open" (verb) and "Open" (status), "Post", "Save", "File" need different keys and a translator note.
5. **Links and bold inside a sentence** use rich-text tags in the message, not split strings: `Read our <link>privacy policy</link>.` (FormatJS, Lingui and Fluent support this).
6. **No text built by case changes** (`.toUpperCase()` on a label). Do capitalization in CSS (`text-transform`) only for short labels and never for German `ß`, Turkish `i`, Greek.
7. **No hardcoded punctuation around messages** (`name + ':'`). Some languages put a space before `:` or `?`. Put the colon in the message.
8. **Avoid idioms, puns and metaphors** ("hit the ground running", "ballpark", "bucket list"). They do not translate and read badly in plain English too.
9. **Keep keys semantic**: `invoice.delete.confirm.title`, not `button3`.
10. Set the `lang` attribute on `<html>` and on any inline phrase in another language: `<html lang="de">`, `<span lang="fr">c'est la vie</span>`. It drives hyphenation, fonts, screen-reader voice and quote style.

## 2. ICU MessageFormat

Syntax: `{argument, type, style}`. Types: `plural`, `selectordinal`, `select`, `number`, `date`, `time`. In a plural branch `#` is the formatted number.

**Plural (English: one and other)**

```
{count, plural,
  =0 {No files}
  one {# file}
  other {# files}
}
```
- Always include `other`. Add `=0` for a better zero sentence in English ("No files"); `=0` is an exact match, `zero` is a language category (Arabic, Latvian).
- `one` is **not** "exactly 1" in every language (see section 3). Do not write `=1` unless it must be exactly one.
- The number is formatted for the locale: `1,234` in English and `1.234` in German automatically.

**Whole-sentence plural (preferred; translators reorder freely)**

```
{count, plural,
  one {You have # unread message.}
  other {You have # unread messages.}
}
```

**Two numbers or two plurals: nest.**

```
{files, plural, one {# file} other {# files}} in {folders, plural, one {# folder} other {# folders}}
```
For sentences with two counts, prefer writing the cases out as whole sentences, because some languages inflect the verb for one of the counts.

**Select (gender, status, any enumerated value)**

```
{status, select,
  paid {Invoice paid on {date, date, medium}}
  overdue {Invoice overdue since {date, date, medium}}
  other {Invoice {status}}
}
```
`other` is mandatory.

**Ordinals**

```
{place, selectordinal,
  one {#st place}
  two {#nd place}
  few {#rd place}
  other {#th place}
}
```
English ordinals (1st, 2nd, 3rd, 4th) use one/two/few/other. Other languages differ; the translator rewrites the branches.

**Number, date and time arguments**

```
Total: {price, number, ::currency/EUR}
Completed {ratio, number, ::percent}
Starts {start, date, medium} at {start, time, short}
```
`::currency/EUR` and `::percent` are number skeletons (they map to `Intl.NumberFormat` options).

**Escaping.** `'` begins quoting in ICU. A straight apostrophe before `{` or `}` escapes it: write `'{'` for a literal brace. To avoid trouble, **use the typographic apostrophe `’` in message text** ("don’t"). The linter reports straight apostrophes for this reason too.

**React / JS use (FormatJS example)**

```js
import { IntlProvider, FormattedMessage, useIntl } from 'react-intl';
// messages.en.json
// { "inbox.count": "{count, plural, =0 {Your inbox is empty} one {# unread message} other {# unread messages}}" }
<FormattedMessage id="inbox.count" values={{ count }} />
const intl = useIntl();
intl.formatMessage({ id: 'inbox.count' }, { count });
```
i18next: use `key_one` / `key_other` suffixes (CLDR categories) with `{{count}}`, or the ICU plugin. Lingui: `plural(count, { one: '# file', other: '# files' })`. Fluent: selectors `[one]`, `*[other]`.

**Rich text with a name that changes grammar:** keep the whole sentence in the message and pass the user's content as an isolated value (section 7).

## 3. Plural forms by language (CLDR categories)

CLDR defines up to six categories: `zero`, `one`, `two`, `few`, `many`, `other`. A language uses some of them. Use `Intl.PluralRules(locale).resolvedOptions().pluralCategories` to list them.

| Language | Categories | Rule in short |
|---|---|---|
| English, German, Dutch, Spanish, Italian | one, other | one: 1 (Spanish and Italian also have `many` for millions) |
| French, Portuguese | one, many, other | one: 0 and 1 (French "0 fichier"), many: round millions |
| Japanese, Chinese, Korean, Vietnamese, Thai, Indonesian | other | no plural forms at all |
| Russian, Ukrainian | one, few, many, other | one: 1, 21, 31... (not 11); few: 2-4, 22-24... (not 12-14); many: 0, 5-20, 25-30...; other: decimals |
| Polish | one, few, many, other | one: exactly 1; few: 2-4, 22-24... (not 12-14); many: 0, 5-21, 25-31...; other: decimals |
| Czech, Slovak | one, few, many, other | one: 1; few: 2-4; many: decimals; other: 0, 5+ |
| Arabic | zero, one, two, few, many, other | zero: 0; one: 1; two: 2; few: 3-10; many: 11-99; other: 100-102 and decimals |
| Welsh | zero, one, two, few, many, other | all six |
| Hebrew | one, two, other (many in some versions) | one: 1; two: 2 |

Example Russian translation of `{count} files` (the translator supplies four branches; you supply the one English source with `one` and `other`):

```
{count, plural,
  one {# файл}
  few {# файла}
  many {# файлов}
  other {# файла}
}
```
**Rule for you:** write the English source with `one` and `other`; **never assume English has defined all forms**; keep the translator free to add categories; **never compute plurals in code** (`n === 1 ? '' : 's'`).

## 4. Gender and people

- **Avoid gendered wording.** Rewrite to remove it: "Your profile is ready" not "He has joined"; "Joined 3 May" not "She joined".
- Never infer gender from a name or a photo. Do not ask for gender unless the product needs it; if asked, allow free text or "Prefer not to say".
- Where a translation must agree with a person's gender (many languages inflect adjectives and verbs), use `select` with an `other` branch:

```
{gender, select,
  female {{name} updated her profile}
  male {{name} updated his profile}
  other {{name} updated their profile}
}
```
- Singular "they" is fine in English. Do not write "he/she" or "s/he".
- **Names:** use one "Full name" field (and "What should we call you?" if you need a short one). Do not force first/last (many cultures have one name, or family name first). Do not require a title. Do not assume names are ASCII, short, or unique. Allow 100+ characters.
- **Addresses and phones:** do not force a state or postcode where the country has none; show fields by country; accept `+` and spaces in phones.
- **Form of address** (formal vs informal "you" in German, French, Spanish, Japanese): choose once per product in the voice definition, and tell translators.

## 5. Room for text growth

Translated strings are often longer than English. The room to leave is owned by **antheo-layout**
(`references/languages.md`); in short, plan for each English string to grow by:

| English length | Extra room (on top of the English length) |
|---|---|
| up to 10 characters | 100 to 200% (a 6-letter label may become 12 to 18) |
| 11 to 20 | about 80% |
| 21 to 70 | 40 to 60% |
| over 70 | about 30% |

- German and Finnish often run long; Chinese, Japanese and Korean run short in width but taller in line height; Arabic and Hebrew need the same room but mirrored.
- **Rules:** buttons and tabs wrap or grow, they do not clip. No fixed widths on text containers; use `min-width`, `max-width`, `flex-wrap`, `overflow-wrap: anywhere`. Do not truncate labels with an ellipsis as a plan; truncate only user data, and give the full text on focus or in a title.
- Short labels (one word) get the largest growth: "Back" (4) can become "Zurück" (6), "Retour", "Назад".
- Avoid layouts that depend on a string being the same length as its neighbor.
- **Test with pseudo-localization**: wrap each string like `[!! Ĥéļļö ŵöŕļð ··· !!]`, 40% longer for sentences and 100% longer for short labels (what `check-page.mjs --stress` does), plus a long German string and a CJK string. Check wrapping, clipping, overlap.
- Use `lang`-aware hyphenation: `hyphens: auto` with a correct `lang`.
- Line height 1.5 or more for body text; CJK and Indic scripts need extra height.
- Do not letter-space Arabic, Devanagari or other connected scripts; do not italicize CJK for emphasis.
- Specify a font stack with fallbacks that cover the scripts you ship (`system-ui` plus `Noto Sans` fallbacks), and `font-synthesis: none` if needed.

## 6. No text in images; other asset rules

- Never put words in a raster image, an SVG outline, or a video frame without a text equivalent. Headings, labels, button text, charts' axis labels, screenshots with words are all text: HTML, with CSS for style.
- If a screenshot must show UI words, mark it as an illustration, give a text alternative, and plan a localized version.
- Icons, symbols and gestures that carry meaning vary: a mailbox, an owl, a thumbs-up, hand shapes, the color red or white. Pair icons with text.
- Flags are not languages. Use the language's own name ("Deutsch", "日本語") from `Intl.DisplayNames` or a fixed list.
- Currency and units come from the user's region, not their language.
- Audio and video need captions and transcripts in each language.
- Sample content and placeholders need localizing too ("name@example.com" is fine; "Maria Lopez" may not be).

## 7. Direction and bidirectional text

- **Use logical CSS** so layouts flip with `dir="rtl"`: `margin-inline-start`, `padding-inline-end`, `text-align: start`, `inset-inline-start`, `border-start-start-radius`, `float: inline-start`. Avoid `left` and `right` in layout.
- Set `dir` on `<html>` from the locale (`ar`, `he`, `fa`, `ur` are right-to-left).
- **Direction-neutral wording:** "start" and "end", "next" and "previous", "above" and "below" only when the layout never reorders. Never "the button on the right", "left menu".
- **Mirror** icons that point in reading direction (back and forward arrows, chevrons in lists, progress, undo/redo, "reply" arrows, text-indent). **Do not mirror** icons for real-world objects, clocks, media play/pause (play points right everywhere in controls), check marks, plus/minus, brand logos, charts with time on the x-axis in most contexts, numerals.
- **User content inside a sentence needs isolation.** A name or title in another script can reorder the surrounding punctuation:

```html
<!-- bad: the Arabic name drags the full stop and number around -->
<p>Comment by Ahmed, مريم 3 replies</p>

<!-- good: each user value is isolated -->
<p>Comment by <bdi>مريم</bdi>, 3 replies</p>
<p dir="auto">…user-written text block…</p>
<input dir="auto">
<span dir="ltr">name@example.com</span>   <!-- emails, URLs, code stay left-to-right -->
```
- `<bdi>` isolates and picks direction from content (use for any inserted name, title, comment author). `dir="auto"` does the same for a block or an input. CSS: `unicode-bidi: isolate` (or `plaintext` for user text blocks).
- In plain strings (notifications, email subjects, `title`, `aria-label`, logs) where HTML is not available, wrap the value in Unicode isolates: **U+2068 (FSI)** before and **U+2069 (PDI)** after. `⁨${name}⁩`. ICU and Intl-aware libraries can do this for you.
- Numbers stay left-to-right inside right-to-left text; `Intl.NumberFormat('ar-EG')` may use Arabic-Indic digits, which is correct for that locale. Do not force Western digits unless the user chose them.
- Use `LRM` (U+200E) or `RLM` (U+200F) only to fix a trailing punctuation edge case, never as layout.
- Test with a right-to-left locale and with a mixed string (Latin name inside Arabic sentence and the reverse).

## 8. Sorting, searching and comparing text

- **Never use `Array.sort()` or `<` / `localeCompare` without a locale for human-visible lists.** Default code-unit order puts "Z" before "a" and "É" after "Z".

```js
const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
names.sort(collator.compare);        // "file2" before "file10"; é sorts with e
```
- `numeric: true` sorts "item 2" before "item 10". `sensitivity: 'base'` ignores case and accents (use for search); `'accent'` keeps accents; `caseFirst: 'upper'` is optional.
- Swedish sorts "ä" after "z"; German sorts it with "a". Let the collator decide.
- **Search and match**: normalize with `str.normalize('NFC')` (or NFD to strip accents with a regex) and compare with the collator at `base` sensitivity. Lowercase with `toLocaleLowerCase(locale)` (Turkish `I` ↔ `ı`).
- **Counting and truncating characters**: use `Intl.Segmenter` for grapheme clusters, not `.length` (emoji, combining marks, Indic scripts):

```js
const seg = new Intl.Segmenter(locale, { granularity: 'grapheme' });
const count = [...seg.segment(text)].length;
const words = new Intl.Segmenter(locale, { granularity: 'word' });
const wordCount = [...words.segment(text)].filter(s => s.isWordLike).length; // CJK has no spaces
```
- Do not set a character limit based on `.length`; say the limit in characters people see.
- Group headers in an A-Z index depend on the language's alphabet; derive the letters from the collator or use a library.

## 9. Intl recipes (copy-ready)

Get the locale once; let the user change it. Do not hardcode `'en-US'`.

```js
const locale = userSettings.locale ?? navigator.language;   // e.g. 'de-DE'
```
Cache formatters (creating one is slow); reuse them.

**Numbers**
```js
new Intl.NumberFormat(locale).format(1234567.891);             // 1,234,567.891 | 1.234.567,891
new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(3.14159); // 3.1
new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(5);       // 5.00
new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' }).format(12);     // +12
```
**Currency** (amount and currency code are separate facts: the currency comes from the product, not the locale)
```js
const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
money.format(1234.5);       // €1,234.50 | 1.234,50 € (de) | ¥ has no decimals for JPY automatically
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }); // USD 12.00 when symbols are ambiguous ($ in CA, AU, MX)
new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(12); // $12
```
Store money as integer minor units, or a decimal string; divide only for display. Do not use `toFixed` for display money.

**Percent**
```js
new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(0.256); // 25.6%  (note: pass 0.256, not 25.6)
```
**Compact**
```js
new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' }).format(1_250_000); // 1.3M | 125万 (ja)
new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(12345);   // 12.3K
```
**Units**
```js
new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilometer-per-hour', unitDisplay: 'short' }).format(50); // 50 km/h
new Intl.NumberFormat(locale, { style: 'unit', unit: 'celsius' }).format(21);        // 21°C
new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', unitDisplay: 'narrow' }).format(2);  // 2MB
```
Supported units include length (meter, kilometer, mile, foot, inch), mass (kilogram, gram, pound), volume (liter, gallon), temperature, speed, percent, duration (second, minute, hour, day), digital (byte, kilobyte, megabyte, gigabyte). Converting miles to kilometers is your job; `Intl` only formats.

**Dates and times**
```js
const d = new Date('2026-11-14T15:30:00Z');
new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);              // Nov 14, 2026 | 14 Nov 2026 (en-GB) | 14.11.2026 (de)
new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(d);                // Saturday, November 14, 2026
new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(d);               // 3:30 PM | 15:30  (picks 12/24 hour)
new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d);
new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZoneName: 'short' }).format(d); // 3:30 PM GMT+1
new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);   // November 2026
new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);                 // Sat
new Intl.DateTimeFormat(locale).formatRange(start, end);                          // Nov 14 to 16, 2026
```
- Show the **time zone** when readers may be elsewhere. Format in the user's zone by default; store UTC.
- Date-only values (a birthday, a due date) parse as local dates, not UTC midnight, or they shift a day: build `new Date(y, m - 1, d)`.
- Never print `MM/DD/YYYY` or `DD/MM/YYYY` by hand. If a text field needs a typed format, show an example from `formatToParts`.
- Week start varies (`new Intl.Locale(locale).getWeekInfo?.().firstDay` where supported; else a library).
- Calendars vary (`-u-ca-islamic`, `-u-ca-japanese`); pass through, do not assume Gregorian.

**Relative time**
```js
const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
rtf.format(-1, 'day');   // yesterday
rtf.format(2, 'hour');   // in 2 hours
rtf.format(-3, 'minute');// 3 minutes ago

function ago(date, now = Date.now()) {
  const diff = (date - now) / 1000;                       // seconds
  const steps = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, secs] of steps) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return rtf.format(Math.round(diff), 'second');
}
```
Use relative time for recent events (under about a week); switch to an absolute date after, and keep the full timestamp in a `title` or `<time datetime>` for hover and screen readers. Update live values sparingly (every minute).

**Lists**
```js
new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(['Ana', 'Ben', 'Chi']); // Ana, Ben, and Chi | Ana, Ben und Chi
new Intl.ListFormat(locale, { type: 'disjunction' }).format(['PNG', 'JPG', 'SVG']);                // PNG, JPG, or SVG
new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(['5 ft', '10 in']);          // 5 ft 10 in
```
Never `arr.join(', ') + ' and ' + last`. The Oxford comma, the word for "and" and the spacing are the locale's.

**Plural and ordinal categories**
```js
const pr = new Intl.PluralRules(locale);
pr.select(1);   // 'one'     (ru: select(2) -> 'few')
const ord = new Intl.PluralRules('en', { type: 'ordinal' }); ord.select(22); // 'two'
```
Use it only to choose among already-translated messages; prefer ICU plurals.

**Display names**
```js
new Intl.DisplayNames(locale, { type: 'region' }).of('JP');     // Japan | Japon | 日本
new Intl.DisplayNames(locale, { type: 'language' }).of('pt-BR');// Brazilian Portuguese
new Intl.DisplayNames(locale, { type: 'currency' }).of('EUR');  // Euro
```
Use for country, language and currency pickers; sort the results with `Intl.Collator`.

**Durations.** `Intl.DurationFormat` exists in current browsers; check support, with a fallback that builds each part with `Intl.NumberFormat` (`unit: 'minute'`, `unit: 'second'`, `minimumIntegerDigits: 2`) and pass the parts to `Intl.ListFormat(locale, {type:'unit'})`.

**Tabular numerals.** Use `font-variant-numeric: tabular-nums` for columns and live counters so numbers align and do not jitter.

## 10. Translator notes and testing

- Give every string a short **note**: where it shows, who reads it, what the variables are, character limit. Example: `"Short label on a 90px button. {count} is a number of files."`
- Provide a glossary (from Step 0) and the voice traits to translators.
- Extract strings with a tool; fail the build on missing keys; keep the source language as the fallback.
- Do **pseudo-locale**, **long-string (German)**, **CJK** and **RTL** passes before release (see section 5 and 7).
- Check every date, number, currency, list, plural and sort in at least: `en-US`, `en-GB`, `de-DE`, `fr-FR`, `ja-JP`, `ar-EG`, `ru-RU`.
- Run `scripts/copy-lint.mjs` for concatenation, hand-built plurals, hand-formatted numbers and dates, and hardcoded locales.
