# BiteDrop 🍫

A student-run snack store. Live at **https://aidenqneary-lab.github.io/-bitedrop/**

No build tools, no dependencies — plain HTML/CSS/JS, deployed with GitHub Pages.

## How it works

- **Store** ([index.html](index.html)) — product grid, cart, and checkout. Orders are
  emailed to the shop owner via [FormSubmit](https://formsubmit.co) with the subject
  `BITEDROP STORE`.
- **Inventory** ([products.json](products.json)) — the single source of truth for
  prices and stock. `"price": null` shows as "Price TBD".
- **Admin** ([admin.html](admin.html)) — edit prices and stock in the browser and hit
  Save; it commits `products.json` back to this repo and the live site updates in a
  minute or two. Saving requires a fine-grained GitHub token with **Contents: read &
  write** on this repo only.

## Local development

```sh
python3 -m http.server 4173
```

then visit http://localhost:4173.

## Images

Product photos are embedded in `products.json` as compressed JPEG data URIs, so the
whole store is a handful of text files. Full-resolution originals live in `images/`
locally (not deployed).
