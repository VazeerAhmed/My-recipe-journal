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

## Where the recipes live

The journal runs in one of two modes — one line in `config.js` decides which.

| | **File mode** (`source: "local"`) | **Database mode** (`source: "supabase"`) |
|---|---|---|
| Recipes | `data/recipes.js`, committed to git | Postgres table |
| Media | `media/`, committed to git | Supabase Storage |
| Adding a recipe | + Add button → export → commit | + Add button, and that's it |
| Good for | getting started, a few photos | real video and voice notes |
| Setup | none | ~10 minutes, free |

It ships in **file mode** so it works the moment you open it.

**Switch to database mode once you have real media.** Git is the wrong place for video: GitHub
rejects any file over 100 MB, wants repositories under about 1 GB, and keeps every version of
every file forever — replace one 40 MB video and the repo carries both copies permanently.

[`docs/database-setup.md`](docs/database-setup.md) walks through it, and compares Supabase against
Firebase, Cloudinary, Backblaze/R2 and unlisted YouTube. Short version: **Supabase**, because it's
the only free option that gives you the database *and* the file storage in one place and works
straight from a static site. For any video longer than a couple of minutes, upload it to YouTube as
*Unlisted* and paste the link — the site embeds it and it costs no storage.

### The writing desk

`admin.html` is where recipes get added, in **either** mode — the **+ Add recipe** button goes
straight there. In file mode it needs no sign-in and saves into your browser. In database mode it
asks you to sign in and saves online; reading the journal never needs a login, changing it does.

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

**Press "+ Add recipe".** It's in the header of every page, and on the home page.
That opens the writing desk: fill in the form, drop her photos, videos and voice notes in, save.
It works immediately, with no setup and no sign-in — nothing to install, no file to edit.

Where it saves depends on the mode:

- **File mode (default):** saved in your browser, and the recipe appears in the journal on
  *this device* right away. When you want it on the real website, press **Export recipes.js**,
  drop that file into `data/`, put the media files where the on-screen list says, and commit.
- **Database mode:** saved online instantly and visible to everyone, on every device. No export step.

If the exporting gets tedious, that's the signal to spend ten minutes on
[`docs/database-setup.md`](docs/database-setup.md).

### Editing the file by hand

Still perfectly possible — the recipes are just a list in **`data/recipes.js`**. There's a copy-paste template at
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
index.html               the journal (one page, hash routing)
admin.html               the writing desk — add recipes in database mode
config.js                ← file mode or database mode. One line.
assets/css/style.css     the paper-and-ink styling
assets/js/app.js         rendering, search, filters, media players, lightbox
assets/js/store.js       the data layer — file mode and Supabase, plain fetch()
assets/js/browser-db.js  IndexedDB, so the + Add button works with no setup
assets/js/admin.js       the recipe form and the uploader
data/recipes.js          the recipes in file mode
db/schema.sql            the table, the media bucket and the access rules
media/images|videos|audio   media in file mode
docs/                    how-to guides
```

## Note

The four recipes shipped in `data/recipes.js` are **examples** so the site isn't empty
on the first open. Delete them once Mom's real recipes are in.
