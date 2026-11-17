# Git during a migration

Part of antheo-system. Open it before the first commit of a migration, and whenever the tree is not as you left
it. A migration touches many files over many steps, often beside other people's or other agents' work. These rules
keep every step undoable on its own and nobody's work lost.

The project's own rules come first: which branch, who commits, the message format. When they say nothing about
committing, ask before the first commit and leave the work uncommitted until answered.

## Never (requirements: each one can destroy work that is not yours)

| Never | Why | Instead |
|---|---|---|
| `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .` | they delete uncommitted work, yours and anyone else's, with no way back | undo your own edit by hand, or `git restore <one path>` after `git diff <that path>` shows only your lines |
| `git push --force`, with or without `--force-with-lease`; amending or rebasing commits already pushed | they rewrite history others have pulled | a new commit, or `git revert <sha>` |
| `git stash` on work you did not make | it vanishes from the tree someone is working in, and a failed pop can lose it | leave it where it is; work only in your own paths |
| Discarding or "tidying" files you did not change | an unknown file is someone's work in progress until they say otherwise | name it in your report and leave it |
| `git add -A`, `git add .`, `git commit -a` | they sweep unrelated files into the commit | `git add <path> <path>`, one path at a time |
| `--no-verify` | a failing hook is a finding | read the failure, fix the cause |

## Start from a clean tree and a checkpoint

```bash
git status --porcelain          # nothing printed: the tree is clean
git rev-parse --short HEAD      # the checkpoint: write it in design/migration.md before the first edit
```

When `git status` prints something:

- **Your own earlier work:** commit it first (if the rules allow), so the checkpoint is a real commit.
- **Not yours:** leave every one of those files exactly as it is. Write the list down, work only in paths that are
  not on it, and say so in the report. If the migration needs one of those files, stop and ask.

## One screen or one component per commit

One unit of the migration is one commit: one screen moved to tokens, or one component replaced (the component, its
wrapper and its call sites on that screen). Nothing else rides along: no formatting sweep, no lockfile change, no
rename you noticed on the way.

```bash
git add src/screens/settings.tsx src/screens/settings.css      # by path
git diff --cached --name-only                                  # every path listed belongs to this unit
git commit -m "<the project's format>: settings screen on tokens, no visible change"
git show --stat HEAD                                           # the commit holds only those paths
```

Proof it can be undone alone: `git show --stat <sha>` lists only that unit's files. To back one out later,
`git revert <sha>` makes a new commit and leaves every other unit in place.

A shared file (the token file, a shared component) changes in its own commit, before the screens that need it.

## When something is not as expected

A conflict, a hook that fails, a file that changed under you, a branch that moved: stop and say what you see. Do
not reach for a command from the Never table to get unstuck. Nothing in a migration is urgent enough to risk
someone's work.

## Done

- [ ] The checkpoint commit is written in `design/migration.md`
- [ ] `git log --oneline <checkpoint>..HEAD` shows one line per screen or component
- [ ] `git diff --name-only <checkpoint>..HEAD` lists only files the migration meant to change
- [ ] `git status --porcelain` shows nothing that was not there at the start
- [ ] No command from the Never table was run
