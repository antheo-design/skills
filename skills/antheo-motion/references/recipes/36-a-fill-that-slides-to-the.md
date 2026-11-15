# 36. A fill that slides to the chosen item, and the label colours that follow it

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

One ink fill moves from the old choice to the new one (a segmented control, a grid of times, a tab). The labels change
colour as the fill passes them, not before: a new label that turns light before the fill arrives shows as light text
on the surface for a frame or two, which reads as a flash.

- Move one fill element (`translate` and `width`/`height` from the measured boxes, or a FLIP from the old box), 220 to 280ms
  on the house ease. Never fade one fill out and another in.
- **The arriving label:** delay its colour change to about 40% of the slide and run it for 30% (`transition: color 80ms
  linear 100ms` for a 250ms slide), so it turns as the fill covers it. **The leaving label:** turn it back at once, over
  the first 30%.
- Reduced motion: no slide; the fill and both labels change together in 120ms.
- Check it at 10% speed (DevTools animations panel, or `document.getAnimations().forEach(a => a.playbackRate = 0.1)`)
  and look for the frame where a label is the wrong colour on the wrong ground.
