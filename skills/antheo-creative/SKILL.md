---
name: antheo-creative
description: Makes a component playful, surprising and fun to use, so people fiddle with it for no reason. It finds the play in a reference (every effect it shows or implies, from a still or a video) or, with no reference, from what the component is and the real thing it is like, then builds that play in layers (the press, the material's own feedback, physics, a character, an idle life, a surprise) without ever slowing the task or breaking access. Use for widgets, toys, objects, onboarding, empty states, rewards and brand pieces, or whenever asked to make something "fun", "playful", "creative", "delightful", "alive", "interesting" or "less boring". One rare peak event (a payment sent, a code accepted) is antheo-moment's.
---

# Antheo Creative

Correct makes a component trustworthy; play makes people come back to it. Play is not decoration added at the end:
it is the behaviour of the thing, designed first. A radio that jumps between stations is correct. A radio whose screen
fills with static while it searches, whose needle wobbles and settles, whose little character covers its ears between
stations, is the one people keep tuning for fun.

This skill decides what the play is and builds it. How long things take and how they ease is **antheo-motion**; the
material, light and depth of a drawn object is **antheo-surface** (`references/objects.md`); a rare, meaningful peak
(a payment sent) is **antheo-moment**. Every part of the "always" list in **antheo-build** still holds.

## Decide in this order

1. **Is play right here?** Yes for widgets, toys, objects (a radio, a dial, candy buttons, a card stack), onboarding,
   empty states, rewards, games and brand pieces, and whenever the person asks. Quieter for a dense data screen, a
   form someone fills under pressure, settings: there, at most a press that feels physical and one small surprise.
2. **Find the toy.** The one thing a person would do with it again and again just because it feels good: tune
   through the static, squash the candy, flick the stack, drag the knob past its clicks. Name it in one sentence.
3. **Find the play** in the reference, or invent it from the component (below).
4. **Give it a body** (below): its own colours, a size its face can be read at, its setting.
5. **Build it in layers** (the table below): only the layers this thing needs, each one rich.
6. **Make it safe:** it answers at once, never blocks the task, can be interrupted, and tells the same story under
   reduced motion.
7. **Test the fun** (below), film it, fix, film again.

## From a reference: list every effect, then the ones it implies

Look at the reference closely (every frame of a video; for a still, zoom to 3×) and write down:

- **What it shows:** each visible effect: glow, gloss, grain, extrusion, a character's pose, sparkles.
- **What moves** (from frames): what grows, sways, pops, loops, and its timing. If the reference only exists as a
  video, the frames are the spec.
- **What it implies:** a still shows rest, never life. A radio implies tuning, static and a settling needle; candy
  implies squash; a sticker implies peel and wobble; a stat card implies counting up. Add these.
- **Its signature:** the one or two effects that make it this thing. Match them exactly; they are why it was chosen.

Then make the words, characters and data your own; keep the play.

## With no reference: find the play in what it is

1. **What kind of component is it?** A control (toggle, slider, picker), a container (card, list, sheet), feedback
   (progress, empty, success), or an object (a widget that stands for a real thing).
2. **What real thing is it like?** A toggle is a light switch, a slider is a fader, a picker is a dial, a list of
   choices is a deck of cards, a progress bar is a kettle filling up, an empty inbox is a quiet desk.
3. **What does that real thing do that feels good?** The switch snaps past the middle; the fader has a notch at zero;
   the dial clicks; cards fan; the kettle steams, then whistles.
4. **Three ideas, pick one.** Write three plays in one line each, pick the one that serves the job best and that the
   person would remember. One idea carried through every layer beats five unrelated tricks.

`references/ideas.md` holds plays by component, to start from, never to copy whole.

## Give it a body

The play is half of a toy; the other half is how it looks before anyone touches it. A toy drawn in the block's
greys, small, alone on a wide empty card, reads as a wireframe of a toy, however good its motion is.

- **Its own colours.** A toy, a character or an illustration is content, not chrome: two to four colours taken from
  the subject (a blue mailbox with a red flag, a yellow sun in a blue sky, a pink heart), defined once on its root
  like an object's (antheo-surface `references/objects.md`), with its root marked `data-object`. The rule that
  colour means "on" is for the chrome around it.
- **A size its face can be read at.** On its stage the drawn part is 96 to 200px, so its detail and its expressions
  show. The real-size version (a 20px heart in a toolbar) is in the states sheet or beside it.
- **Its setting.** The like button under a photo, the toggle in its settings row, the empty state inside its inbox
  frame (antheo-build, "aim higher", step 4). One believable piece of content, never a page of chrome.
- **Type that fits the stage.** The words that belong to the toy (its title, its one line of help) may step up one
  or two sizes on its stage; the states sheet under it stays in the block's sizes.

## The layers of play

| Layer | What it is | Examples |
|---|---|---|
| **Press** | the hand is felt at once | squash and stretch, a deeper press with a wobble back, a ripple from the exact press point |
| **Anticipation** | it notices you before you act | a lean towards the pointer, a magnetic pull, a hover that lifts or peeks |
| **Material feedback** | the thing behaves as its material | static or grain on a screen while it searches, a shimmer across foil, a glint, a glow that warms |
| **Physics** | it has weight | springs that follow speed, inertia after a flick, rubber-banding at the ends, detents that click |
| **Character** | something reacts to what happens | a mascot that sleeps when paused, looks around while searching, cheers when done; eyes that follow the pointer |
| **Idle life** | alive when nothing happens | a slow breath, a blink every few seconds, a sparkle that twinkles; pauses when off screen |
| **Transitions** | states morph, never swap | play becomes pause by morphing, a number rolls, a filter count ticks, a card flips |
| **Surprise** | a reward for curiosity | a different reaction on the fifth press, a rare variant, a secret when dragged too far |
| **Sound** (opt-in) | a tiny voice for the press | a soft click, a blip, a hiss, made with Web Audio, off by default, never on load |

A component needs two to four of these, each done well, not all nine done thinly. The press and one material or
physics layer come first; character and surprise make it memorable.

## Safe play: the rules that never bend

- **It answers at once:** the first change within 100ms of the press, even when the full play runs longer.
- **It never blocks the task:** the next press works mid-animation; nothing waits for an animation to finish.
- **It can be interrupted and reversed:** springs and transitions, not one-way keyframes, for anything toggled.
- **Reduced motion keeps the story:** travel, wobble, bounce and loops become a short fade or an instant change; the
  character still changes state, the static still shows as a still texture, the count still updates.
- **Loops pause:** idle life stops when off screen and has a pause control if it runs over five seconds (WCAG 2.2.2).
  A character that moves only while something plays (a mascot bopping to a radio) is paused by that thing's own
  pause button, and that counts.
- **A reference caught mid-play starts at rest.** A still that shows a radio playing, a timer running or a video
  rolling is one frame of its life. The build opens paused and silent, one press from that frame, and the playing
  state is in the states sheet. Sound and autoplay never start before a press: browsers block them, and so would the
  person in a quiet room.
- **It's cheap:** `transform` and `opacity` for movement; noise and particles on a small canvas or a pre-made texture;
  no layout animation; smooth on a mid-range phone, measured: `node <antheo-review>/scripts/latency-probe.mjs <url>
  --play "<the toy's selector>" --cpu 4` presses it, times every frame for two seconds on a CPU slowed four times,
  and passes (exit 0) only when no frame runs over 33ms and 95% are on time.
- **Access holds:** every playful control is still a real control with a name, a role, keyboard use and a visible
  focus ring; anything done by dragging, flicking or shaking can also be done with one press or a key (2.5.7, 2.5.4); a character is `aria-hidden` and its state is said in words where it matters.
- **The play lives in the thing.** The page around it stays calm (antheo-build).

## Test the fun

1. **The first look.** At rest, before anyone touches it: does it invite a touch? A toy that looks like a plain
   icon until it is held has hidden its play. Show a hint of the play at rest (a heart with a little fill in it, a
   thumb that leans, a plane poised to fly), stage it in its setting (antheo-build, "aim higher", step 4), and say
   what to try in one short line.
2. **The fiddle test.** Would someone press, drag or flick it again for no reason? If not, the toy isn't there yet.
3. **The twentieth time.** Use it twenty times in a row: still pleasant, never slower, never in the way.
4. **The frame test.** Film it (antheo-motion `scripts/filmstrip.mjs`): every frame composed; the play visible in the
   frames, not only described in the notes.
5. **Beside the reference** (antheo-review `scripts/beside.mjs`), when there is one: every effect on the list is in
   the build.
6. **The plain version.** Turn on reduced motion: it still works, still tells the story, still has its character.

## What goes wrong

- **The fun cut out to pass a rule.** App timing rules (300ms, "the more often it's seen, the less it moves") are for
  menus and fields, not for the play of an object.
- **Tricks without an idea.** A sparkle here, a bounce there, a gradient on hover: noise. One idea, many layers.
- **Play that blocks.** A celebration you must wait through; a button disabled until its animation ends.
- **Copying the reference's content.** Match its effects and feel; write your own words, draw your own character.
- **Only on the happy path.** The play is designed for empty, loading, error and disabled too: a character that
  shrugs at an error is play; a frozen widget is not.
- **A grey toy on an empty card.** Chrome colours, 40px tall, no setting: correct, and nobody reaches for it. Give
  it a body.
- **Play you have to discover.** The best part needs a hold or a drag, and at rest it is a small grey icon on an
  empty card. Hint at it at rest and name it in a line.

## Done

- [ ] The toy named in one sentence, and it's the richest part of the build
- [ ] From a reference: every shown and implied effect listed, the signature matched exactly; without one: three
      ideas written, one picked
- [ ] Two to four layers of play, each done well; character or surprise where it fits
- [ ] Answers within 100ms, never blocks, interruptible; reduced motion keeps the story; loops pause
- [ ] It has a body: its own two to four colours, 96px or more on its stage, in its setting
- [ ] The play measured with `latency-probe.mjs --play` at `--cpu 4`: no frame over 33ms
- [ ] The first look invites a touch: the play hinted at rest, in its setting, with one line on what to try
- [ ] The fiddle test, the twentieth time and the frame test passed; filmed and the frames read
- [ ] Every playful control is still a real control (antheo-access)

## Files

- `references/examples.md`: what goes wrong and the fix, from the skills page and from real builds; when the default is wrong
- `references/effects.md`: how to build each effect: squash and stretch, press ripples, springs with velocity,
  magnetic hover, tilt and glare, static and grain on a canvas, shimmer, rolling digits, particle bursts, a reacting
  character, a Web Audio click, all with reduced motion
- `references/ideas.md`: plays by component (toggles, sliders, pickers, buttons, cards, lists, progress, empty states,
  success, widgets), to start from
