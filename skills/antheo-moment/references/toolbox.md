# The toolbox, moments by component, and checking frames

How to build a signature moment (antheo-moment). Everything below is CSS and a few lines of JavaScript, no library.

## Techniques

**Light from the press point.** A layer over the component, masked by a soft circle that grows from where the person
pressed. Nothing scales a box, so there is never an edge.

```css
@property --reach { syntax: '<length>'; inherits: false; initial-value: 0px; }
.light {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  mask: radial-gradient(circle at var(--ox, 50%) var(--oy, 100%), #000 max(0px, calc(var(--reach) - 180px)), transparent var(--reach));
  transition: --reach 650ms var(--ease-out), opacity 260ms var(--ease-out);
}
.is-working .light { --reach: 1200px; opacity: 1; }
```
Set `--ox`/`--oy` from the pressed button's centre relative to the component.

**Living colour.** Three or four soft radial blobs, each on its own slow path and time (6 to 10s, alternate), under a
fine grain at 4 to 6% (an inline SVG `feTurbulence`). Register the colours with `@property` so a failure can warm them to
red smoothly.

```css
@property --c1 { syntax: '<color>'; inherits: true; initial-value: oklch(0.7 0.16 250); }
.blob { position: absolute; width: 60%; aspect-ratio: 1; border-radius: 50%; filter: blur(28px);
        background: radial-gradient(closest-side, var(--c1), transparent); animation: drift 7.2s ease-in-out infinite alternate; }
@keyframes drift { to { translate: 18% -12%; } }
.has-failed { --c1: oklch(0.62 0.2 25); transition: --c1 300ms ease-out; }
```
Pick the colours from the meaning (calm blues and mints for sending, warm for a celebration), never from a palette
default; on a component that has no colour at rest, this is where its colour lives.

**Anticipation halo.** A conic gradient behind the primary button, blurred, turning slowly on a registered angle,
visible on hover and focus, brighter on press.

```css
@property --turn { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.halo { position: absolute; inset: -6px; border-radius: inherit; z-index: -1; filter: blur(10px); opacity: 0;
        background: conic-gradient(from var(--turn), var(--c1), var(--c2), var(--c3), var(--c1));
        transition: opacity 200ms var(--ease-out); animation: turn 4s linear infinite paused; }
.primary:is(:hover, :focus-visible) .halo { opacity: 0.55; animation-play-state: running; }
.primary:active .halo { opacity: 0.9; }
@keyframes turn { to { --turn: 360deg; } }
```

**Rolling text.** Every line of a status sits in one grid cell; the current one is shown, the last rolls up and out,
the next waits below. A true crossfade, nothing shifts sideways.

```css
.roll { display: grid; } .roll > * { grid-area: 1 / 1; transition: translate 240ms var(--ease-out), opacity 200ms; }
.roll > [data-state='past'] { translate: 0 -60%; opacity: 0; }
.roll > [data-state='next'] { translate: 0 60%; opacity: 0; }
```

**Digits that roll.** Each digit is a column of 0 to 9 translated to its value with `translateY(calc(var(--d) * -1em))`,
`tabular-nums`, overflow hidden, 300 to 450ms, staggered 20ms from the right.

**A tick that draws itself.** An SVG path with `pathLength="1"`, `stroke-dasharray: 1; stroke-dashoffset: 1`,
transitioned to 0 over 260 to 400ms after a 100ms pause, with a pop (`scale` 0.6 → 1 on a slight overshoot,
`cubic-bezier(0.34, 1.56, 0.64, 1)`).

**A burst.** 8 to 12 small dots or rays from the tick's centre, in the moment's colours, each flying 14 to 24px on its own
angle and fading over 400 to 600ms. Made once with `Element.animate()`; removed when done.

**A sheen.** One soft light band passing once across the value that matters: a `linear-gradient` in `background-clip:
text` or a masked pseudo-element moving from −100% to 200% in 700 to 1100ms.

**Springs.** For things the hand moves (drag, swipe, a switch), start the spring at the release velocity. Keep
bounce at 0.1 to 0.2 for controls (the overshoot must stay inside the track), up to 0.45 for a rare celebration.

**Physical feedback.** `navigator.vibrate` exists on Android only; call it inside the press handler, after
`navigator.userActivation.hasBeenActive`, never on load. Sound: a soft two-note chime made with Web Audio
(two sine oscillators, 30ms attack, 400ms release, gain under 0.08), created inside the press so Safari plays it, and
behind a `sound` prop that is off by default.

## Moments by component (starting points, not costumes)

| Component | A moment that belongs to its job |
|---|---|
| confirm, send, publish | light blooms from the pressed button; real steps roll by; colours sweep up and out as a tick draws |
| progress, tracker | the arriving step: its part fills, a soft light runs through the part in progress, the status rolls into the title; on completion the bar turns success from start to end and the tick lands |
| booking, picker | the chosen option lifts and the ink slides to it; the summary rolls in; confirm draws a tick on the booked time |
| list with gestures | the row stays under the finger; colour floods past the commit point; it leaves at the speed it was thrown; Undo rises |
| number input | digits roll; past a limit the value springs back with the limit said inside the field |
| theme switch | the new theme opens from the control in a growing circle while the icon morphs |
| resizable panes | the divider follows the hand exactly, snaps to sensible splits with a small tick, a collapsed pane folds to an edge tab |
| tags | typing a comma condenses the word into a chip that pops in; a duplicate shakes the existing chip once |
| checklist | finishing a step draws its tick, the progress ring fills, and the next step opens; the last one ends in a small celebration |
| split button | the menu grows from the chevron as it turns; a promoted choice morphs into the main label |

These are directions. The moment must still pass the three tests, and it must never draw the subject's world into
the UI (no postal routes, no paper, no stamps): the subject is in the content, the moment is in the job.

## Checking it

- **Frames:** pause all animations and step through them, or slow everything down:
  `document.getAnimations().forEach((a) => (a.playbackRate = 0.1))`, then take 10 to 14 screenshots across the moment and
  lay them side by side. Look for edges, flashes, jumps and wrong-colour frames.
- **Repeat it 20 times.** It must be as good the twentieth time, and never block the next action.
- **Reduced motion:** the same story in fades, no travel, no blur.
- **Cost:** compositor properties only (`transform`, `opacity`, `filter` on small layers); the loop sleeps when settled;
  no animation frame runs while nothing moves.
