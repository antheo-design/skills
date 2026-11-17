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
a menu, or anything done many times a day. Most components need none. Build one when the request names it or
the person asks for it. For work meant to be kept that has such an event and no moment asked for, propose one in a
line; with no such event, say "none" and stop. A moment is motion on what is already there: it never adds
panels, cards, colours or content the request didn't name. Ask:
would someone who uses this every day want to skip it? Then it goes, or plays only the first time.

An object's play is not a moment and is never cut by this rule (antheo-creative owns it): the static as a radio tunes, the squash of a candy
button, a dial's clicks are how the thing behaves every time (antheo-surface `references/objects.md`, "The play is
the point").

## It must pass three tests

1. **The screen-record test.** Would a designer record their screen to show someone? A bar that fills, a fade or a
   colour change: no. Light that blooms from the pressed button while each real step rolls by, then sweeps away as a
   tick draws itself: yes.
2. **The frame test.** 10 to 14 frames across it each look composed: no hard edge sliding through, no flash of the wrong
   colour, no box that scales, no text that jumps, no layout that shifts.
3. **The meaning test.** One sentence says what it tells the person ("your site is live, step by step, and it
   worked"). No sentence: it is decoration.

## Up to six beats: only the ones the event needs

A quick event may need only Response and Finish. Alive and Progress exist only while real work takes time, and
follow that work: a step is shown when it really happens, never on a timer.

| Beat | What it does | Typical |
|---|---|---|
| Anticipation | a quiet hint on the trigger before the press; not the moment, which only the event starts | on hover or focus, the trigger's glow, an arrow's nudge |
| Response | the press is felt at once | `scale(0.97)` in 100ms; the light born at the pressed point |
| Alive | while work happens, it breathes | colours drift slowly; a status line rolls |
| Progress | real steps, not a timer | each step named as it happens; a part fills only when its work is done |
| Finish | the peak: it worked | a tick draws itself; a short burst in the moment's colours; a sheen passes once |
| Exit | leaves faster than it came | the light sweeps away; focus moves to the result |

Then, only where they help, a few small touches (rarely more than five): text that rolls instead of swapping; digits that roll; the changed thing lifting
for a moment; a failure designed too (it warms to red, names the step, Try again resumes); a vibration on phones
after a real press; an optional soft chime, off by default.

## Its numbers

The finish itself lasts under a second, plays once, is skippable and never blocks the next action. The whole moment
follows the real work: if sending takes four seconds, Alive and Progress run for those four seconds and the finish
plays when it is done. Never wait just to animate, and never fake a delay to make room for one. A burst stays invisible until
the tick has drawn, so it never reads as a spinner. Springs up to bounce 0.45 here, and only here. Colour may be
lavish during the moment and leaves when it ends. Sound and vibration only after a real press, never on load.

## Reduced motion tells the same story

Under `prefers-reduced-motion: reduce`, the same beats as a 150 to 200ms crossfade: no travel, no blur, no burst. The
finish still shows (the tick appears, the colour changes), because it carries meaning.

## Never draw the subject into the UI

The moment lives in the job, not in the subject's world: no postal routes, paper, stamps or chalkboards
(antheo-direction). The exception is a component that **is** a physical thing (a bank card, a dial, a ticket): it is
drawn as that thing (antheo-surface `references/objects.md`), and its moment is what the real thing does (the card
slides home, the dial settles, the ticket tears off), still only on the rare event.

## Done

- [ ] The event is rare and meaningful, or the brief says "none"
- [ ] Only the beats it needs, following the real work; touches only where they help; the failure designed
- [ ] The screen-record, frame and meaning tests pass
- [ ] The finish under 1s, once, skippable, with no added delay; reduced motion keeps the finish as a crossfade
- [ ] Filmed at 0.1× (antheo-motion `scripts/filmstrip.mjs`), every frame read, and repeated twenty times
- [ ] Smooth where it will run: antheo-review `scripts/latency-probe.mjs <url> --play "<the trigger>" --cpu 4` passes
      (no frame over 33ms on a CPU slowed four times)

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/toolbox.md`: light from the press point, living colour, an anticipation halo, rolling text and digits,
  a drawn tick, a burst, a sheen, springs, vibration and sound, with code; moments by component; checking frames
