# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Colours typed by hand wherever they are used | Each colour named once (--accent, --text) and used by name |
| Change the brand: only the button follows | Change one line: every accent follows |
| Dark mode: the title keeps its light-mode colour and vanishes | Every colour has a dark value, so it all flips together |

## When the default is wrong

A product that already has tokens keeps them (antheo-system maps onto them). A one-off page needs only the style block, not a token set. A brand colour that fails contrast as text stays for fills and marks, with a derived text shade that passes; say which pairs changed.
