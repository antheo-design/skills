# Accessible forms

A form is where accessibility failures cost people money and time. Work through this file field by field. Visual layout of forms (single column, label above) is antheo-layout; the wording of labels and errors is antheo-writing; this file is what the markup must do.

## 1. Anatomy of one field

```html
<div class="field">
  <label for="email">Email address</label>
  <p class="hint" id="email-hint">We send the receipt here.</p>
  <p class="error" id="email-err" hidden><svg aria-hidden="true">…</svg><span>Enter an email like name@example.com</span></p>
  <input id="email" name="email" type="email" autocomplete="email" spellcheck="false"
         required aria-describedby="email-hint email-err">
</div>
```

| Rule | Value |
|---|---|
| Label | A visible `<label for>` for every control, above the field. Clicking it focuses the input. Never placeholder-only; the placeholder is an example, not a label. |
| Label text vs name | Keep the visible text inside the accessible name (2.5.3). |
| Hint | `aria-describedby` pointing at the hint id **first**, then the error id. The hint stays when the error shows. |
| Required | Native `required` plus the word in the label ("Email (required)") or "(optional)" on the few optional ones. If every field is required, say so once at the top. An asterisk alone fails (not read reliably); if used, explain it above the form. |
| Disabled | Avoid. A disabled control leaves the tab order and hides why. Prefer `aria-disabled="true"` with the reason in the hint. |
| Read-only | `readonly` stays focusable and submits; `disabled` does neither. |
| Name and id | Stable `name` and `id` (password managers and autofill key on them). |

## 2. Groups

Radios, checkboxes sets, and multi-part answers (date of birth, address, phone parts) live in `fieldset` with a `legend`:

```html
<fieldset aria-describedby="plan-hint">
  <legend>Choose a plan</legend>
  <p id="plan-hint" class="hint">You can change it later.</p>
  <label><input type="radio" name="plan" value="free"> Free</label>
  <label><input type="radio" name="plan" value="pro"> Pro</label>
</fieldset>
```
Radio errors go in the fieldset's description and `aria-invalid` is set on the radios or the group. Style the legend like a label. Do not nest fieldsets more than two deep. A single checkbox does not need a fieldset.

## 3. Input types, inputmode and autocomplete (1.3.5, 3.3.7)

| Data | `type` | `inputmode` | `autocomplete` |
|---|---|---|---|
| Email | `email` | - | `email` |
| Phone | `tel` | - | `tel` |
| Username | `text` | - | `username` |
| Current password | `password` | - | `current-password` |
| New password | `password` | - | `new-password` |
| One-time code | `text` | `numeric` | `one-time-code` (also `pattern="[0-9]{6}"`) |
| Full name | `text` | - | `name` (or `given-name`, `family-name`) |
| Street, city, ZIP, country | `text` | ZIP: `numeric` if digits only | `street-address`, `address-level2`, `postal-code`, `country-name` |
| Card number | `text` | `numeric` | `cc-number` (and `cc-exp`, `cc-csc`, `cc-name`) |
| Birthday | `text` x3 or `date` | `numeric` | `bday-day`, `bday-month`, `bday-year` |
| Quantity | `number` | - | - |
| URL | `url` | - | `url` |
| Search | `search` | - | - |

Do not use `type="number"` for IDs, card numbers, ZIPs or phone numbers (spinners, scroll-wheel changes, lost leading zeros): use `type="text" inputmode="numeric"`. Turn off `spellcheck` and `autocapitalize` for emails and usernames. Never set `autocomplete="off"` on login or personal-data fields.

## 4. Validation and errors

When to validate: **on submit**, then on blur for fields that failed. Never on first keystroke; never while the user is still typing. Keep what they typed. Never clear the form.

Per field on error:
1. Show the message under the label/hint, above the input, text plus icon, 4.5:1 contrast (not colour alone). Start with what to do: "Enter your email like name@example.com", not "Invalid input".
2. Add `aria-invalid="true"` and make sure the message id is in `aria-describedby`.
3. Add a visible non-colour cue on the control (thicker border, icon).
4. Remove all three the moment the value becomes valid.

Summary for forms with 2+ fields (put it above the form, `tabindex="-1"`):

```html
<div id="summary" class="summary" role="alert" tabindex="-1">
  <h2>Fix 2 things to continue</h2>
  <ul>
    <li><a href="#email">Enter your email like name@example.com</a></li>
    <li><a href="#pw">Password must be at least 12 characters</a></li>
  </ul>
</div>
```
```js
form.addEventListener('submit', (e) => {
  const errors = validate(form);                 // [{id, message}]
  if (!errors.length) return;
  e.preventDefault();
  renderErrors(errors);                          // inline messages, aria-invalid, summary
  document.getElementById('summary').focus();    // focus the summary (several errors) or the first bad field (one error)
  document.title = `Error: ${errors.length} to fix - Sign up`;
});
```
Rules: summary link text equals the inline message word for word; each link moves focus to its field (`href="#id"` works on inputs); the document title starts with "Error:" until fixed. With one error, focus the field itself and let `aria-describedby` read the message. Use `novalidate` on the form only when you provide the custom messages above; native bubbles are not announced consistently.

Async validation (username taken): after the request, write the result into a `role="status"` region **and** set the field's error state; debounce 500ms after typing stops.

## 5. Preventing mistakes (3.3.4, 3.3.6)

For payments, legal agreements, data deletion and anything that cannot be undone, offer **one** of: undo; a review step before the final submit; a confirmation. A destructive confirmation names the object ("Delete 14 files from Tackboard?") and uses specific button labels ("Delete files", "Keep files"); typing the name is the strongest guard and is accessible when the field is labelled and paste is allowed.

## 6. Accessible authentication (3.3.8) and redundant entry (3.3.7)

| Do | Do not |
|---|---|
| Allow paste in every field; `autocomplete` tokens so managers fill | `onpaste="return false"`, `autocomplete="off"` on login |
| Offer passkey, email magic link, SSO, or a password the manager can fill | Make users retype a code they must memorize or transcribe from another device without copy support |
| If a CAPTCHA is unavoidable, offer a non-puzzle alternative (email link, passkey) | Image puzzles, "type the distorted letters", slide-the-piece as the only path |
| Show/hide password as `<button type="button" aria-pressed>` named "Show password" (the name does not change) | Input that reveals on hover only |
| Prefill or let users choose from earlier answers (billing same as shipping checkbox, saved address select) | Asking for email or address twice in one flow; "confirm email" fields (offer a typo check instead) |

One-time codes: `autocomplete="one-time-code"`, one field (not six boxes). If you must use boxes, support paste across them and announce the group as one `fieldset`.

## 7. Time limits (2.2.1)

If a session or step times out: warn at least 20 seconds before expiry with a `role="alertdialog"` or `role="alert"` message, offer "Stay signed in" that works with one keypress and lets the user extend at least 10 times, and keep drafts (localStorage or server) so nothing typed is lost. Real-time exceptions (auctions) and limits over 20 hours are exempt.

## 8. Submit and success

- The submit button is a real `<button type="submit">` with a specific label ("Create account"). Do not disable it before validation; disabled buttons give no reason.
- While sending: set `aria-busy="true"` on the form, change the button label ("Creating account…") and keep it focusable (use `aria-disabled="true"` so Enter does not double submit).
- On success: move focus to the success heading (`tabindex="-1"`) or navigate and focus the new page's h1; do not rely on a toast alone.
- Never auto-advance focus between fields (no jump after 4 digits) and never change the page on select-change (3.2.2).

## 9. Verify

1. Submit empty: focus lands on the summary; every link works; pressing Escape or Tab doesn't lose the errors.
2. Fix one error: its message, `aria-invalid`, and summary entry disappear (or the summary is re-rendered).
3. Screen reader on one field: "Email address, edit, required, We send the receipt here, Enter an email like …, invalid entry".
4. Password manager fills username and password on the login form without clicking.
5. Browser zoom 400%: labels and hints do not overlap fields; no field is cut off.
6. Run `node scripts/a11y-probe.mjs <form page>`: no unnamed controls, no placeholder-only names.
