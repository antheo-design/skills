# Every string type: rules, limits, before and after

Use with SKILL.md. Each entry: **rules**, **limit**, then pairs. "Limit" means characters unless it says words. Write for the person's next move, then cut.

Contents: page titles, headings, buttons and links, field labels, placeholders, help text, inline errors, error summary, empty states, loading, success and toasts, confirmations, destructive actions, permissions and limits, notifications and emails, onboarding and tooltips, settings switches, pricing, legal and consent, 404 and 500, marketing headlines.

## 1. Page titles (`<title>`)

- Put the page's own name first, the product last: "Billing history · Acme". Screen readers and browser tabs read the start.
- Sentence case, no full stop, no emoji. **65 characters or fewer.**
- Unique per page and per step ("Step 2 of 4: Delivery · Acme").
- On an error page, the title says so: "Page not found · Acme".

| Before | After |
|---|---|
| Acme | Billing history · Acme |
| Welcome! \| Home \| Acme Dashboard Platform | Dashboard · Acme |
| Error | Payment failed · Acme |

## 2. Headings

Two kinds. **Pick the right one.**

- **Labels** name what is below. Use them in apps, settings, docs: "Billing", "Team members", "API keys". 1-4 words.
- **Claims** say something true and specific. Use them on marketing and product pages: "Most repairs are back by Friday". 4-12 words, **70 characters or fewer** for an h1.
- Never a label ("Features", "How it works", "Why choose us") as a marketing heading: it says nothing. Never a claim as an app heading.
- One h1 per page. Do not skip levels. A heading is not a button or a link.
- No full stop on label headings. A claim written as a sentence may keep its full stop; be consistent on a page.
- Front-load: "Invoices overdue (3)", not "You currently have 3 overdue invoices".

| Before | After |
|---|---|
| Features | Book, track and pay from one page |
| Why choose us | We fix the bike you have, not the one we'd like to sell |
| Our Powerful Solution | Same-day repairs for city bikes |
| Welcome to your dashboard! | Today |

## 3. Buttons and links

**Buttons (actions).**
- **Verb + object**, naming the outcome: "Save changes", "Send invoice", "Add member". Drop the object only when it is obvious ("Save", "Cancel", "Close", "Done").
- **1-3 words, 25 characters.** Sentence case. No end punctuation. No "!".
- One primary button per region; the primary names the main job.
- Never "Submit", "OK", "Yes", "No", "Confirm", "Go", "Click here", "Learn more", "Continue" when the next step is specific.
- Menu items that open a dialog for more input end with "…": "Rename…".
- Loading state keeps the verb in progress: "Saving…", "Sending…".
- Icon-only buttons need an accessible name that is a verb + object: "Delete row".
- A button that begins a flow names the flow: "Start a free trial", "Book a repair".

**Links (places).**
- **Link text makes sense alone** (screen readers list links out of context). It names the destination or the document: "Read the refund policy", "Billing history".
- 2-6 words; front-load; no "click here", "here", "this link", "read more", "more", "link".
- Do not use a URL as link text in prose; do not end a sentence's meaning on the link ("for details click here").
- Same destination, same text. Different destinations, different text.
- Say what a link opens when it is not a page: "Download the invoice (PDF, 120 KB)", "Opens in a new tab" where the behavior is surprising.
- Use a link to go somewhere, a button to do something. A link that changes data is a button.

| Before | After |
|---|---|
| Submit | Send invoice |
| OK | Got it (only for a pure notice), otherwise the action: "Update plan" |
| Yes / No | Delete file / Keep file |
| Learn more | See how billing works |
| Click here to download | Download the invoice (PDF) |
| For pricing, click here | Read about pricing |
| Get Started Now! | Start a free trial |
| Continue | Pay $42.00 |

## 4. Field labels

- A visible label above or beside every field. A noun or short noun phrase, **1-4 words**: "Email address", "Card number", "Delivery date".
- Not a question, not a sentence, not an instruction in the label ("Enter your name here"). Instructions go in help text.
- Mark the minority: write "(optional)" on optional fields when most are required; if most are optional, mark required ones. Do not use only an asterisk without a legend.
- Group related fields with a legend ("Delivery address"). Radios and checkboxes: the legend is a question or noun; each option is a short phrase.
- Ask only what you will use. Name the thing people know ("Full name", not "Name (as on passport, no titles)" unless needed).
- One label word per concept (vocabulary table). Do not rename a field in its error message.

| Before | After |
|---|---|
| Enter your email: | Email address |
| What is your date of birth?? | Date of birth |
| First Name * | First name |
| Fill in your phone | Phone number (optional) |

## 5. Placeholders

- **An example only**, never a label or instruction: "name@example.com", "Design review", "12 Oak Street".
- Placeholder text disappears and fails contrast; the field must work without it.
- Do not repeat the label. Do not write "Enter…", "Type…", "Your…".
- Search boxes may say what can be searched: "Search invoices". The accessible name is still set.

| Before | After |
|---|---|
| Email (placeholder only) | Label "Email address", placeholder "name@example.com" |
| Enter your password | (no placeholder) |
| First name | Label "First name", placeholder "Maria" |

## 6. Help text (hints)

- **1 line, 90 characters or fewer**, below the label, above the input. States format, limit, or why you ask.
- Say what to enter, in what format, with a concrete example when format is strict: "Use 8 or more characters, with a number."
- Say why for sensitive asks: "We use this to send your receipt."
- Show the rule up front; do not wait for the error.
- Not a paragraph; link to a page if it needs one.

| Before | After |
|---|---|
| Password must meet the following security requirements: ... | Use 8 or more characters, with a number. |
| Phone | We only call about your delivery. |

## 7. Inline validation and errors

**Pattern: what happened. How to fix it.** Put it next to the field, after the label and hint. Same words as the summary.

Rules:
1. **Empty field = an instruction:** "Enter your full name". Not "This field is required".
2. **Too long, short or wrong format = a description plus the need:** "Business name must be 50 characters or fewer". "Card number is 15 digits long. Check the number on the front of your card."
3. **Echo the label's words:** label "Date of birth" gives "Enter your date of birth", not "Enter a valid DOB".
4. **No blame:** avoid "invalid", "illegal", "forbidden", "wrong", "incorrect", "you forgot", "you failed". The system is responsible.
5. **No code alone.** Codes may follow for support ("Reference E-4102"), never lead.
6. **No "please", "sorry", "oops", exclamation marks, jokes.**
7. **Keep the person's input.** Never clear a field because it failed.
8. **Do not show an error before it is one.** Validate on blur or submit, not while they are still typing. Exception: password strength and character counters help live.
9. **Do not rely on color.** Icon + text + `aria-invalid` + `aria-describedby`; announce (live region or focus).
10. Offer a fix when you can: "Did you mean name@gmail.com?" "Send a new code".
11. **Usually 2 sentences, about 120 characters.** A message whose reason the person must act on (a payment declined
    by the bank, a file rejected for a stated rule) may run longer; anything more than that links to a page.
12. Use an error message only for input problems. For "you can't", "the service is down", write a page or banner.

| Before | After |
|---|---|
| Invalid email | Enter an email like name@example.com |
| Error 500 | We couldn't save your changes. Try again in a moment. |
| Password must meet requirements | Use 8 or more characters, including a number |
| You entered the wrong code | That code doesn't match. Check the latest email from us, or send a new code. |
| Required | Enter your postcode |
| Invalid date | Enter a date like 14 11 2026 |
| Username taken! | Someone already uses that name. Try "maria.k" or "maria.k2". |
| Name too long | Name must be 50 characters or fewer (you've used 63) |

## 8. Form-level error summary

- When submit finds problems, show a summary **at the top**, move focus to it, and give it a title: "There is a problem" (GOV.UK) or "Fix 3 things to continue".
- List every error as a link to its field. The link text is the **same wording** as the inline error.
- Keep the order of the form. Count if more than 3.
- Don't scold the form; the page `<title>` also starts with "Error:" until fixed.
- Summary is an alert region (`role="alert"` or focused heading); not a toast.

```
Fix 3 things to continue
  Enter your full name            -> links to Full name
  Enter an email like name@example.com
  Choose a delivery date
```

## 9. Empty states

Never leave a blank. Three different cases, three different texts. **Heading (what this is), one line (why or what goes here), one action.** Heading 2-6 words; line 90 characters or fewer.

| Case | Job | Before | After |
|---|---|---|---|
| **First use** | teach and invite | No data | **No invoices yet.** Invoices you send show up here. [Create invoice] |
| **No results** | help recover | No results found | **No people match "jon" in Design.** Check the spelling or clear the filters. [Clear filters] |
| **Cleared / done** | confirm lightly | Nothing here! | **You're all caught up.** New requests will appear here. |
| **Error loading** | not an empty state | (blank) | **We couldn't load your invoices.** Check your connection. [Try again] |

- Echo the user's search term in quotes (curly) so they see what was searched.
- Offer one primary action; a secondary link is optional.
- Never show "No results" while loading; show the loader until the answer is known.
- Sample data or a "Load example" action is valid for a tool that is hard to judge empty.

## 10. Loading text

- Show activity after about 1 second; show progress (and Cancel) after about 10 seconds.
- Say what is happening, in the present participle, 3-6 words: "Uploading 3 files…", "Loading your invoices…".
- Give a time when you know it: "Generating your report. About 20 seconds."
- Use the real ellipsis `…`; no "Please wait".
- Do not show "Loading…" for under 300 ms; show nothing.
- A skeleton or spinner needs an accessible status ("Loading invoices", `aria-busy`, a live region).

## 11. Success messages and toasts

- **Past tense, specific, short.** **1 sentence, 60 characters or fewer.** "Invoice sent", "3 files uploaded", "Profile saved".
- **A button's three labels share one verb:** at rest the action, while working the -ing form, when done the past
  tense: "Save" → "Saving…" → "Saved", "Create project" → "Creating…" → "Created", "Send invite" → "Sending…" →
  "Sent". Never a generic "Done" or a "Saved" on a button that creates or sends.
- Include **Undo** or a **next step** when one exists: "Project deleted. Undo", "Message sent. View it".
- No "successfully", no "!" (unless a true milestone: "Your first invoice is paid."), no emoji.
- Toast duration at least 5 seconds; longer if it has an action; **never auto-dismiss an error or one that needs a decision.** Pausable on hover and focus. Announce politely (`role="status"`).
- Do not toast what the screen already shows (a new row appearing).
- Do not stack more than 3.

| Before | After |
|---|---|
| Your changes have been successfully saved! | Saved |
| Success! | Invoice sent to maria@example.com |
| Operation completed | 12 contacts imported. View them |

## 12. Confirmations

- **Prefer Undo over a confirmation** when the action can be reversed. Confirm only for irreversible, costly or far-reaching acts, or people stop reading.
- **The title names the thing and the action**: "Archive Spring launch?", never a bare "Are you sure?".
- **Body states the consequence in one or two sentences:** "This deletes the plan and its 12 tasks for everyone. This can't be undone."
- **Buttons are verbs and the escape**, never Yes/No: "Delete plan" and "Keep plan" (or "Cancel"). Destructive button last or in the danger style, not pre-selected as default.
- Primary focus goes to the safe choice for dangerous acts.
- Optional "Don't ask again" only for routine, reversible-in-practice acts.
- Body 1-2 sentences, title 60 characters or fewer.

| Before | After |
|---|---|
| Are you sure you want to proceed? [Yes] [No] | Send invoice to Maria Lopez? She'll get an email now. [Send invoice] [Cancel] |
| Discard? [OK] [Cancel] | Discard this draft? You'll lose 3 unsaved changes. [Discard draft] [Keep editing] |

## 13. Destructive and irreversible actions

1. Name the object and the scope: who loses what.
2. Say if it can be undone and for how long: "You can restore it for 30 days."
3. For very rare, severe acts (delete an account, a repository, production data), **make people type the name** of the thing, and keep the destructive button pressable: until the name matches, pressing it says what to type, in the field's error line.
4. Button label is the verb + object ("Delete account"), in danger style. Cancel is the default focus.
5. After success, confirm with Undo if possible; if not, say what is gone.
6. Prefer archive over delete when history matters.

```
Delete the "Acme" workspace?
This permanently deletes 4 projects and 212 files for all 9 members. This can't be undone.
Type Acme to confirm.   [ Acme            ]
[Delete workspace]  [Keep workspace]
```

## 14. Permissions and limits

Pattern: **"You can't [do X] because [Y]. [Do Z]."** Always say who can fix it.

- Say why, in the person's terms (role, plan, state), not the system's ("permission denied", "403").
- Give the way forward: ask an owner, upgrade, wait, choose another.
- Name the people: "Ask an owner (Maria Lopez, Sam Ito)".
- Limits: show the limit and the use before it blocks: "8 of 10 members used".
- Do not use a locked icon alone; the text must say it.
- Disabled buttons need a nearby reason (visible text), because a hover title is not enough.

| Before | After |
|---|---|
| Permission denied | You can't delete invoices because you're a viewer. Ask an owner to change your role. |
| Limit reached | You've used all 10 members on the Free plan. Remove one or upgrade to add more. |
| Forbidden | This project is private. Ask Maria Lopez to invite you. |
| Upgrade required | Exporting to PDF is on the Team plan. See plans. |

## 15. Notifications and email subject lines

**In-app and push**
- Lead with who and what: "Maria commented on Spring launch". 1 line, **90 characters**; push title 40, body 90.
- A notification says what changed and offers the place to act. No "Hey!", no emoji for decoration.
- Group repeats ("3 new comments on Spring launch").
- Respect the user's settings; every type can be switched off.

**Email subject lines**
- **50 characters or fewer** (about 35 on phones show fully). Front-load the news. Plain, specific.
- Transactional: say the thing: "Your receipt from Acme (#1042)", "Reset your Acme password".
- No ALL CAPS, no "!!!", no "Re:" tricks, no clickbait.
- The preview text (preheader) adds a fact, 40-90 characters; do not repeat the subject.
- Body: the first sentence repeats the point. One main action, as a real button with a verb.
- Sender name is a person or the product, not "no-reply".
- Link text and body follow all button/link rules. Plain-text version exists.

| Before | After |
|---|---|
| You have a new notification | Maria commented on Spring launch |
| 🔥 Don't miss out!!! Our biggest sale EVER | 20% off bike repairs until Sunday |
| Action required | Confirm your email to finish signing up |
| Your account | Your Acme password was changed |

## 16. Onboarding and tooltips

**Onboarding**
- Teach by doing. One idea per step, **one sentence of 120 characters or fewer** plus one action.
- Show steps ("Step 2 of 4"); allow skip; never block the product behind a tour.
- Say the benefit in the task's words: "Add your first client so you can send an invoice."
- First-run empty states do the teaching; tooltips and coach marks are the last resort.
- Do not welcome with a paragraph. The first screen asks the one question that matters.

**Tooltips**
- **Short: 1 line, about 60 characters.** Names or explains an icon or a term. Not a place for essential information (touch and keyboard users miss it); important facts go in help text.
- Appear on hover and focus, dismissible, and not a replacement for a label.
- Sentence case; a full stop only if it is a sentence; never a link inside (use a popover).

| Before | After |
|---|---|
| Welcome to Acme! We're so excited to have you on board! Let's take a quick tour of all the amazing features. | Add your first client. You'll use them to send invoices. [Add client] [Skip] |
| Click to edit | Edit title |

## 17. Settings and switch labels

- **The label describes the ON state**, as a statement the person can agree with: "Email me when someone mentions me". Not "Email notifications: off", not "Mentions".
- A switch takes effect immediately and says so with a status change; if it needs a save, use a checkbox and a Save button.
- Help text (one line) says what happens when on, or the consequence: "We'll send at most one email an hour."
- Group settings with a heading noun; avoid double negatives ("Do not disable…").
- When a state is written out (in a summary or a table), use one pair of words everywhere (On/Off), not Enable/Disable in one place and Yes/No in another. Beside a switch, write nothing: the switch shows its state.
- Dangerous settings explain consequence before the toggle changes.

| Before | After |
|---|---|
| Notifications | Email me when someone mentions me |
| Disable auto-save: No | Save changes automatically |
| Dark mode toggle | Use dark colors (follows your device by default) |

## 18. Pricing copy

- Show the real price: amount, currency, period, what's billed. "$12 per editor a month, billed yearly ($144)".
- Plan names are nouns of the product's world, not "Basic, Pro, Premium" by default.
- Every plan line is a fact: "10 projects", "Priority support within 4 hours". No "unlimited" unless it is.
- Say what is not included when people would assume it is.
- Currency and numbers by `Intl.NumberFormat`; taxes included or excluded stated.
- The CTA says what happens: "Start 14-day trial" (and "No card needed" only if true).
- Free trial: state the end date and the price after: "Free until 28 Nov, then $12 a month."
- Cancel terms in plain words near the button.
- Do not use "Most popular" without data; do not invent counts.

| Before | After |
|---|---|
| Unlock Premium features | Team: $12 per editor a month, billed yearly |
| Unlimited everything | 500 projects, 100 GB of files |
| Get started | Start a 14-day free trial |

## 19. Legal and consent text in plain words

- Write what is true for this person: what you collect, why, who sees it, how to stop. **Reading age about 12.**
- Consent must be **specific, unticked, and separate** (no pre-ticked boxes, no bundling). The label describes the use: "Send me the monthly newsletter (you can unsubscribe at any time)".
- Terms and privacy links name the document: "Privacy policy", "Terms of service". Do not say "I agree to everything".
- Button labels match: "Create account" (and "By creating an account you agree to the Terms and Privacy policy" under it, if that is your legal basis).
- Put a short plain summary above the long legal text; keep the long text accurate and findable.
- Dates of effect and last changes visible: "Updated 14 Nov 2026".
- Your lawyer's final wording wins; ask them to keep it short and active.

| Before | After |
|---|---|
| By accessing the Service, you hereby irrevocably consent to the processing of your Personal Data. | We use your email to send receipts and security alerts. We never sell it. |
| [x] I agree to all Terms | [ ] Email me product news (optional) |

## 20. 404 and 500 pages

**404 (page not found)**
- Title: "Page not found". One line: why it might be ("The link may be old, or the page moved.").
- Offer a way out: search, home, the most likely sections, "Contact us".
- No jokes at the user's expense; light humor allowed in a consumer voice **only after** the help is clear.
- Return the real 404 status. Keep the site header.

**500 (our fault)**
- Title: "We couldn't load this page". Say it is on you, and what to do: "Try again in a minute. If it keeps happening, tell us. Reference: 9F2A-71".
- Provide a retry button and a status link.
- Never show stack traces or raw codes alone.

**403 / sign-in needed**
- "Sign in to see this page." or the permissions pattern in section 14.

| Before | After |
|---|---|
| 404 | **Page not found.** The link may be old, or the page has moved. [Go to home] [Search] |
| Internal Server Error | **We couldn't load this page.** It's on our side. Try again in a minute. [Try again] Reference 9F2A-71 |
| Oops! Looks like you're lost! 🧭 | Page not found. Try search, or head back to the home page. |

## 21. Marketing headlines on product pages

- Headline = **what it is, for whom, in plain words**, then why it matters: "Same-day repairs for city bikes, booked in a minute".
- Every claim is specific and true; numbers you can source; features you can show.
- Cut hype (list in `mechanics.md`). If a sentence survives a rival's name, it is generic.
- One call to action, repeated with the same words.
- Subhead adds the single most important fact; 1-2 lines.
- No invented proof (user counts, ratings, logos). Real or none.
- Section headings are claims (see 2).

| Before | After |
|---|---|
| Elevate your ride | Same-day repairs for city bikes |
| Unlock the power of seamless scheduling | Book a repair slot in a minute, pay when you collect |
| Trusted by 10,000+ teams | (only with a real, sourced number) |

## Quick limits table

| String | Limit |
|---|---|
| `<title>` | 65 characters |
| h1 headline | 70 characters |
| Button | 1-3 words, 25 characters |
| Link | 2-6 words |
| Field label | 1-4 words |
| Help text | 90 characters, 1 line |
| Inline error | 2 sentences, ~120 characters |
| Toast | 60 characters |
| Confirmation title | 60 characters |
| Empty state line | 90 characters |
| Tooltip | ~60 characters |
| Email subject | 50 characters |
| Push title / body | 40 / 90 characters |
| Onboarding step | 120 characters |
| Sentence | 20 words |
