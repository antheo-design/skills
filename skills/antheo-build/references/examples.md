# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Six text sizes and three weights, picked as it went (24, 16, 14, 12…) | Four sizes and two weights, all from one style block pasted first |
| A grey border around the card | A faint edge and a soft shadow, so the card sits on the page |
| “On” and “Off” written beside every switch | The switch shows its own state; the label says what it controls |
| A full-width purple button in Title Case | One dark button, as wide as its words: “Save changes” |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| Five components built in one pass, no reference: every one correct, none good enough to keep (round 2) | One at a time, from a reference, compared with it twice; most of the effort on the thing, the checks last |
| A demo whose "See more" buttons did nothing; no check noticed (round 3) | Every control does something, even in a demo; the access probe now presses each one |

## When the default is wrong

A reference the person loves: its look wins over the Quiet preset (outlined cards, a display face, pills), and the gate runs with `--preset none`. The "always" list still holds.
