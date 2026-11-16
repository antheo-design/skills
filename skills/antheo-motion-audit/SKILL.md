---
name: antheo-motion-audit
description: Audits the motion across a whole app or folder, not one animation. It inventories every transition and animation with a scanner, then works in one of four modes. Find shows where motion would help and what must stay still, read-only. Remove cuts motion that shouldn't exist. Review is a strict pass that ends in Approve or Block. Plan writes ranked, self-contained fix plans another agent can carry out. Use for "audit our animations", "the app feels sluggish", "too much motion", "where should things animate", "review the motion before release", or "tokenise our transitions".
---

# Antheo Motion Audit

One animation is antheo-motion's job. A whole app's motion drifts: thirty-six durations, eight curves, a menu that
bounces, a palette that fades in for 300ms forty times a day. This skill looks at all of it at once, judges every
case by **what it does and how often it is seen**, never by the nearest number, and either reports, removes, blocks
or plans. Every value it judges against belongs to **antheo-motion**; the signature moment, if there is one, to
**antheo-moment**.

## Pick the mode

| The person says | Mode | Changes code? |
|---|---|---|
| "Where should things animate?", "it feels static" | **Find** | no |
| "Too much motion", "it feels sluggish", "make it snappier" | **Remove** | yes, removals and shortenings only |
| "Review the motion", "is it ready?", a pull request | **Review** | no |
| "Fix our animations", "tokenise our transitions", a big codebase | **Plan** | no; plans for someone else to carry out |

Unclear: run Find, show it, and ask.

## Decide in this order

1. **Inventory.** Run the scanner; read every flagged line and open the surfaces it names.
2. **Name each by its job and frequency.** A menu, a dialog, a toast, a press, a page, a loader; many times a day,
   daily or rarely (antheo-motion's table). A value is judged against its job, never against the nearest token.
3. **Judge** against antheo-motion: why it moves, duration, curve, distance, origin, properties, reduced motion.
4. **Rank by leverage:** what is seen most, and what one shared component or token fixes in many places.
5. **Answer in the mode's format.**

```bash
node <this-skill>/scripts/scan-motion.mjs src                 # summary and flagged lines
node <this-skill>/scripts/scan-motion.mjs src --json motion.json --all
node <this-skill>/scripts/scan-motion.mjs src --strict        # exit 1 on any high, for CI
```

It prints the distinct durations and curves (drift shows as a long tail), files with no reduced-motion handling, and
lines that break a rule. It reads source, so its flags are candidates: confirm each one in the code and on screen.

## Block on sight

- Motion on a keyboard action (arrowing through a list, typing, a shortcut): it must answer at once.
- Anything opened many times a day (a palette, a menu, a row hover) that takes over 150ms or travels over 4px.
- Interface motion over 300ms; a page over 400ms; a close or hover-out that is delayed.
- Growing from `scale(0)`; `transition: all`; animating width, height, top, left or margin.
- `ease-in` on something arriving; a bounce on something closing.
- A change of state shown only by movement, with nothing left on screen to show it afterwards.
- An animation that blocks input while it plays.
- No reduced-motion handling, or reduced motion that removes the feedback instead of turning it into a short fade.

## Find (read-only)

For every surface: how often it is seen, whether it should move, and if so exactly how.

```
Account menu · opened daily
Move: 150ms in from scale(0.97) and a fade at the trigger, 120ms out. No stagger.
Command palette · opened many times a day
Stay still: appears at once; only the highlighted row fades its fill.
```

List what should stay still and why as carefully as what should move. Propose at most one signature moment, and hand
it to antheo-moment.

## Remove

Cut motion on keyboard actions, high-frequency surfaces, functional data (a number someone reads, a table being
sorted) and pure decoration. Shorten what stays to its job. Each removal is a small diff; then list what was kept and
why, so the next person doesn't add it back.

## Review (strict)

Every finding uses antheo-review's format (`references/report.md` in antheo-review), with the exact values before and
after:

```
[high] Menus · src/components/menu.css:41
Seen: transition: all 300ms ease-in-out on open and close.
Why: a menu opened many times a day should answer in 150ms; `all` animates layout too.
Fix: transition: opacity 150ms var(--ease-out), scale 150ms var(--ease-out); close 120ms.
```

End with one word: **Approve** (no high findings) or **Block** (any high finding), and the count.

## Plan

Survey every surface, rank by leverage, and write each fix as a plan another agent can carry out without this
conversation:

```
## 1. Unify menu motion (14 menus, one shared component)
Where: src/components/ui/menu.tsx, popover.tsx
Now: 4 durations (200 to 350ms), 3 curves, two grow from scale(0)
Change: opacity and scale from 0.97, 150ms in / 120ms out, var(--ease-out), origin at the trigger
Done when: scan-motion shows one duration pair for menus; every menu opens from its trigger at 0.25× speed
Risk: menus in the editor use a custom portal; check the origin there
```

Lead with a summary ("41 surfaces audited, 6 plans, no source changed"). The first plan is usually tokens: the
durations and curves collapsed to antheo-motion's set, so the rest of the plans are value swaps.

## Done

- [ ] The scanner run; every flag checked by eye; surfaces opened on screen, not judged from code alone
- [ ] Every case named by its job and frequency before it was judged
- [ ] The mode's format: Find lists what stays still; Remove lists what was kept; Review ends in Approve or Block;
      Plan leads with the summary and has a "Done when" on every plan
- [ ] Reduced motion checked on every surface that moves
- [ ] At most one signature moment proposed, handed to antheo-moment

## Files

- `scripts/scan-motion.mjs`: inventories CSS transitions, keyframes, Tailwind motion classes, `element.animate()`
  and Motion props; flags `transition: all`, `scale(0)`, layout properties, long durations, `ease-in`, animated
  shadows, keyframes on hover, `will-change`, linear interface motion and delays; `--json`, `--all`, `--strict`
- uses antheo-motion's tables for every value, and antheo-review `scripts/check-page.mjs` to see surfaces move
