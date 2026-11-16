# Examples: what goes wrong, and the fix

Each pair is shown live, before and after, on the Antheo skills page. Without the skill, then with it:

| Without | With |
|---|---|
| Opens in 600ms, at an even speed: it lags behind the click | Opens in 150ms, fast then settling: it keeps up |
| Grows from its own middle | Grows from the button that opened it |
| Closes as slowly as it opened | Closes faster, in 120ms: leaving should never make you wait |

## From the lab

Real builds by coding agents with these skills, judged by people beside the reference:

| What went wrong | What fixed it |
|---|---|
| A radio flashing "No signal" for a moment while it glided to the next station; only a filmstrip showed it (round 3) | A jump shows where it is going at once; film every motion and read the frames |
| Rolling digits cut hard in half mid-roll (round 3) | Each digit seen through a window that fades at its top and bottom |

## When the default is wrong

An object's play (a radio's static while it tunes, a candy's wobble) runs as long as the hand keeps going; the 300ms limit is for menus and fields.
