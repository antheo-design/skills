# The baseline, and checks that have been seen to fail

Part of antheo-system. Open it before the first edit on a screen, and again when adding any check (a lint rule, a
script, the CI ratchet). "No visible change" is a comparison between two captures. Without the first capture it is
only a claim.

## 1. Capture the screen before touching it

Everything here only reads. Run it against the running app with the same account and the same data you will use
afterwards.

```bash
# screenshots: light and dark, phone, 1280 and the widest width, plus one full-page shot at 1280
node <antheo-review>/scripts/check-page.mjs <url> --shots design/baseline/<screen> --json design/baseline/<screen>/check.json
# one more width that matters on this screen (a tablet layout, a narrow sidebar): one run per width, same folder
node <antheo-review>/scripts/check-page.mjs <url> --shots design/baseline/<screen> --widths 768
# the controls, in Tab order, each with its role and accessible name
node <antheo-access>/scripts/a11y-probe.mjs <url> --no-triggers --json design/baseline/<screen>/keys.json
node -e "for (const s of JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).tabStops) console.log(s.order, s.role, '|', s.name)" design/baseline/<screen>/keys.json > design/baseline/<screen>/controls.txt
```

What each one writes, so you can check it is there:

| File | From | Holds |
|---|---|---|
| `390-light.png`, `1280-light.png`, `1920-light.png` | `check-page.mjs --shots` | the viewport at the widths nearest 390 and 1280 and at the widest width asked for |
| `1280-light-full.png` | the same run | the whole page at the width nearest 1280 |
| the same names with `-dark` | the same run | only when the screen has a dark theme; none is written when it has not |
| `check.json` | `--json` | every measurement and finding, to compare counts later |
| `keys.json`, `controls.txt` | `a11y-probe.mjs` | `tabStops`: order, role and name of every control Tab reaches, one line each in `controls.txt` |

Rules for a capture that can be trusted:

- **Read-only.** `check-page.mjs` loads the page, hovers controls and presses Tab. It clicks nothing and types
  nothing. Never add `--stress` to a baseline: it rewrites the page's text. `a11y-probe.mjs` without
  `--no-triggers` opens every menu and presses every enabled button once, so on a real app always pass it.
- **States are screens too.** An empty list, an error, an open dialog: when the state has a URL, capture it into
  its own folder (`design/baseline/<screen>-empty`). When it has not, write "not captured: <state>" in the log.
  Controls behind a closed menu or dialog are not in `controls.txt` either.
- **Stable twice.** Capture a second time into `design/baseline-again/<screen>` and compare:
  `node <antheo-review>/scripts/pixdiff.mjs design/baseline/<screen> design/baseline-again/<screen> --max 0`.
  It must print `PASS`. A baseline that differs from itself proves nothing later: find what moves (a clock, a
  rotating avatar, an animation, live data; pixdiff prints its box), pin it, and capture again.
- **Logged.** One line in `design/migration.md`: the screen, the URL, the commit (`git rev-parse --short HEAD`),
  the account or seed data, the widths, the date.
- **Kept.** The folder stays as it is until the migration is locked. Never capture the baseline again after an
  edit to make a diff pass. It is replaced only when the person accepts a visible change, and the log says so.

Done when: the PNGs, `check.json` and `controls.txt` exist for every screen in this batch, the second capture
passes at `--max 0`, and the log line is written.

## 2. Compare after every change

The same three commands, into `design/after/<screen>`. Then:

```bash
node <antheo-review>/scripts/pixdiff.mjs design/baseline/<screen> design/after/<screen> --max 0 --out design/diffs/<screen>
git diff --no-index --exit-code design/baseline/<screen>/controls.txt design/after/<screen>/controls.txt
```

- **pixdiff** exits 1 when any file is over `--max` percent, differs in size, or exists in only one folder. Exact
  swaps use `--max 0`. Close swaps add `--tolerance 2` (up to 4) for antialiasing. Each line names the changed
  area: `box x320 y165 640x36`.
- **The controls diff** exits 0 when every role and name is where it was. Any line that differs is a change to
  what a screen reader says or to the Tab order: fix it, or list it as a visible change.
- **A changed area you need to look at:** put the old one beside the new one, using the box pixdiff printed.

  ```bash
  node <antheo-review>/scripts/beside.mjs <url> --clip "<selector of the changed part>" --ref design/baseline/<screen>/1280-light.png --region 320,165,640,36 --width 1280 --scale 1 --out design/diffs/<screen>/beside-<part>.png
  ```

  `--region` is `x,y,w,h` in the baseline image's own pixels (these screenshots are one pixel per CSS pixel).
  Always pass `--out`: without it the sheet goes to `.antheo/evidence/`, where antheo-review's gate counts it.
  Exit 4 means the page, the element or the image could not be read.

A change is "not visible" only when pixdiff passes at the tolerance for its kind and the controls diff is empty.
Otherwise it goes in `migration.md` as a visible change, with the diff image's path.

## 3. A check counts only once it has been seen failing

A check that has never failed may not be running at all: the wrong folder, an extension it skips, an ignore file,
a CI step that swallows the exit code (`|| true`, `continue-on-error`). So for every lint rule, script or CI step
the migration adds:

1. **Plant one violation** of the kind the check exists to catch.
2. **Run the check.** It must fail, with a non-zero exit code, and name the planted file.
3. **Remove the violation** and run again. It must pass.
4. **Log it** in `migration.md`: "ratchet seen failing 2026-11-17: `#ff0000` planted in `src/card.css`, exit 1".

For the ratchet:

```bash
node <this-skill>/scripts/audit-values.mjs src --baseline design/audit.json --fail-on-increase; echo $?   # 0
# add  .planted { color: oklch(0.6 0.2 30); }  to one stylesheet under src (the form the team writes)
node <this-skill>/scripts/audit-values.mjs src --baseline design/audit.json --fail-on-increase; echo $?   # 1
# the table shows  color ... +1  UP  ; remove the line and run again: 0
```

For a pixdiff step: change one corner by 2px on a baselined screen, see `EXCEEDS` and exit 1, change it back. For
a lint rule: write one raw value in a file the rule covers and see the rule name it.

What planting will show you about the ratchet, so plant the kind of value the team really writes:

- It counts every colour form: hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`
  and named colours. `transparent`, `currentColor`, `inherit` and anything built on `var()` are not raw values.
- A named colour (`red`) is counted where a colour is expected: a declaration of a colour-taking property, or an
  SVG `fill` or `stroke`. In a script file it must be a quoted value (`color: 'red'`); inside a CSS-in-JS template
  string it is not seen. If the team writes those, plant one and see.
- Heights count up to 64px (control heights). A `height: 300px` is layout, and passes. A unitless `line-height`
  is a ratio, not a length, and is not counted.
- It counts uses per kind. One raw value removed and another added is a delta of 0, and passes.
- A baseline stored by the older audit counted fewer colour forms and no line heights or heights. The run says so:
  store a new baseline with `--json` before relying on it.
- It skips `node_modules`, build folders (`dist`, `build`, `out`, `.next`), `public`, `vendor`, minified files,
  files over 600KB, the file given with `--tokens`, and any file whose name ends in `token.css`, `tokens.css`,
  `token.json` or `tokens.json`. A violation planted there is never seen.

If a check passes with the violation in place, the check is broken. Fix it before relying on it.
