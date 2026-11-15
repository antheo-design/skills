# Motion recipes

Plain CSS and small JS on the motion variables in antheo-build's style block (`--dur-*`, `--ease-*`, `--dist-*`,
`--scale-*`, `--blur-*`; the values are the tables in `SKILL.md`). Paste the block first: a transition that reads a
name nobody defined does not run at all, and the thing just jumps. One recipe per file in `recipes/`; each works under reduced motion. Copy one, then adjust
only through tokens. Put the base layer in global CSS first.

| # | Recipe | File |
|---|---|---|
| base | Base layer (put once in global CSS) | [`recipes/00-base.md`](recipes/00-base.md) |
| 1 | Press feedback | [`recipes/01-press-feedback.md`](recipes/01-press-feedback.md) |
| 2 | Hover | [`recipes/02-hover.md`](recipes/02-hover.md) |
| 3 | Popover / dropdown that grows from its trigger | [`recipes/03-popover-dropdown-that-grows-from-its.md`](recipes/03-popover-dropdown-that-grows-from-its.md) |
| 4 | Dialog | [`recipes/04-dialog.md`](recipes/04-dialog.md) |
| 5 | Bottom sheet that follows the finger | [`recipes/05-bottom-sheet-that-follows-the-finger.md`](recipes/05-bottom-sheet-that-follows-the-finger.md) |
| 6 | Toasts that don't block | [`recipes/06-toasts-that-don-t-block.md`](recipes/06-toasts-that-don-t-block.md) |
| 7 | Tooltips: delay once, then instant | [`recipes/07-tooltips-delay-once-then-instant.md`](recipes/07-tooltips-delay-once-then-instant.md) |
| 8 | Tab indicator that slides (no crossfade) | [`recipes/08-tab-indicator-that-slides-no-crossfade.md`](recipes/08-tab-indicator-that-slides-no-crossfade.md) |
| 9 | Accordion to `height: auto` | [`recipes/09-accordion-to-height-auto.md`](recipes/09-accordion-to-height-auto.md) |
| 10 | A list that arrives without blocking | [`recipes/10-a-list-that-arrives-without-blocking.md`](recipes/10-a-list-that-arrives-without-blocking.md) |
| 11 | Numbers that roll | [`recipes/11-numbers-that-roll.md`](recipes/11-numbers-that-roll.md) |
| 12 | A check that draws itself | [`recipes/12-a-check-that-draws-itself.md`](recipes/12-a-check-that-draws-itself.md) |
| 13 | Error shake (small) | [`recipes/13-error-shake-small.md`](recipes/13-error-shake-small.md) |
| 14 | Skeleton | [`recipes/14-skeleton.md`](recipes/14-skeleton.md) |
| 15 | Card → detail (shared element) | [`recipes/15-card-to-detail-shared-element.md`](recipes/15-card-to-detail-shared-element.md) |
| 16 | Theme switch without a color storm | [`recipes/16-theme-switch-without-a-color-storm.md`](recipes/16-theme-switch-without-a-color-storm.md) |
| 17 | Reveal on scroll (gentle, optional) | [`recipes/17-reveal-on-scroll-gentle-optional.md`](recipes/17-reveal-on-scroll-gentle-optional.md) |
| 18 | Switch with a spring | [`recipes/18-switch-with-a-spring.md`](recipes/18-switch-with-a-spring.md) |
| 19 | Like with a spring pop and a one-time burst | [`recipes/19-like-with-a-spring-pop-and.md`](recipes/19-like-with-a-spring-pop-and.md) |
| 20 | Checkbox whose check draws itself | [`recipes/20-checkbox-whose-check-draws-itself.md`](recipes/20-checkbox-whose-check-draws-itself.md) |
| 21 | Text morph: only the changed part blurs in | [`recipes/21-text-morph-only-the-changed-part.md`](recipes/21-text-morph-only-the-changed-part.md) |
| 22 | Soft value swap | [`recipes/22-soft-value-swap.md`](recipes/22-soft-value-swap.md) |
| 23 | Number pop-in for a count that appears | [`recipes/23-number-pop-in-for-a-count.md`](recipes/23-number-pop-in-for-a-count.md) |
| 24 | Input clear button that dissolves the text | [`recipes/24-input-clear-button-that-dissolves-the.md`](recipes/24-input-clear-button-that-dissolves-the.md) |
| 25 | Plus button that morphs into a menu | [`recipes/25-plus-button-that-morphs-into-a.md`](recipes/25-plus-button-that-morphs-into-a.md) |
| 26 | Avatar row where hovering one lifts it and its neighbours less | [`recipes/26-avatar-row-where-hovering-one-lifts.md`](recipes/26-avatar-row-where-hovering-one-lifts.md) |
| 27 | Stacked banners that collapse behind each other | [`recipes/27-stacked-banners-that-collapse-behind-each.md`](recipes/27-stacked-banners-that-collapse-behind-each.md) |
| 28 | Donut or progress ring that morphs between values | [`recipes/28-donut-or-progress-ring-that-morphs.md`](recipes/28-donut-or-progress-ring-that-morphs.md) |
| 29 | Notification badge entrance | [`recipes/29-notification-badge-entrance.md`](recipes/29-notification-badge-entrance.md) |
| 30 | "Learn more" link whose arrow nudges forward | [`recipes/30-learn-more-link-whose-arrow-nudges.md`](recipes/30-learn-more-link-whose-arrow-nudges.md) |
| 31 | Hold-to-confirm button | [`recipes/31-hold-to-confirm-button.md`](recipes/31-hold-to-confirm-button.md) |
| 32 | Clip-path inset reveal | [`recipes/32-clip-path-inset-reveal.md`](recipes/32-clip-path-inset-reveal.md) |
| 33 | A "thinking" shimmer on a status label | [`recipes/33-a-thinking-shimmer-on-a-status.md`](recipes/33-a-thinking-shimmer-on-a-status.md) |
| 34 | A reasoning stream that appears line by line and can be collapsed | [`recipes/34-a-reasoning-stream-that-appears-line.md`](recipes/34-a-reasoning-stream-that-appears-line.md) |
| 35 | Streaming text that arrives word by word through a short soft blur | [`recipes/35-streaming-text-that-arrives-word-by.md`](recipes/35-streaming-text-that-arrives-word-by.md) |
| 36 | A fill that slides to the chosen item, and the label colours that follow it | [`recipes/36-a-fill-that-slides-to-the.md`](recipes/36-a-fill-that-slides-to-the.md) |
| 37 | A row that leaves a list without a jump, and comes back on undo | [`recipes/37-a-row-that-leaves-a-list.md`](recipes/37-a-row-that-leaves-a-list.md) |
