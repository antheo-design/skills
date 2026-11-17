# Splitting a migration across parallel agents

Use when a migration touches more surfaces than one agent can hold in its head. Three roles, three briefs. Fill in
every `<...>`; an agent has only what its brief tells it. One owner per surface; one owner per shared file.

## Coordinator brief

```
You coordinate the migration of <app> onto <system> (design/system.md). You do not edit surfaces yourself.

The plan: <design/migration.md steps, in order>. Current raw-value count: <n> (baseline design/audit.json).
The order:
  1. <shared files first: tokens, the shared component, the wrapper>, owner: <one agent>. Nothing else starts
     until this lands and the audit baseline is updated.
  2. <surface group A>, <surface group B>, ... in parallel, each with one worker.
  3. Verification of each surface as it lands.
Who owns what: a table of surface (route or file list) | worker | verifier. A file appears in one row only.
Shared rules for everyone:
  - Read design/taste.md and design/system.md first; they outrank defaults.
  - The tolerance table from antheo-system SKILL.md decides "no visible change".
  - Map tokens by role, never by value. A stray value is reported, not decided.
  - A migration is not a redesign: change no layout, copy or behaviour.
  - Do not touch files outside your surface. If you need a change in a shared file, stop and report it.
  - Commit instructions: <how and where; one commit per surface>.
You decide: order changes, conflicts between workers, strays that need the person. You collect each worker's
report and each verifier's verdict, update design/migration.md, and re-store design/audit.json after each batch.
```

## Worker brief

```
You migrate one surface: <route / files>. Nothing else.

Before you start, capture before shots:
  node <antheo-review>/scripts/check-page.mjs <url> --shots before/<surface> --widths 390,1280
Do: <the migration step for this surface, e.g. replace exact raw values with tokens from design/system.md; swap
<OldButton> for <Button> after writing its behaviour contract>.
Tolerance: color dE <= 2; spacing, size, radius <= 2px; font size <= 1px; line height <= 0.05; opacity <= 0.02;
duration <= 30ms; border width, font weight, font family and easing exactly. Anything outside is a "visible change":
list it, don't hide it.
After, capture after shots with the same command and the same flags, into after/<surface>, then
  node <antheo-review>/scripts/pixdiff.mjs before/<surface> after/<surface> --out diffs/<surface>
and run audit-values.mjs on your files: the count must not go up.
Do not touch: <other surfaces>, tokens, shared components, tests you were not asked to change, anything under
design/ except your line in migration.md.
Report back: files changed; raw values before -> after; pixdiff percentages and bounding boxes; each visible change
as element | before | after | within tolerance? ; anything you could not map (strays); anything you chose not to do
and why.
```

## Verifier brief

```
You verify the migration of <surface>, done by <worker>. You do not fix it; you accept or send it back.

Run, on the worker's branch. The first capture uses the flags the before shots were made with, so both folders hold
the same file names; pixdiff fails on a file that exists on one side only:
  node <antheo-review>/scripts/check-page.mjs <url> --shots after-verify/<surface> --widths 390,1280
  node <antheo-review>/scripts/pixdiff.mjs before/<surface> after-verify/<surface> --tolerance 2 --max <limit> --out diffs-verify
  node <antheo-review>/scripts/check-page.mjs <url> --stress --shots stress-verify/<surface>
  node <antheo-system>/scripts/audit-values.mjs <the folder the baseline was stored from> --baseline design/audit.json --fail-on-increase
The stress shots go in their own folder and are looked at, never diffed: the before shots have no stress run.
Check: every pixdiff region is on the worker's list of visible changes; each listed change is within the tolerance
table, or approved by the person; the behaviour contract rows are all yes or decided; keyboard path and focus
unchanged; no file outside the surface changed (git diff --name-only).
Accept only when all hold. Otherwise send it back with: the failing check, the evidence (diff image path, number,
file:line), and what would make it pass. Report: ACCEPT or SEND BACK, then the evidence in one list.
```
