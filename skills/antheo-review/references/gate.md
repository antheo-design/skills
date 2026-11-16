# The gate

A UI change isn't done until the page and its words pass, checked by a script, not by the agent saying so. The gate
is `scripts/gate.mjs`. It works in any stack, because it checks the page as rendered (a dev-server URL or a built HTML
file) and reads copy in HTML, JSX/TSX, Vue, Svelte, Astro, Angular and server templates.

## Use it

```bash
node <antheo-review>/scripts/gate.mjs arm http://localhost:5173/settings --copy src/pages/settings
# built from references? name them, and the gate asks for the evidence of comparing:
node <antheo-review>/scripts/gate.mjs arm http://localhost:5173/ --copy src --ref refs/radio.jpg refs/cards.png
# …build…
node <antheo-review>/scripts/gate.mjs check     # see the four outcomes below
node <antheo-review>/scripts/gate.mjs rearm     # after a PASS, when the page changes again: the same pages, round 1
node <antheo-review>/scripts/gate.mjs disarm    # when the work is abandoned
```

- **A PASS disarms the gate.** Any change after it (a fix, a polish, a stress pass) needs `rearm` and a fresh
  `check` before saying done; the last check must be on the last version of the page.

- **Arm it at the start** of a UI build or fix, with every page the work touches and the source folders whose words
  changed. `--widths 390,1280` by default.
- **Check before saying done.** A blocker or a high finding from `check-page.mjs` (at each width, light and dark), a
  blocker or serious finding from antheo-access's `a11y-probe.mjs` (keyboard, focus, forced colours, text spacing,
  reflow, and buttons wired to nothing; `--no-probe` skips it), or a high finding from `copy-lint.mjs` keeps it open.
- **Built from references: show the comparing.** Armed with `--ref <image>...`, it also needs, in `.antheo/evidence/`,
  two `beside.mjs` sheets per reference made at least a minute apart (compared, changed, compared again) and at least
  one `filmstrip.mjs` sheet. Both tools write there by default. The gate can't judge taste; it can make sure the
  looking happened.
- **Four outcomes, never confused:**

  | Says | Exit (`check`) | Means |
  |---|---|---|
  | `GATE: PASS` | 0 | the automated checks found nothing blocking; not a full release review |
  | `GATE: OPEN` | 1 | findings to fix; this was one round |
  | `GATE: DONE, UNRESOLVED` | 3 | three rounds ran out with work still open: tell the person what is left; don't loop. **Not a pass** |
  | `GATE: TOOL ERROR` | 4 | a checker crashed or wrote no report: nothing was verified |

  Every round deletes the last report first, so a crash can never leave an old passing result behind. In CI, only
  exit 0 is success. The Claude Code hook lets the agent stop after the last round, so the unresolved list reaches the
  person instead of looping.
- **Each round, keep what worked and undo what didn't.** Before a round's fix, reproduce the finding on the page.
  If the fix didn't move it, revert that change before trying the next idea; never stack guesses. A finding still
  open after a change means the cause was wrong.
- **Waivers, with a reason.** When the checker is wrong (a code sample meant to scroll sideways), add
  `{ "rule": "horizontal scroll", "target": "<the page>", "reason": "the code sample scrolls by design" }` to
  `.antheo/waivers.json`. A waiver needs a reason of 12 characters or more. Never change the check, the page's markup
  just to dodge it, or the threshold.
- State lives in `.antheo/` in the project; add it to `.gitignore`.

## Make it automatic

**Claude Code:** a Stop hook runs the check every time the agent tries to finish, and sends it back to work while the
gate is open (`exit 2`). It does nothing when no gate is armed. In `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node .claude/skills/antheo-review/scripts/gate.mjs hook" }] }]
  }
}
```

That path is for skills installed in the project (`npx skills@latest add` without `--global`). Installed for every project, it is
`~/.claude/skills/antheo-review/scripts/gate.mjs`; elsewhere, use the folder the installer printed.

**Codex, Cursor, OpenCode and agents without a stop hook:** put this line in `AGENTS.md` or a project rule:

> Before saying a UI change is done, run `node <antheo-review>/scripts/gate.mjs check`. If it says GATE: OPEN, fix what
> it lists and run it again; after GATE: DONE, UNRESOLVED or GATE: TOOL ERROR, tell me what is still open or unverified.

## Why

Agents reliably say "done" on code evidence: types pass, the build passes, nobody looked at the page. The gate turns
the review's measured checks into a condition for finishing, and the round limit and waiver rule keep it honest in
both directions: it can't trap the agent forever, and the agent can't talk its way past it.
