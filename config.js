/* ============================================================
   MOM'S RECIPE JOURNAL — where the recipes are stored.

   Two modes. Change ONE line: `source`.

   ------------------------------------------------------------
   source: "local"     ← the default, zero setup
   ------------------------------------------------------------
   Recipes come from data/recipes.js and media from the media/
   folder, both committed to this repository. Good for getting
   started. Not good for lots of video — GitHub rejects any file
   over 100 MB and gets unhappy past about 1 GB in total.

   ------------------------------------------------------------
   source: "supabase"  ← recommended once you have real media
   ------------------------------------------------------------
   Recipes live in a Postgres database and photos, videos and
   voice notes live in Supabase Storage — not in git. Add a
   recipe from admin.html in the browser, no code, no commit.

   Set up in about ten minutes: docs/database-setup.md
   ============================================================ */

window.MRJ_CONFIG = {

  source: "local",              // "local" or "supabase"

  supabase: {
    // From your Supabase project → Settings → API
    url: "",                    // e.g. "https://abcdefgh.supabase.co"
    anonKey: "",                // the "anon / public" key — safe in the browser
    bucket: "recipe-media"      // the storage bucket you created
  }

  /* Note on the anon key: it is *designed* to be public. What it can
     actually do is decided by the Row Level Security policies in
     db/schema.sql — with those applied, anyone can read the recipes
     and only someone signed in can add or change them. */
};
