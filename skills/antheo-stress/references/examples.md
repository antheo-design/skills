# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| A long name pushes Remove out of sight | Long names end in “…”; Remove stays where it is |
| A button sized for English: in German, “Mitglied entfernen” is cut off | Buttons grow with their words, in every language |
| No name: an empty row with a blank circle | A fallback: “Unnamed member” |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| A jelly filter bar that looked perfect with three options broke with two and with five (round 4) | Render the counts that will happen (1, 2, realistic, many) and look at each |
