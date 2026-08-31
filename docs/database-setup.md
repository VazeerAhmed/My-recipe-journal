# Giving the journal a real database

## Why

In file mode every photo, video and voice note is committed into this git repository.
That's fine for a handful of pictures and falls apart quickly after that:

- GitHub **rejects any single file over 100 MB** — a few minutes of phone video is often more than that.
- A repository is expected to stay **under about 1 GB**; you get warnings past 1 GB and hard limits above 5 GB.
- Git keeps **every version of every file forever**. Replace a 40 MB video once and the repo carries both copies for good.
- Anyone who clones the site downloads **all of the media**, all of the history, every time.
- GitHub Pages has its own limits: a **1 GB published site** and a soft 100 GB/month bandwidth cap.

Recipes are small — text will never be the problem. **Media is the problem.** So the fix is to move
the media (and, while we're at it, the recipes) out of git and into a service built for it.

---

## The options

| | Database | File storage | Free tier | Notes |
|---|---|---|---|---|
| **Supabase** ← what this repo uses | Postgres | Yes, built in | ~500 MB database + ~1 GB storage | One service for both, works from a static site, real logins and access rules. Best fit here. |
| **Firebase** (Google) | Firestore | Cloud Storage | ~1 GB Firestore + ~5 GB storage | Very capable, more moving parts, ties you to Google's SDKs. |
| **Cloudinary** | ✗ | Images + video | ~25 GB "credits" | *Excellent* at media — resizes and compresses automatically — but it isn't a database. Pair it with something else. |
| **Backblaze B2 / Cloudflare R2** | ✗ | Yes, cheap | 10 GB free (both) | Cheapest place to park big files. No database, no upload UI — you'd build both. |
| **YouTube (unlisted)** | ✗ | Video only | Unlimited | Genuinely the right answer for **long** videos. Unlisted means only someone with the link can watch. Already supported — paste the link. |

**Recommendation:** Supabase for everything, plus unlisted YouTube for any video longer than a
couple of minutes. That combination stays free for a family cookbook essentially indefinitely.

> Free-tier numbers move around. Check [supabase.com/pricing](https://supabase.com/pricing) for
> today's limits before you rely on them.

---

## Setting up Supabase — about ten minutes

### 1. Make a project

Go to [supabase.com](https://supabase.com), sign up, and create a new project. Pick a region near
you and save the database password somewhere safe (you won't need it for this site).

### 2. Create the table and the media bucket

In the left sidebar open **SQL Editor** → **New query**. Open `db/schema.sql` from this repository,
paste the whole thing in, and press **Run**.

That creates the `recipes` table, the `recipe-media` storage bucket, and the access rules:
**anyone can read the journal, only someone signed in can change it.**

### 3. Create your login

**Authentication** → **Users** → **Add user** → **Create new user**. Use your own email and a
password you'll remember. This is the login for `admin.html`.

Then close the door behind you: **Authentication** → **Sign In / Providers** → turn **off**
*"Allow new users to sign up"*. Otherwise a stranger could create an account and write to the journal.

### 4. Point the website at it

**Project Settings** → **API**. Copy the **Project URL** and the **anon / public** key into
`config.js`:

```js
window.MRJ_CONFIG = {
  source: "supabase",
  supabase: {
    url: "https://abcdefgh.supabase.co",
    anonKey: "eyJhbGciOi…",
    bucket: "recipe-media"
  }
};
```

> **Is it safe to publish the anon key?** Yes — that's what it's for. It identifies your project,
> it doesn't grant permission. What it can actually do is decided by the row-level security
> policies from step 2. The key you must *never* put in this file is the **`service_role`** key,
> which bypasses all of them.

### 5. Move the existing recipes over

Open `admin.html`, sign in, and press **"Import the 4 from data/recipes.js"**. Done.

### 6. Add recipes from now on

`admin.html` — sign in, fill the form, drop the photos, videos and voice notes in, save.
No editing files, no commits. Bookmark it on your phone.

---

## Day to day

**Adding a recipe:** open `admin.html`, press *+ New recipe*.

**Where files go:** each recipe gets a folder in the bucket named after its short id, e.g.
`gajar-halwa/her-photo-01.jpg`. The site builds the public URL for you.

**Upload size:** direct uploads are capped (5 GB on paid plans, but **50 MB by default on the free
tier** — check **Storage → Settings**). A long video will be rejected with a clear message.
Upload it to YouTube as *Unlisted* and paste the link instead — the site embeds it and it costs
you no storage at all.

**Voice notes:** WhatsApp exports `.opus`, which some browsers refuse to play. Convert first:

```bash
ffmpeg -i voice.opus voice.m4a
```

**Backups.** The recipes are the irreplaceable part, and they're tiny. Supabase's free tier does
not include automatic backups, so take your own now and then:

```bash
curl -s "https://YOUR-PROJECT.supabase.co/rest/v1/recipes?select=*" \
  -H "apikey: YOUR-ANON-KEY" > backup-$(date +%F).json
```

Commit that file to this repository. Text is exactly what git is good at.

---

## Going back to file mode

Set `source: "local"` in `config.js`. The site returns to `data/recipes.js` and the `media/` folder.
Nothing is deleted — both modes can coexist, and recipes imported into the database keep working
because a `media/…` path is always read from the repository, never from the bucket.

## If something goes wrong

- **"Couldn't reach the recipe database"** — check `url` and `anonKey` in `config.js`, and that
  you ran `db/schema.sql`.
- **The journal is empty but the database has rows** — the read policy didn't apply. Re-run
  `db/schema.sql`; it's safe to run twice.
- **Sign in fails** — the user exists under **Authentication → Users**? Sign-ups being disabled
  does not affect signing in.
- **Saving fails with a permissions error** — you're signed out. Sign in again; the session is
  deliberately dropped when you close the tab.
- **A photo shows as broken** — the bucket must be **public** for reads. Step 2 sets that; confirm
  under **Storage → recipe-media → Settings**.
