---
name: antheo-moment
description: Builds a component's one signature moment, the animation people remember, and only on a rare, meaningful event (a code accepted, a payment sent, a file landed, a list finished), never on things used all day. Use when a component should feel special at its peak, or when asked for "delight".
---

# Antheo Moment

Quiet chrome makes a component correct; a signature moment makes someone want to use it. This skill decides whether
a component earns one, and builds it to a bar. Everything else that moves (presses, menus, dialogs) belongs to
**antheo-motion**, whose timing and reduced-motion rules still apply here.

## Only on a rare, meaningful event

A code accepted, a payment sent, a file landed, the last task done, a first success. Never on hover, typing, opening
a menu, or anything done many times a day. Most components need none. Build one only when the request names it or
the person asks for it; otherwise say "none" and stop. A moment is motion on what is already there: it never adds
panels, cards, colours or content the request didn't name. Ask:
would someone who uses this every day want to skip it? Then it goes, or plays only the first time.

## It must pass three tests

1. **The screen-record test.** Would a designer record their screen to show someone? A bar that fills, a fade or a
   colour change: no. Light that blooms from the pressed button while each real step rolls by, then sweeps away as a
   tick draws itself: yes.
2. **The frame test.** 10 to 14 frames across it each look composed: no hard edge sliding through, no flash of the wrong
   colour, no box that scales, no text that jumps, no layout that shifts.
3. **The meaning test.** One sentence says what it tells the person ("your site is live, step by step, and it
   worked"). No sentence: it is decoration.

## Six beats, planned before building

| Beat | What it does | Typical |
|---|---|---|
| Anticipation | hints that something will happen | on hover or focus, the trigger's glow, an arrow's nudge |
| Response | the press is felt at once | `scale(0.97)` in 150ms; the light born at the pressed point |
| Alive | while work happens, it breathes | colours drift slowly; a status line rolls |
| Progress | real steps, not a timer | each step named as it happens; a part fills only when its work is done |
| Finish | the peak: it worked | a tick draws itself; a short burst in the moment's colours; a sheen passes once |
| Exit | leaves faster than it came | the light sweeps away; focus moves to the result |

Then five to eight small touches: text that rolls instead of swapping; digits that roll; the changed thing lifting
for a moment; a failure designed too (it warms to red, names the step, Try again resumes); a vibration on phones
after a real press; an optional soft chime, off by default.

## Its numbers

Under 1 second from press to finish, once, skippable, never blocking the next action. A burst stays invisible until
the tick has drawn, so it never reads as a spinner. Springs up to bounce 0.45 here, and only here. Colour may be
lavish during the moment and leaves when it ends. Sound and vibration only after a real press, never on load.

## Reduced motion tells the same story

Under `prefers-reduced-motion: reduce`, the same beats as a 150 to 200ms crossfade: no travel, no blur, no burst. The
finish still shows (the tick appears, the colour changes), because it carries meaning.

## Never draw the subject into the UI

The moment lives in the job, not in the subject's world: no postal routes, paper, stamps or chalkboards
(antheo-direction).

## Done

- [ ] The event is rare and meaningful, or the brief says "none"
- [ ] Six beats planned; five to eight touches; the failure designed
- [ ] The screen-record, frame and meaning tests pass
- [ ] Under 1s, once, skippable; reduced motion keeps the finish as a crossfade
- [ ] Checked at 0.1× speed and repeated twenty times

## Files

- `references/toolbox.md`: light from the press point, living colour, an anticipation halo, rolling text and digits,
  a drawn tick, a burst, a sheen, springs, vibration and sound, with code; moments by component; checking frames
