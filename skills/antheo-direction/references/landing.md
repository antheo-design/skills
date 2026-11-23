# Planning a landing page

Part of antheo-direction. For any landing, company or product page, Clean or Brand: it decides what the page shows
and in what order before anyone picks a colour. A Clean page then takes the style block (antheo-build); a Brand page
takes a direction from `directions.md` on top of the same plan. The words come from antheo-writing
`references/marketing.md`; the fact sheet there is filled first, because the plan is built from it.

**Choose, never deal.** Every step below is a choice made from the brief and said in one line, so the person can
change it. Picking a layout at random to look different is how a page ends up looking like every other page.

## 1. Name the kind, in one line

| Kind | Examples | The first screen must hold | The main action |
|---|---|---|---|
| **Software** | an app, a web service, a developer tool | the product's own screen, working, with real content | start a trial, sign up, install |
| **Product** | furniture, a device, food or drink, clothing | the thing itself, its name and its price | buy, order, pre-order |
| **Service** | a studio, a clinic, accountants, a trade | what is done, for whom, where, and how to start | book a call, get a quote |
| **Place** | a cafe, a shop, a gym, a hotel | what it is, where, and whether it is open now | book, or get directions |
| **Event** | a festival, a course, a launch | the date, the place, what happens | get a ticket, register |

A business that is two kinds (a bakery that ships) takes the kind of its main action. Write the line: "Kind: place,
because the brief's action is booking a fitting."

## 2. List the material the brief really has

Product screens you can build in HTML · the client's own photographs (and whether the page needs any: `photos.md`) · an object you can draw · an address and
hours · prices · real numbers · named quotes · a true founding story. Tick what exists; leave the rest out.

- **The hero is built from the strongest real material.** Software shows its screen; a product shows the object; a
  place shows where and when.
- **No real picture is no reason to fake one.** With nothing to show, the hero is the Statement composition: the
  category and one hard fact, set large. Never a text block beside an empty, grey or placeholder half.
- **A section exists only when the brief has material for it.** Five full sections beat eight thin ones.

## 3. Choose the sections

Four to seven, one sentence each before building. The usual order for each kind, to cut from, never to pad:

| Kind | Sections |
|---|---|
| Software | hero with the product · two or three things it does, each shown as a crop of the real screen · how it starts (three steps) · prices · questions · close |
| Product | hero with the object and price · what it is made of, as a spec table · how it is used · price, delivery and returns · questions · close |
| Service | hero · work done, as named examples · how it works, from first call to finished · prices or "from" prices · one real quote · contact |
| Place | hero with today's hours · what is there (the menu, the rooms, the classes) · visit: address, hours, getting there · booking · close |
| Event | hero with the date · the programme · tickets · getting there · questions |

Section rules (one edge, one ground, one gap) are in `scenes.md`.

## 4. Choose the hero composition

Five compositions cover nearly every page. Each has a finished page to open; all five pass antheo-review's page check
with `--landing`.

| Composition | Use it when | What it holds | Page |
|---|---|---|---|
| **Split** | software with a real screen | the h1, one line with a hard fact and the action on one side; the product's screen on the other, large and with real content | `pages/hero-split.html` |
| **Stage** | software or a tool whose screen is the reason to buy | the h1, the line and the action centred; the product full width below, starting inside the first screen | `pages/hero-stage.html` |
| **Object** | a physical product | the object drawn large beside its name, price and the buy action; the spec in a table below | `pages/hero-object.html` |
| **Visit** | a place | what and where, today's hours, the action, and the visit details as the picture; a phone bar with the action | `pages/hero-visit.html` |
| **Statement** | a service, or anything with no strong picture | the category and one hard fact set large, the action, then proof as plain text | `pages/hero-statement.html` |

An event's hero is the Statement with its date as the fact; `pages/poster.html` is the same idea as a Brand page.

**In every composition:**

- The h1, the line with the hard fact and the main action are all inside the first screen at 390px and at 1280px.
- One filled button. A second action is a quiet link.
- The picture is real: the product's screen built in HTML with real content, the object drawn, the client's photograph,
  the place's details. A stock photograph of "people at work" is not the product. Most pages need no photograph;
  when one does and the client has none, a stand-in fills a detail only (`photos.md`).
- A product screen or an object built as a picture is one image to a screen reader: `role="img"` with an
  `aria-label` that says what it shows, and `data-object` so the page check reads it as a drawing, not as controls.
- The hero is as tall as its content plus the section gap, not a fixed `100vh`: a fixed height clips on a short laptop
  screen and leaves a hole on a tall one.

## 5. What the plan does not decide

Colours, type, corners and spacing come from the style block (Clean) or from the direction (Brand). Motion is
antheo-motion's: a hero may have one entrance, and nothing else on the page needs to move. A rare moment is
antheo-moment's, and a landing page usually has none.

## Before building, one line each

```
Kind:         <kind>, because <the brief's main action>
Material:     <what exists>; missing: <what does not>
Sections:     <four to seven, in order>
Hero:         <composition>, because <material>
```
