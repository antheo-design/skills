# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Three greys that almost match, in three files | One token for the job: --text-2 |
| Corners of 7px and 9px | One corner for every control: --r-control |
| Values typed by hand, so they drift | Mapped by what each is for, and every screen reads the token |

## When the default is wrong

A product with no screens yet has nothing to extract: start with antheo-tokens. When the person wants the look to change, that is a redesign, and "no visible change" stops being the test: finish the migration first, then make the redesign its own change. A brand colour, a chart palette or a partner's logo keeps its exact value even when a token sits within ΔE 2 of it. And the most used value does not become the token when it is the mistake (a grey that fails contrast): take the one that passes and list the swap as a visible change.
