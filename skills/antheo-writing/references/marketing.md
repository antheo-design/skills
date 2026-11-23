# Marketing copy

Part of antheo-writing, for the words on a landing, company or product page. Interface strings (buttons, errors,
toasts) keep the rules in SKILL.md; this file adds what a page that sells needs. Every rule there still holds here:
one word per concept, verb-and-object buttons, nothing invented, no em dashes.

Generated marketing copy fails in one way above all: it picks the sentence that would fit any business. The cure is
never a style rule. It is a fact from the brief, put where an adjective wanted to go.

## 1. Collect the facts before writing a sentence

Fill this from the brief, the client's site, their price list and their own words. A blank row stays blank.

| Fact | Example |
|---|---|
| What it is, as a category noun | shift planning for restaurant groups; a bakery; a standing desk |
| Who buys it, or where it is | head chefs and area managers; Elm Row, Edinburgh |
| What it costs and what that includes | £4 per staff member a month, 30 days free |
| How it works, in three verbs | drag a shift, staff swap it, you approve |
| Proof the brief names | a quote with a real name and role; an award with its year |
| One limit | closed Mondays; no payroll, it exports to yours |
| Words the client uses for it | "rota", not "schedule" |

- **Nothing outside the sheet is stated as fact.** No customer count, no rating, no founding year, no testimonial
  the brief does not give. A thin sheet makes a shorter page, not an invented one.
- **An assumption that must stay** (opening hours for a demo, a price to confirm) carries `data-assumed` on its
  element and is listed in the report under "to confirm". antheo-review's page check lists them.
- **A limit is a gift.** One plain admission ("No payroll. It exports to the one you use.") is believed more than any
  claim on the page.

## 2. Write a voice card, three lines

```
Speaker:   who is talking (the company as "we", the founder as "I", the place in the third person)
Reader:    who is listening, and what they already know
Register:  one from section 3, and why it suits this business
```

The client's own writing (an old site, an email, the brief's wording) overrides the card: match it. Then run the
swap test from SKILL.md: with a rival's name in, does it still fit? If it does, add a fact only this business has.
Voice stays the same down the page; tone drops to plain at prices, booking and the questions.

## 3. Registers: choose one, none is the default

| Register | Sounds like | Fits | Breaks when |
|---|---|---|---|
| **Plain record** | "Brennan & Lowe audit charity accounts in Manchester and Liverpool, as they have since 1998." | professional services, B2B, clubs | the record is thin: it reads as an empty CV |
| **Working proof** | "A deploy rolls itself back when the error rate doubles, usually inside 90 seconds." | developer tools, infrastructure, technical products | it turns into a spec list with no problem named |
| **First person maker** | "I was a head chef for nine years. The rota ate my Sunday nights, so I wrote the app I wanted." | small companies, founder-led products, makers | the story is not true or not the founder's |
| **At the counter** | "Take a number at the door. The fitter measures both feet before anything comes out of a box." | cafes, shops, venues, anything bought in person | every section turns sensory: prices and booking stay plain |
| **Straight face** | "Oat milk made in Leeds. It tastes of oats, which we think is the point." | snacks, drinks, small consumer goods, playful apps | the product is serious (money, health, legal) or the joke is at the buyer |

The register changes the sound, never the rules: the h1 still names the category, the button is still a verb and
what the visitor gets.

## 4. What each part of the page does

- **The h1** names the category and, for a name nobody knows yet, who it is for or where: "Shift planning for
  restaurant groups", "Shoe fitting for children in Bath". 2 to 9 words (antheo-build rule 3 caps a headline at nine;
  copy-lint asks about any h1 under three, since short ones are usually slogans). A wordmark may sit above it; a mood, a riddle or
  a command ("Work, rethought", "Come hungry") may not replace it.
- **The line under it** holds one hard fact: a price, a count, a place, a date or a time.
- **The main button** is a verb and what the visitor gets ("Start a 30-day trial", "Book a table"), worded the same
  in the header, the hero and the close, and nowhere else on the page.
- **Section headings** name a thing and say what is true of it: a noun phrase ("Swaps your staff arrange
  themselves"), a verb and its object ("Approve a swap from your phone"), or a plain sentence. "Features" and "Why
  us" say nothing (copy-lint's `label-heading`).
- **Features** show the mechanism in verb-led steps, each with one real detail. Four real features are four items;
  never pad to six.
- **The story** comes from the brief or is left out. A dated, named moment beats a founding template.
- **Proof** is a named outsider, word for word, or nothing. A number sits inside the sentence it proves, with its
  unit and where it comes from.
- **Prices** are written as the business publishes them, with what is included and one true reassurance beside the
  button ("Cancel any time from Settings").
- **Questions** are the ones buyers really ask; each answer starts with the answer ("Yes, up to 12 sites.").
- **The close** is one sentence and the main button again.
- **The footer** is the legal name, a real address if there is one, and this year. No sign-off line.
- **Microcopy** (form errors, the sent message, the 404) is written in the same register, with `references/strings.md`.

## 5. The budget for devices, per page

Each device is fine once. Repeated, it is the shape every generated page has. copy-lint `--marketing` counts them.

| Device | Budget | Instead |
|---|---|---|
| Heading of two short fragments ("One app. Every shift.") | 1 | a noun phrase or a plain sentence |
| Contrast frame: "not X but Y", "rather than", "instead of", "without the" (counted together; the last three only in a short, slogan-like line) | 2 | the positive fact on its own |
| A run of "no X, no Y" | 1, and only when each item can be checked | what the product does |
| A virtue the page claims for itself (honest, thoughtful, passionate, genuinely) | 0 (copy-lint flags each, more firmly past two) | the fact or the admission that shows it |
| A strip of bare figures over one-word labels | only plain facts from the brief (a price, the hours) | each number in its sentence |
| A pun or brand line | 1, never the h1 | the category in the h1, the line under it |
| A joke | in the microcopy, not every section | end each paragraph on information |
| "!" | 1 a page | a full stop |

## 6. What fixing the tells breeds

Banning a habit pushes the writer to its nearest neighbour. Check for the neighbour too.

| After removing | It comes back as | Do this instead |
|---|---|---|
| em dashes | every sentence cut short with a full stop | a colon or a comma where the sentence wants one |
| "not X but Y" | "rather than", "instead of", "without the" | say the positive thing |
| hype words | calm virtue words: quietly, honest, thoughtful | a fact where the adjective was |
| lists of three | everything in pairs | as many items as there really are |
| "be specific" | invented specifics: a batch number, a minute, a percentage | the fact sheet, or a plainer line |
| short, punchy lines | a drumbeat of fragments | let one sentence a section run long |
| "end strong" | a quip after every paragraph | end on information |

## 7. Not tells

Plain "is" and "has". A list of three when there are three things. Title case when it is the client's house style.
One "no card needed" when it is true. A narrow claim the brief can prove ("the only shoe shop in Bath that fits from size 2").
Persuasion on a sales page, as long as it stands on facts. Words the client wrote themselves: keep them, and waive the
finding with the brief as the reason.

## Check

```bash
node <antheo-writing>/scripts/copy-lint.mjs <page or folder> --marketing
```

Fix every high and medium finding or say why it stays. Then read the hero aloud, run the swap test, and check that the
first screen holds the category and one hard fact (antheo-review's page check with `--landing` measures it).
