# Photographs: only when the page needs one

Part of antheo-direction. Most pages need no photograph. A photograph earns its place only when it shows something
the words, the product's own screen or a drawing cannot. When in doubt, leave it out: a page with no picture is
finished; a page with the wrong picture is not.

## 1. Does this page need a photograph at all?

| Kind (landing.md) | Usually | Why |
|---|---|---|
| Software | **none** | the product's own screen is the picture |
| Product | the client's photograph of the product, or the object drawn | a photograph of a similar product is a lie about this one |
| Service | **none**, or the client's photographs of real work | the words, the prices and the steps carry it |
| Place | the client's photographs; a few details may be stand-ins | people come to a place to see it, so a page without it is thin |
| Event | **none**, or last year's real photographs | the date, the place and the programme carry it |

A slot gets a photograph only if you can say in one line what it shows that nothing else on the page does ("the crumb
of the bread", "the bench where shoes are fitted"). If the line is a mood ("warmth", "craft", "community"), there is
no slot.

## 2. Where it comes from, in this order

1. **The client's own.** Named in the brief, shot for the page or on a phone. Ask for them; give the shot list below.
2. **A stand-in**, only when the client has none yet, only for a **detail** (an ingredient, a material, a tool, a
   texture, a process), and three on a page at most. Never the main picture, never a person or a face, never a
   shopfront, a room, the product or anything branded: each of those would show a stranger's business as this one.
3. **Nothing.** No network, no fitting photograph, or any doubt: the slot goes. The hero becomes the Statement
   composition, the object is drawn, or the section stands on its words. Never a grey box, a placeholder or an
   illustration of people pretending to be a photograph.

## 3. Getting a stand-in

```bash
node <antheo-direction>/scripts/stand-ins.mjs search "sourdough crumb close up" --n 6
node <antheo-direction>/scripts/stand-ins.mjs fetch wc:"File:Sourdoughbreadcrumb.jpg" --out public/stand-ins --slot "crumb"
node <antheo-direction>/scripts/stand-ins.mjs credits public/stand-ins
```

It searches Openverse and Wikimedia Commons, which need no key, and keeps only licences that allow business use and
editing (CC0, public domain, CC BY, CC BY-SA). It leaves out pictures tagged as showing people or brands and anything
under 1200px wide, prefers a 1600px copy, reads the licence again when it downloads, and records each file in
`stand-ins.json`.

**Look at every candidate full size before fetching it**, and again on the page: tags miss faces, logos, a sign in the
background, watermarks and the wrong subject. Search for the detail itself ("flour on a wooden bench"), never for the
business ("bakery").

## 4. On the page

- Paste the `<img>` fetch prints: it carries `data-source="stand-in"`, `data-credit` and `data-license`, its width and
  height, and `loading="lazy"`. Rewrite its `alt` for this page.
- Put the credits line `credits` prints in the footer. CC BY and CC BY-SA require it; public domain gets it as a
  courtesy.
- No filter, duotone, grain or tint on any photograph, and no text over a stand-in.
- antheo-review's page check holds the work open on a stand-in with no visible credit or one used as the main
  picture, and lists every stand-in to replace.

## 5. In the report

Under **To replace before launch**, every stand-in with its slot and credit, and this shot list for the client, so
their own photographs can take the stand-ins' places: the front from across the street, the room from the door, the
counter or the bench, three products on one surface in window light, hands at work, one close detail. A phone in
landscape, no flash, no filter, a clean lens.
