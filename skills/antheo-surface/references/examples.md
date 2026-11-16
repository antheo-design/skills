# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| A border on the card and on everything in it; 16px corners everywhere | A faint edge, no borders; corners by size: 10 for cards, 6 for controls |
| One big blurry shadow; in dark it disappears | A small, tight shadow; in dark, higher means lighter |
| The field is a white box with a border | The field is a well, a step darker than the card |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| Candy-button icons filling 75% of the button, one off centre, under a soft blurry gloss (round 3) | Icons at about 40% of the button, centred by their ink, a crisp gloss strip and a clean rim (the build people chose) |

## When the default is wrong

A brand whose cards are outlined, or a drawn object with its own material: outlines and texture are right there. Keep every control's edge visible either way.
