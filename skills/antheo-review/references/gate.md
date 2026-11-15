# The gate

A UI change isn't done until the page and its words pass, checked by a script, not by the agent saying so. The gate
is `scripts/gate.mjs`. It works in any stack, because it checks the page as rendered (a dev-server URL or a built HTML
file) and reads copy in HTML, JSX/TSX, Vue, Svelte, Astro, Angular and server templates.

## Use it

```bash
node <antheo-review>/scripts/gate.mjs arm http://localhost:5173/settings --copy src/pages/settings
# …build…
node <antheo-review>/scripts/gate.mjs check     # exit 0: PASS; exit 1: still open, with what to fix
node <antheo-review>/scripts/gate.mjs disarm    # when the work is abandoned
```

- **Arm it at the start** of a UI build or fix, with every page the work touches and the source folders whose words
  changed. `--widths 390,1280` by default.
- **Check before saying done.** A blocker or a high finding from `check-page.mjs` (at each width, light and dark), or
  a high finding from `copy-lint.mjs`, keeps it open.
- **Three rounds.** Each failed check is a round. After three it stops blocking and says `GATE: DONE` with what is
  left: tell the person; don't loop.
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

That path is for skills installed in the project (`npx skills add` without `-g`). Installed for every project, it is
`~/.claude/skills/antheo-review/scripts/gate.mjs`; elsewhere, use the folder the installer printed.

**Codex, Cursor, OpenCode and agents without a stop hook:** put this line in `AGENTS.md` or a project rule:

> Before saying a UI change is done, run `node <antheo-review>/scripts/gate.mjs check`. If it says GATE: OPEN, fix what
> it lists and run it again; after GATE: DONE, tell me what is still open.

## Why

Agents reliably say "done" on code evidence: types pass, the build passes, nobody looked at the page. The gate turns
the review's measured checks into a condition for finishing, and the round limit and waiver rule keep it honest in
both directions: it can't trap the agent forever, and the agent can't talk its way past it.
