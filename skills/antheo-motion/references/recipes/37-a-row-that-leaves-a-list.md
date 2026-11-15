# 37. A row that leaves a list, and comes back on undo

From antheo-motion. Values come from the tables in its `SKILL.md`; every recipe here works under reduced motion.

A removed row that vanishes makes everything below it jump, and the eye loses its place. The row fades first, then
its height closes, so the rows below slide up under it. Undo plays it backwards.

```css
.row-wrap { display: grid; grid-template-rows: 1fr; opacity: 1;
  transition: grid-template-rows var(--dur-base) var(--ease-out), opacity var(--dur-fast) var(--ease-out); }
.row-wrap > .row { overflow: hidden; min-height: 0; }             /* the one child clips while the track closes */
.row-wrap + .row-wrap > .row { box-shadow: inset 0 1px 0 var(--line); }   /* the hairline: an inset shadow takes no height, so it closes with the row */
.row-wrap.leaving { grid-template-rows: 0fr; opacity: 0; }
```

```js
function removeRow(wrap) {
  wrap.inert = true;                                              // out of the tab order and the reading order at once
  wrap.classList.add('leaving');                                  // it stays in the page, closed, while undo is possible
}
function undoRemove(wrap) {
  wrap.inert = false;
  wrap.classList.remove('leaving');                               // the same transition runs backwards: it grows back in place
}
function forget(wrap) { wrap.remove(); }                          // when the toast goes and undo can no longer happen
```

In a real `<table>`, rows can't animate their height: wrap each cell's content in a `div` and close those, or build
the list as `role="table"` grid rows. A border would keep 1px of the closed row on screen, which is why the
hairline is an inset shadow. Move focus to the next row's first control (or the list's heading if it was the
last), and say what happened in the toast ("Removed Dana Okafor", with "Undo"), never only by the row vanishing.
