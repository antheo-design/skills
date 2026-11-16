# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Three left edges: the title, the fields and the help each start somewhere else | One left edge: every block starts on the same line |
| Gaps picked by eye: 3, 22, 9 and 30px | Gaps from one scale: 4 or 6 inside a group, 16 between groups, 20 before the action |
| The button floats in the middle | The button starts on the same edge, under what it saves |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| A component sized "100% up to 560px" pushed a 390px phone sideways, because its grid column wouldn't shrink (round 3) | `grid-template-columns: minmax(0, 1fr)` on the stage, so the column may shrink below its content |

## When the default is wrong

A sign-in card alone on the page stays narrow and centred; the one-edge rule is for pages with several blocks.
