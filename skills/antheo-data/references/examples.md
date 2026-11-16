# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Sorted as text: $640 comes before $4,800 | Sorted as numbers, largest first |
| “USD” in every cell, numbers left-aligned | The unit once in the header; numbers lined up on the right |
| Up and down shown by colour alone | An arrow and a sign (+12.4%), then colour |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| Insight cards whose charts never drew in a screenshot, because they waited to be scrolled into view (round 3) | Draw on arrival, with a fallback so the chart is never left undrawn |
