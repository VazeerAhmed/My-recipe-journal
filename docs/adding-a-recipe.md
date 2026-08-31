# Adding a recipe

Everything is one file: **`data/recipes.js`**. You never touch the HTML, CSS or JavaScript.

---

## Step 1 — save the media first

| What Mom sent | Where it goes | Good file names |
|---|---|---|
| A photo of the dish | `media/images/` | `aloo-paratha-1.jpg` |
| A video you recorded | `media/videos/` | `aloo-paratha.mp4` |
| A WhatsApp voice message | `media/audio/` | `aloo-paratha-voice.m4a` |

Rules of thumb:

- Lowercase names, dashes instead of spaces, no special characters.
- Photos: `.jpg`, `.png`, `.webp`. Resize very large photos — anything wider than
  about 2000 pixels just makes the page slow.
- Videos: `.mp4` plays everywhere. A long video is a big file, so if it's more than a
  few minutes, consider uploading it to YouTube (even as *Unlisted*) and pasting the
  link instead of the file — both work.
- Voice messages: `.m4a`, `.mp3` and `.ogg` all play. WhatsApp exports `.opus`, which
  some browsers refuse — if it doesn't play, convert it:
  `ffmpeg -i voice.opus voice.m4a`

---

## Step 2 — copy the template

Open `data/recipes.js`, copy the template block at the top of the file, and paste it
into the list as a new entry. Keep the comma between entries.

```js
window.RECIPES = [

  { …existing recipe… },

  {                                  // ← your new one
    id: "gajar-halwa",
    title: "Gajar Halwa",
    category: "treats",
    …
  }

];
```

---

## Step 3 — fill in the fields

| Field | What it is |
|---|---|
| `id` | A short unique name, lowercase, no spaces. It becomes the link to the recipe. |
| `title` | The name as she says it. |
| `subtitle` | Optional. One line under the title. |
| `category` | `breakfast`, `lunch`, `dinner` or `treats`. |
| `rating` | 0–5. Draws the stars, like the top-right of her notebook page. |
| `difficulty` | 1–5. Draws the row of dots. |
| `portions` | How many the recipe makes. The site scales the ingredients from this. |
| `diet` | `vegetarian`, `vegan`, `glutenFree`, `dairyFree` — `true` or `false` each. |
| `prep` / `cook` | `{ hrs: 0, mins: 30 }` |
| `ingredients` | One line per ingredient. **Start with the amount** (`"2 cups flour"`) so the portion scaler can do its job. |
| `method` | One line per step. They get numbered automatically. |
| `hints` | The *Hints, Tips & Tricks* box. |
| `goesWith` | The *Goes Great With* box. |
| `notes` | Anything she said that you don't want to lose. |
| `addedOn` | `YYYY-MM-DD`. Used to sort "recently added". |
| `media` | Her videos, voice notes and photos — see below. |

### The media block

```js
media: {
  images: [
    { src: "media/images/gajar-halwa-1.jpg", caption: "The colour she waits for" },
    { src: "media/images/gajar-halwa-2.jpg", caption: "" }
  ],
  videos: [
    { src: "media/videos/gajar-halwa.mp4", caption: "Stirring, at minute forty" },
    { src: "https://youtu.be/XXXXXXXXXXX",  caption: "The long version" }
  ],
  audio: [
    { src: "media/audio/gajar-halwa-voice.m4a", caption: "'Don't add the milk yet'" }
  ]
}
```

- Any of the three lists can be empty (`[]`). The page then shows a quiet placeholder
  instead of a player.
- `caption` is optional but it's the part you'll be glad about in ten years.
- YouTube links are detected automatically and embedded as a player.
- A photo can also be given as just a string: `images: ["media/images/x.jpg"]`.
- Want a specific photo as the card thumbnail? Add `cover: "media/images/x.jpg"` at
  the top level of the recipe. Otherwise the first image is used.

---

## Step 4 — check it

Open `index.html` (or run `python3 -m http.server 8000` and visit
`http://localhost:8000`) and click through to your new recipe.

If the page goes blank, it's almost always one of these:

- a missing comma between two recipes,
- a missing `"` around some text,
- an apostrophe inside double quotes is fine (`"Mom's"`), but a double quote inside
  double quotes is not — write `\"` or use a different quote.

Open the browser console (F12) and it will name the line.

---

## Step 5 — save it for good

```bash
git add .
git commit -m "Add Gajar Halwa"
git push
```
