# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Tab moves focus, but nothing shows where it went | A ring shows where you are, every time |
| An icon button with no name: a screen reader says just “button” | Every button has a name: “Export invoices” |
| A placeholder instead of a label | A real label, so the field is announced by name |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| A radio that lost its city and station name under the text-spacing override, because its screen had a fixed height (round 3) | The screen grows; each odometer digit centred in its own cell |
| A "See more insights" button wired to nothing (round 3, two agents) | Wire it, or show its result; the probe presses every button |
