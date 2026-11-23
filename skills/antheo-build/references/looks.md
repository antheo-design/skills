# The four looks

Part of antheo-build. The style block has four looks. **Quiet is the default and stays the default**: a look is
changed only when the request asks for it or clearly is that kind of product. Never ask which look; never switch
because a page "could be more interesting". Say the look in the four lines before code (`Style: Antheo Quiet`,
`Style: Antheo Studio` and so on).

| Look | Choose it when the request says or is | File, pasted after `quiet.css` | Page | Check with |
|---|---|---|---|---|
| **Quiet** | anything else: a product screen, settings, a form, a list, a dashboard, a pricing section, a component | none | `pages/` (ten) | `--preset quiet` (the default) |
| **Studio** | "pro tool", "dense", "editor", "IDE", "inspector", "workspace", "console", "trading", an audio, video or photo tool, many panes on one screen | `looks/studio.css` | `looks/studio.html` | `--preset studio` |
| **Editorial** | "article", "blog", "journal", "magazine", "docs", "case study", "story", "long read", a writer's or a studio's site | `looks/editorial.css` | `looks/editorial.html` | `--preset editorial` |
| **Playful** | "playful", "fun", "friendly", "for kids", "game", "habit", "learning", a consumer app meant to be enjoyed | `looks/playful.css` | `looks/playful.html` | `--preset playful` |

When two fit, the request's own words win over the kind of product ("a playful dashboard" is Playful). A project with
its own tokens keeps them (antheo-system); a page the person asked to be expressive takes a direction
(antheo-direction). The look and the project's system never mix: one or the other.

## What a look changes, and what it never does

A look file only redefines names the block already has, plus the face it needs. Every rule in antheo-build still
holds in every look: four text sizes on an app screen (five on a marketing section), two weights, three corner sizes,
cards without outlines, colour only for "on", one primary action, the main task on the first screen, contrast in light
and dark, 44px targets on touch.

| | Quiet | Studio | Editorial | Playful |
|---|---|---|---|---|
| Face | Geist | Geist | Newsreader headings, Geist text | Nunito |
| Body | 13/20px | 13/18px | 16/26px | 15/22px |
| Largest in an app | 20px | 16px | 28px | 22px |
| Control, row | 32, 40px | 28, 32px | 32, 40px | 40, 48px |
| Corners (tag, control, card) | 4, 6, 10px | 3, 4, 6px | 2, 4, 6px | 6, 12, 18px |
| Card padding | 20px | 12px | 24px | 24px |
| Ground | warm grey | warm grey | warm grey | warm cream (light only) |
| One exception to the rules | none | a hairline may divide panes | headings in a serif | none |

## In each look, what good looks like

- **Studio:** panes side by side, each with a 14px title and its own scroll; rows of 32px with values in tabular
  figures; the selected row is the one tinted thing in its pane; panes divided by a hairline, not by cards floating
  on a ground.
- **Editorial:** one column at the measure, the headline in the serif, a standfirst in the second tone, the byline and
  date in meta size, subheads every few paragraphs; a quote is set in the serif at title size, never in a box.
- **Playful:** fewer, bigger things on the screen; a chosen option is the accent fill with a tick, never colour
  alone; one primary action at the bottom; the play itself comes from antheo-creative, never from stickers, tilt or
  a texture on the chrome.

## Rebranding a look

`block.mjs --look studio` (or editorial, playful) writes the rebranded block with the look appended, so the accent,
neutral and face flags work on every look (antheo-tokens).
