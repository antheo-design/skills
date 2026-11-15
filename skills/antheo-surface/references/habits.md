# What generated UI gets wrong here

Part of antheo-surface. Read it before calling the work done, and check the build against each habit.

Seen again and again in agent-built pages (detector catalogues and audits, 2025 to 26). Check for each.

- **The same big soft shadow on every box** (a blur of 20px or more under each card). At rest a card is nearly
  flat (`--sh-card`); a real drop is only for what floats: a menu, a dialog, the one lifted card.
- **Border, shadow and tint together** on one card. One signal of depth.
- **The "not generated" costumes:** a hard offset shadow with no blur, a coloured stripe on the top or side edge, a
  glow or `text-shadow` on text, a grid or dot pattern behind the page. None of them.
- **An icon in a tinted tile** (round or rounded-square) above every heading. The icon beside the text with no
  container, or no icon.
- **Text 2px from an edge:** a label touching its button's side, copy against a filled box. Padding from the scale,
  equal on both sides.
- **Pill corners on things that aren't controls,** or a huge radius on a small card. Corners by role.
- **Fake product chrome drawn in boxes:** a browser bar, a phone frame, a dashboard made of grey bars; a gradient
  block where a picture should be; a mascot or scene drawn from circles. The real screen, a real image, or no slot.
- **Two or three icon sets in one build.** One set, one stroke.
