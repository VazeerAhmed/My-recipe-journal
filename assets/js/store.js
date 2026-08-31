/* ============================================================
   Mom's Recipe Journal — the data layer.

   One job: hand the app a list of recipes, wherever they live.
     • source "local"    → data/recipes.js + the media/ folder
     • source "supabase" → Postgres + Supabase Storage over REST

   Talks to Supabase with plain fetch(), so there is no SDK to
   load and nothing to install.
   ============================================================ */
window.MRJStore = (function () {
  "use strict";

  var CFG = window.MRJ_CONFIG || { source: "local" };
  var SB = CFG.supabase || {};
  var CACHE_KEY = "mrj:cache:v2";

  function configured() {
    return CFG.source === "supabase" && !!SB.url && !!SB.anonKey;
  }

  function base() { return String(SB.url || "").replace(/\/+$/, ""); }

  function headers(extra) {
    var h = { apikey: SB.anonKey, Authorization: "Bearer " + (token() || SB.anonKey) };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }

  /* ---------------- media URLs ----------------
     A media `src` can be any of three things:
       "https://…"            → used exactly as given (YouTube, any CDN)
       "media/images/x.jpg"   → a file committed in this repository
       "aloo/x.jpg"           → an object in the Supabase storage bucket
  */
  function mediaUrl(src) {
    src = String(src || "");
    if (!src) return "";
    if (/^(https?:)?\/\//i.test(src) || src.indexOf("data:") === 0) return src;
    if (src.indexOf("media/") === 0 || src.indexOf("./") === 0) return src;
    if (!configured()) return src;
    return base() + "/storage/v1/object/public/" + encodeURIComponent(SB.bucket || "recipe-media") + "/" +
      src.split("/").map(encodeURIComponent).join("/");
  }

  /* ---------------- row <-> recipe mapping ---------------- */

  function fromRow(row) {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle || "",
      category: row.category,
      rating: row.rating || 0,
      difficulty: row.difficulty || 1,
      portions: row.portions || 1,
      diet: row.diet || {},
      prep: row.prep || { hrs: 0, mins: 0 },
      cook: row.cook || { hrs: 0, mins: 0 },
      ingredients: row.ingredients || [],
      method: row.method || [],
      hints: row.hints || "",
      goesWith: row.goes_with || "",
      notes: row.notes || "",
      cover: row.cover || "",
      addedOn: row.added_on || "",
      media: row.media || { images: [], videos: [], audio: [] }
    };
  }

  function toRow(r) {
    return {
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || null,
      category: r.category,
      rating: Number(r.rating) || 0,
      difficulty: Number(r.difficulty) || 1,
      portions: Number(r.portions) || 1,
      diet: r.diet || {},
      prep: r.prep || { hrs: 0, mins: 0 },
      cook: r.cook || { hrs: 0, mins: 0 },
      ingredients: r.ingredients || [],
      method: r.method || [],
      hints: r.hints || null,
      goes_with: r.goesWith || null,
      notes: r.notes || null,
      cover: r.cover || null,
      added_on: r.addedOn || new Date().toISOString().slice(0, 10),
      media: r.media || { images: [], videos: [], audio: [] }
    };
  }

  /* ---------------- cache ----------------
     The recipes are shown from cache instantly, then refreshed
     from the database in the background. Also means the journal
     still opens if the wifi is down.
  */
  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return c && Array.isArray(c.rows) ? c.rows : null;
    } catch (e) { return null; }
  }
  function writeCache(rows) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows: rows })); } catch (e) {}
  }

  /* ---------------- reading ---------------- */

  function fetchRemote() {
    return fetch(base() + "/rest/v1/recipes?select=*&order=added_on.desc", { headers: headers() })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error("Database said " + res.status + ": " + t); });
        return res.json();
      });
  }

  /* load({ onUpdate }) resolves with the first list it can show and
     calls onUpdate later if the network brings something newer. */
  function load(opts) {
    opts = opts || {};

    if (!configured()) {
      if (CFG.source === "supabase") {
        console.warn("[journal] source is \"supabase\" but url/anonKey are empty in config.js — falling back to data/recipes.js");
      }
      return Promise.resolve((window.RECIPES || []).slice());
    }

    var cached = readCache();
    var network = fetchRemote().then(function (rows) {
      writeCache(rows);
      return rows.map(fromRow);
    });

    if (cached && cached.length) {
      network.then(function (fresh) {
        if (opts.onUpdate) opts.onUpdate(fresh);
      }).catch(function (err) {
        console.warn("[journal] showing the cached copy — " + err.message);
      });
      return Promise.resolve(cached.map(fromRow));
    }

    return network.catch(function (err) {
      console.error("[journal] " + err.message);
      if (opts.onError) opts.onError(err);
      return (window.RECIPES || []).slice();   // last resort: whatever is in the repo
    });
  }

  /* ---------------- auth (used by admin.html) ---------------- */

  function token() {
    try { return sessionStorage.getItem("mrj:token") || ""; } catch (e) { return ""; }
  }

  function signIn(email, password) {
    return fetch(base() + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: SB.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error_description || body.msg || body.message || "Sign in failed");
        try {
          sessionStorage.setItem("mrj:token", body.access_token);
          sessionStorage.setItem("mrj:email", email);
        } catch (e) {}
        return body;
      });
    });
  }

  function signOut() {
    try { sessionStorage.removeItem("mrj:token"); sessionStorage.removeItem("mrj:email"); } catch (e) {}
  }

  function currentEmail() {
    try { return sessionStorage.getItem("mrj:email") || ""; } catch (e) { return ""; }
  }

  /* ---------------- writing (used by admin.html) ---------------- */

  function saveRecipe(recipe) {
    return fetch(base() + "/rest/v1/recipes", {
      method: "POST",
      headers: headers({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      }),
      body: JSON.stringify([toRow(recipe)])
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(t || ("Save failed (" + res.status + ")")); });
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      return res.json();
    });
  }

  function deleteRecipe(id) {
    return fetch(base() + "/rest/v1/recipes?id=eq." + encodeURIComponent(id), {
      method: "DELETE", headers: headers()
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(t || ("Delete failed (" + res.status + ")")); });
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      return true;
    });
  }

  /* Uploads one file to the storage bucket and returns its object path.
     `path` is like "aloo-paratha/tawa.jpg". */
  function uploadFile(path, file, onProgress) {
    var bucket = SB.bucket || "recipe-media";
    var url = base() + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" +
      path.split("/").map(encodeURIComponent).join("/");

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", "Bearer " + (token() || SB.anonKey));
      xhr.setRequestHeader("apikey", SB.anonKey);
      xhr.setRequestHeader("x-upsert", "true");
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = function (e) {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve(path);
        else if (xhr.status === 413) reject(new Error("That file is too big for a direct upload. See docs/database-setup.md — for long videos, use a YouTube link instead."));
        else reject(new Error("Upload failed (" + xhr.status + "): " + xhr.responseText));
      };
      xhr.onerror = function () { reject(new Error("Upload failed — network error")); };
      xhr.send(file);
    });
  }

  function deleteFile(path) {
    var bucket = SB.bucket || "recipe-media";
    return fetch(base() + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" +
      path.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: headers() });
  }

  return {
    source: CFG.source,
    configured: configured,
    load: load,
    mediaUrl: mediaUrl,
    fromRow: fromRow,
    toRow: toRow,
    signIn: signIn,
    signOut: signOut,
    token: token,
    currentEmail: currentEmail,
    saveRecipe: saveRecipe,
    deleteRecipe: deleteRecipe,
    uploadFile: uploadFile,
    deleteFile: deleteFile
  };
})();
