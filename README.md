# Mom's Recipe Journal 🍲

A small cookbook website for Mom's recipes, laid out like the pages of her paper
recipe journal — the recipe card on one page, the method on the next — plus the
things a paper notebook can't hold: **her videos, her voice messages and her photos**.

Chapters: **Breakfast · Lunch · Dinner · Treats**

## What's in it

- Every recipe follows the notebook template: name, star rating, difficulty dots,
  portions, vegetarian / vegan / gluten-free / dairy-free markers, prep & cook time,
  a ticked ingredient list, *Hints, Tips & Tricks*, *Goes Great With*, and a numbered method.
- **Media on every recipe** — a video shelf, a voice-note player for the WhatsApp
  messages she sends, and a photo gallery with a click-to-enlarge lightbox.
- Search across titles, ingredients and steps.
- Filters (diet, time) and sorting (newest, top rated, quickest, A–Z).
- A portion stepper that scales the ingredient amounts up and down.
- Tick ingredients off while you shop and steps off while you cook — the ticks are remembered.
- ♥ Save your favourites, print a clean recipe card, light and dark themes.
- No frameworks, no build step, no install. Plain HTML, CSS and JavaScript.

## Running it

Just open `index.html` in a browser — that's it.

If your browser blocks local files, or you want it on your phone on the same Wi‑Fi:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

To put it online for the family, turn on **GitHub Pages** for this repository
(Settings → Pages → Deploy from branch → `main` / root). Nothing needs to be built.

## Adding a recipe

Everything lives in one file: **`data/recipes.js`**. There's a copy-paste template at
the top of that file, and the same guide is in [`docs/adding-a-recipe.md`](docs/adding-a-recipe.md)
and on the site itself under *How to add a recipe*.

The short version:

1. Put her media in the right folder:
   - photos → `media/images/`
   - videos → `media/videos/`
   - voice messages → `media/audio/`
2. Copy the template block in `data/recipes.js`, paste it into the list, and fill it in.
3. Save. Refresh the page. Done.

```js
{
  id: "aloo-paratha",
  title: "Aloo Paratha",
  category: "breakfast",            // breakfast | lunch | dinner | treats
  rating: 5,                        // 0–5 stars
  difficulty: 2,                    // 1–5 dots
  portions: 4,
  diet: { vegetarian: true, vegan: false, glutenFree: false, dairyFree: false },
  prep: { hrs: 0, mins: 30 },
  cook: { hrs: 0, mins: 20 },
  ingredients: ["2 cups wheat flour", "3 potatoes, boiled and mashed"],
  method: ["Knead the dough and rest it.", "Mix the filling."],
  hints: "Rest the dough — that is the whole secret.",
  goesWith: "Curd, butter and hot chai.",
  notes: "Sunday mornings, always.",
  addedOn: "2026-08-31",
  media: {
    images: [{ src: "media/images/aloo-paratha-1.jpg", caption: "Off the tawa" }],
    videos: [{ src: "media/videos/aloo-paratha.mp4", caption: "Mom rolling it out" }],
    audio:  [{ src: "media/audio/aloo-paratha.m4a",  caption: "Her note about the dough" }]
  }
}
```

## Layout

```
index.html            the whole site (one page, hash routing)
assets/css/style.css  the paper-and-ink styling
assets/js/app.js      rendering, search, filters, media players, lightbox
data/recipes.js       ← the recipes. This is the file you edit.
media/images/         photos she sends
media/videos/         videos you record
media/audio/          her voice messages
docs/                 how-to guide
```

## Note

The four recipes shipped in `data/recipes.js` are **examples** so the site isn't empty
on the first open. Delete them once Mom's real recipes are in.
