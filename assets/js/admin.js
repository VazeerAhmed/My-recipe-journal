/* ============================================================
   Mom's Recipe Journal — the writing desk.

   Sign in, fill the form, drop the photos / videos / voice notes
   in, save. Media goes to Supabase Storage, the recipe goes to
   Postgres, and the website picks both up on the next refresh.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("admin");
  var whoEl = document.getElementById("who");
  var signoutBtn = document.getElementById("signout");

  var CATEGORIES = ["breakfast", "lunch", "dinner", "treats"];
  var DIETS = [
    ["vegetarian", "Vegetarian"], ["vegan", "Vegan"],
    ["glutenFree", "Gluten-free"], ["dairyFree", "Dairy-free"]
  ];
  var KINDS = [
    { key: "videos", label: "Videos", icon: "", accept: "video/*", hint: "Clips you filmed. Long ones are better as a YouTube link — see below." },
    { key: "audio",  label: "Voice notes", icon: "", accept: "audio/*", hint: "Her WhatsApp voice messages. .m4a and .mp3 play everywhere; .opus often doesn't." },
    { key: "images", label: "Photos", icon: "", accept: "image/*", hint: "Photos she sends. The first one becomes the recipe's thumbnail." }
  ];

  var recipes = [];       // everything in the database
  var draft = null;       // the recipe being edited

  /* ---------------- helpers ---------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function slug(s) {
    return String(s || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("go"); }, 4200);
    setTimeout(function () { t.remove(); }, 4800);
  }

  function blank() {
    return {
      id: "", title: "", subtitle: "", category: "breakfast",
      rating: 5, difficulty: 2, portions: 4,
      diet: { vegetarian: false, vegan: false, glutenFree: false, dairyFree: false },
      prep: { hrs: 0, mins: 0 }, cook: { hrs: 0, mins: 0 },
      ingredients: [], method: [],
      hints: "", goesWith: "", notes: "", cover: "",
      addedOn: new Date().toISOString().slice(0, 10),
      media: { images: [], videos: [], audio: [] }
    };
  }

  /* ---------------- screens ---------------- */

  function screenNoStorage() {
    root.innerHTML =
      '<div class="page-head"><h1>This browser can&rsquo;t save recipes</h1></div>' +
      '<div class="prose"><p>The form needs IndexedDB, which is switched off here — often the case in ' +
      "private browsing. Try a normal window, or connect a database (see <code>docs/database-setup.md</code>) " +
      "so recipes are saved online instead.</p></div>";
  }

  function screenSignIn() {
    root.innerHTML =
      '<div class="page-head"><p class="eyebrow">The writing desk</p><h1>Sign in to add a recipe</h1>' +
      '<p class="lede">Only signed-in family can add or change recipes. Everyone else can read the journal without signing in.</p></div>' +
      '<form class="sheet signin" id="signin-form">' +
        '<label class="field"><span>Email</span><input type="email" id="email" required autocomplete="username"></label>' +
        '<label class="field"><span>Password</span><input type="password" id="password" required autocomplete="current-password"></label>' +
        '<button class="btn primary" type="submit">Sign in</button>' +
        '<p class="hint" id="signin-error"></p>' +
      "</form>";

    document.getElementById("signin-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = document.getElementById("signin-error");
      err.textContent = "Signing in…";
      MRJStore.signIn(document.getElementById("email").value, document.getElementById("password").value)
        .then(function () { start(); })
        .catch(function (ex) { err.textContent = ex.message; err.classList.add("bad"); });
    });
  }

  function screenList() {
    var rows = recipes.map(function (r) {
      var counts = ["videos", "audio", "images"].map(function (k) {
        var n = (r.media && r.media[k] || []).length;
        return n ? { videos: "film", audio: "voice", images: "photo" }[k] + " " + n : "";
      }).filter(Boolean).join("  ");
      var origin = MRJStore.configured() ? "" :
        (r._draft ? ' <span class="tag">in this browser</span>' : ' <span class="tag muted">in data/recipes.js</span>');
      return '<tr>' +
        "<td><strong>" + esc(r.title) + "</strong>" + origin + "<br><small>" + esc(r.id) + "</small></td>" +
        "<td>" + esc(r.category) + "</td>" +
        "<td>" + esc(counts || "—") + "</td>" +
        "<td>" + esc(r.addedOn || "") + "</td>" +
        '<td class="right">' +
          '<button class="btn" data-edit="' + esc(r.id) + '">Edit</button> ' +
          '<button class="btn danger" data-del="' + esc(r.id) + '">Delete</button>' +
        "</td></tr>";
    }).join("");

    var localCount = (window.RECIPES || []).length;
    var remote = MRJStore.configured();
    var drafts = recipes.filter(function (r) { return r._draft; }).length;

    var banner = remote
      ? ""
      : '<div class="banner">' +
          "<p><strong>Saved in this browser.</strong> Recipes you add here show up in the journal on " +
          "<em>this device</em> straight away. To put them on the real website — and on Mom&rsquo;s phone — " +
          'press <strong>Export</strong> and commit the file, or <a href="docs/database-setup.md">connect a database</a> ' +
          "and skip the exporting forever.</p>" +
        "</div>";

    root.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">The writing desk</p><h1>Recipes in the journal</h1>' +
        '<p class="lede">' + recipes.length + " recipe" + (recipes.length === 1 ? "" : "s") +
          (remote ? " in the database." : " — " + drafts + " added here, " + (recipes.length - drafts) + " from data/recipes.js.") +
        "</p>" +
      "</div>" +
      banner +
      '<div class="admin-actions">' +
        '<button class="btn primary" id="new-recipe">+ New recipe</button>' +
        (remote
          ? (localCount ? '<button class="btn" id="import-local">Import the ' + localCount + " from data/recipes.js</button>" : "")
          : '<button class="btn" id="export-recipes">⇩ Export recipes.js</button>' +
            '<button class="btn" id="export-media">⇩ Export media files</button>') +
        '<a class="btn" href="index.html">View the journal</a>' +
      "</div>" +
      (recipes.length
        ? '<div class="sheet"><table class="admin-table"><thead><tr>' +
          "<th>Recipe</th><th>Chapter</th><th>Media</th><th>Added</th><th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div>"
        : '<div class="empty"><span class="big">&mdash;</span>Nothing saved yet. Start with <strong>+ New recipe</strong>.</div>');

    document.getElementById("new-recipe").addEventListener("click", function () {
      draft = blank();
      screenEditor();
    });

    var imp = document.getElementById("import-local");
    if (imp) imp.addEventListener("click", importLocal);

    var exR = document.getElementById("export-recipes");
    if (exR) exR.addEventListener("click", exportRecipes);

    var exM = document.getElementById("export-media");
    if (exM) exM.addEventListener("click", exportMedia);

    if (!MRJStore.configured() && window.MRJDrawer) {
      mediaManifest().then(function (html) {
        if (html) root.insertAdjacentHTML("beforeend", html);
      });
    }

    root.addEventListener("click", function (e) {
      var edit = e.target.getAttribute && e.target.getAttribute("data-edit");
      var del = e.target.getAttribute && e.target.getAttribute("data-del");
      if (edit) {
        recipes.forEach(function (r) { if (r.id === edit) draft = JSON.parse(JSON.stringify(r)); });
        screenEditor();
      } else if (del) {
        var isDraft = recipes.some(function (r) { return r.id === del && r._draft; });
        if (!MRJStore.configured() && !isDraft) {
          toast("That one lives in data/recipes.js — delete it there, or edit it here to override it.", "bad");
          return;
        }
        if (!confirm("Delete “" + del + "” from the journal?")) return;
        MRJStore.remove(del).then(function () {
          toast("Deleted.");
          refresh();
        }).catch(function (ex) { toast(ex.message, "bad"); });
      }
    });
  }

  /* ---------------- the editor ---------------- */

  function mediaRowsHTML(kind) {
    var list = draft.media[kind] || [];
    if (!list.length) return '<p class="hint">Nothing added yet.</p>';
    return '<ul class="media-rows">' + list.map(function (m, i) {
      var isUrl = /^https?:/i.test(m.src || "");
      return "<li>" +
        '<span class="src" title="' + esc(m.src) + '">' + (isUrl ? "link · " : "") + esc(m.src) + "</span>" +
        '<input type="text" placeholder="Caption (worth writing — you\'ll be glad in ten years)" value="' + esc(m.caption || "") + '" data-caption="' + kind + ":" + i + '">' +
        '<button type="button" class="btn danger small" data-rm="' + kind + ":" + i + '">Remove</button>' +
        "</li>";
    }).join("") + "</ul>";
  }

  function screenEditor() {
    var isNew = !recipes.some(function (r) { return r.id === draft.id; });

    root.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">' + (isNew ? "New page" : "Editing") + '</p>' +
        "<h1>" + esc(draft.title || "Untitled recipe") + "</h1>" +
      "</div>" +

      '<form class="sheet" id="editor">' +
        '<div class="form-grid">' +
          '<label class="field"><span>Recipe name</span><input type="text" id="f-title" value="' + esc(draft.title) + '" required></label>' +
          '<label class="field"><span>Short id <small>(used in the link)</small></span><input type="text" id="f-id" value="' + esc(draft.id) + '" ' + (isNew ? "" : "readonly") + ' required></label>' +
          '<label class="field wide"><span>Subtitle <small>(optional)</small></span><input type="text" id="f-subtitle" value="' + esc(draft.subtitle) + '"></label>' +

          '<label class="field"><span>Chapter</span><select id="f-category">' +
            CATEGORIES.map(function (c) {
              return '<option value="' + c + '"' + (draft.category === c ? " selected" : "") + ">" + c.charAt(0).toUpperCase() + c.slice(1) + "</option>";
            }).join("") + "</select></label>" +

          '<label class="field"><span>Rating <small>(0–5 stars)</small></span><input type="number" id="f-rating" min="0" max="5" value="' + (draft.rating || 0) + '"></label>' +
          '<label class="field"><span>Difficulty <small>(1–5 dots)</small></span><input type="number" id="f-difficulty" min="1" max="5" value="' + (draft.difficulty || 1) + '"></label>' +
          '<label class="field"><span>Portions</span><input type="number" id="f-portions" min="1" max="99" value="' + (draft.portions || 1) + '"></label>' +

          '<label class="field"><span>Prep time</span><span class="dual">' +
            '<input type="number" id="f-prep-h" min="0" max="48" value="' + (draft.prep.hrs || 0) + '"><small>hrs</small>' +
            '<input type="number" id="f-prep-m" min="0" max="59" value="' + (draft.prep.mins || 0) + '"><small>mins</small></span></label>' +
          '<label class="field"><span>Cook time</span><span class="dual">' +
            '<input type="number" id="f-cook-h" min="0" max="48" value="' + (draft.cook.hrs || 0) + '"><small>hrs</small>' +
            '<input type="number" id="f-cook-m" min="0" max="59" value="' + (draft.cook.mins || 0) + '"><small>mins</small></span></label>' +

          '<fieldset class="field wide diet-set"><legend>Diet</legend>' +
            DIETS.map(function (d) {
              return '<label class="cb"><input type="checkbox" data-diet="' + d[0] + '"' + (draft.diet[d[0]] ? " checked" : "") + "> " + d[1] + "</label>";
            }).join("") + "</fieldset>" +

          '<label class="field wide"><span>Ingredients <small>(one per line — start with the amount so the portion scaler works)</small></span>' +
            '<textarea id="f-ingredients" rows="10" placeholder="2 cups wheat flour&#10;1 tsp salt">' + esc((draft.ingredients || []).join("\n")) + "</textarea></label>" +

          '<label class="field wide"><span>Method <small>(one step per line)</small></span>' +
            '<textarea id="f-method" rows="10" placeholder="Knead the flour and rest the dough.&#10;Mix the filling.">' + esc((draft.method || []).join("\n")) + "</textarea></label>" +

          '<label class="field"><span>Hints, tips &amp; tricks</span><textarea id="f-hints" rows="4">' + esc(draft.hints) + "</textarea></label>" +
          '<label class="field"><span>Goes great with</span><textarea id="f-goeswith" rows="4">' + esc(draft.goesWith) + "</textarea></label>" +
          '<label class="field wide"><span>Her note <small>(anything she said you don\'t want to lose)</small></span><textarea id="f-notes" rows="3">' + esc(draft.notes) + "</textarea></label>" +
          '<label class="field"><span>Date added</span><input type="date" id="f-addedon" value="' + esc(draft.addedOn) + '"></label>' +
        "</div>" +

        '<hr class="rule">' +
        "<h2>Her media</h2>" +
        '<p class="hint">Files upload straight to storage — never into git. Fill in the <strong>short id</strong> above first, it decides the folder.</p>' +

        KINDS.map(function (k) {
          return '<section class="media-editor" data-kind="' + k.key + '">' +
            '<div class="media-head"><h3>' + k.label + "</h3></div>" +
            '<p class="hint">' + esc(k.hint) + "</p>" +
            '<div class="uploader">' +
              '<input type="file" accept="' + k.accept + '" multiple data-upload="' + k.key + '" id="up-' + k.key + '">' +
              '<input type="url" placeholder="…or paste a link (YouTube, Drive, anywhere)" data-link="' + k.key + '">' +
              '<button type="button" class="btn" data-addlink="' + k.key + '">Add link</button>' +
            "</div>" +
            '<div class="progress" data-progress="' + k.key + '" hidden><div></div></div>' +
            '<div data-list="' + k.key + '">' + mediaRowsHTML(k.key) + "</div>" +
          "</section>";
        }).join("") +

        '<hr class="rule">' +
        '<div class="admin-actions">' +
          '<button class="btn primary" type="submit">Save to the journal</button>' +
          '<button class="btn" type="button" id="cancel">Cancel</button>' +
        "</div>" +
      "</form>";

    /* keep the draft in step with the id field so uploads land in the right folder */
    var idInput = document.getElementById("f-id");
    var titleInput = document.getElementById("f-title");
    var heading = root.querySelector(".page-head h1");
    titleInput.addEventListener("input", function () {
      if (isNew && !idInput.dataset.touched) idInput.value = slug(titleInput.value);
      heading.textContent = titleInput.value.trim() || "Untitled recipe";
    });
    idInput.addEventListener("input", function () { idInput.dataset.touched = "1"; });

    document.getElementById("cancel").addEventListener("click", function () { draft = null; screenList(); });
    document.getElementById("editor").addEventListener("submit", onSave);

    /* uploads */
    KINDS.forEach(function (k) {
      document.getElementById("up-" + k.key).addEventListener("change", function (e) {
        handleFiles(k.key, Array.prototype.slice.call(e.target.files));
        e.target.value = "";
      });
    });

    root.addEventListener("click", function (e) {
      var addLink = e.target.getAttribute && e.target.getAttribute("data-addlink");
      var rm = e.target.getAttribute && e.target.getAttribute("data-rm");
      if (addLink) {
        var input = root.querySelector('[data-link="' + addLink + '"]');
        var v = (input.value || "").trim();
        if (!v) return;
        draft.media[addLink].push({ src: v, caption: "" });
        input.value = "";
        redrawMedia(addLink);
      } else if (rm) {
        var parts = rm.split(":");
        draft.media[parts[0]].splice(Number(parts[1]), 1);
        redrawMedia(parts[0]);
      }
    });

    root.addEventListener("input", function (e) {
      var cap = e.target.getAttribute && e.target.getAttribute("data-caption");
      if (cap) {
        var p = cap.split(":");
        draft.media[p[0]][Number(p[1])].caption = e.target.value;
      }
    });
  }

  function redrawMedia(kind) {
    root.querySelector('[data-list="' + kind + '"]').innerHTML = mediaRowsHTML(kind);
  }

  function handleFiles(kind, files) {
    var id = slug(document.getElementById("f-id").value);
    if (!id) { toast("Give the recipe a short id first — it decides the folder.", "bad"); return; }

    var bar = root.querySelector('[data-progress="' + kind + '"]');
    var fill = bar.firstElementChild;
    bar.hidden = false;

    var queue = files.slice();
    function next() {
      if (!queue.length) { bar.hidden = true; fill.style.transform = "scaleX(0)"; return; }
      var file = queue.shift();
      var name = slug(file.name.replace(/\.[^.]+$/, "")) + "." + (file.name.split(".").pop() || "bin").toLowerCase();
      var path = id + "/" + name;

      fill.style.transform = "scaleX(0)";
      // The store decides what the src should be: an object path in the
      // bucket, or a "drawer:" reference to a file kept in this browser.
      MRJStore.addFile(path, file, function (pct) { fill.style.transform = "scaleX(" + (pct / 100) + ")"; })
        .then(function (src) {
          draft.media[kind].push({ src: src || path, caption: "" });
          redrawMedia(kind);
          next();
        })
        .catch(function (ex) {
          toast(ex.message, "bad");
          bar.hidden = true;
        });
    }
    next();
  }

  function onSave(e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value; };
    var lines = function (id) {
      return v(id).split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    };

    draft.id = slug(v("f-id"));
    draft.title = v("f-title").trim();
    draft.subtitle = v("f-subtitle").trim();
    draft.category = v("f-category");
    draft.rating = Number(v("f-rating"));
    draft.difficulty = Number(v("f-difficulty"));
    draft.portions = Number(v("f-portions"));
    draft.prep = { hrs: Number(v("f-prep-h")), mins: Number(v("f-prep-m")) };
    draft.cook = { hrs: Number(v("f-cook-h")), mins: Number(v("f-cook-m")) };
    draft.ingredients = lines("f-ingredients");
    draft.method = lines("f-method");
    draft.hints = v("f-hints").trim();
    draft.goesWith = v("f-goeswith").trim();
    draft.notes = v("f-notes").trim();
    draft.addedOn = v("f-addedon") || new Date().toISOString().slice(0, 10);
    draft.diet = {};
    root.querySelectorAll("[data-diet]").forEach(function (cb) {
      draft.diet[cb.getAttribute("data-diet")] = cb.checked;
    });

    if (!draft.id) { toast("The recipe needs a short id.", "bad"); return; }

    var btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Saving…";

    MRJStore.save(draft)
      .then(function () {
        toast("Saved to the journal.");
        draft = null;
        return refresh();
      })
      .catch(function (ex) {
        toast(ex.message, "bad");
        btn.disabled = false; btn.textContent = "Save to the journal";
      });
  }

  /* ---------------- export (file mode) ----------------
     Turns everything — the committed recipes plus whatever you added
     from the + Add button — back into a data/recipes.js you can commit,
     with the browser-held media rewritten to media/… paths. */

  var MEDIA_FOLDER = { images: "media/images", videos: "media/videos", audio: "media/audio" };

  function download(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function forExport(r) {
    var out = JSON.parse(JSON.stringify(r));
    delete out._draft;
    ["images", "videos", "audio"].forEach(function (kind) {
      out.media = out.media || {};
      out.media[kind] = (out.media[kind] || []).map(function (m) {
        var src = m.src || m;
        if (String(src).indexOf("drawer:") === 0) {
          src = MEDIA_FOLDER[kind] + "/" + String(src).split("/").pop();
        }
        return { src: src, caption: (m && m.caption) || "" };
      });
    });
    return out;
  }

  function exportRecipes() {
    MRJStore.load().then(function (list) {
      var body = list.map(forExport);
      var header =
        "/* ============================================================\n" +
        "   MOM'S RECIPE JOURNAL — the recipe book itself.\n\n" +
        "   Exported from the writing desk on " + new Date().toISOString().slice(0, 10) + ".\n" +
        "   Drop this file in as data/recipes.js and commit it.\n" +
        "   ============================================================ */\n\n";
      download(new Blob([header + "window.RECIPES = " + JSON.stringify(body, null, 2) + ";\n"],
        { type: "application/javascript" }), "recipes.js");
      toast("Downloaded recipes.js — put it in the data/ folder and commit.");
    });
  }

  function exportMedia() {
    MRJDrawer.allFiles().then(function (rows) {
      if (!rows.length) { toast("No media held in this browser."); return; }
      rows.forEach(function (row, i) {
        // Use the stored (cleaned) name — that is what the exported
        // recipes.js points at, so the two must agree.
        setTimeout(function () { download(row.blob, row.path.split("/").pop()); }, i * 400);
      });
      toast("Downloading " + rows.length + " file(s) — see the list for where each one goes.");
    });
  }

  function mediaManifest() {
    return MRJDrawer.allFiles().then(function (rows) {
      if (!rows.length) return "";
      var where = {};
      recipes.forEach(function (r) {
        ["images", "videos", "audio"].forEach(function (kind) {
          (r.media && r.media[kind] || []).forEach(function (m) {
            var src = m.src || m;
            if (String(src).indexOf("drawer:") === 0) where[String(src).split("/").pop()] = MEDIA_FOLDER[kind];
          });
        });
      });
      return '<div class="sheet"><h2>Where the media files go</h2>' +
        '<table class="admin-table"><thead><tr><th>File</th><th>Put it in</th></tr></thead><tbody>' +
        rows.map(function (row) {
          var name = row.path.split("/").pop();
          return "<tr><td>" + esc(name) + "</td><td><code>" + esc(where[name] || "media") + "/</code></td></tr>";
        }).join("") + "</tbody></table></div>";
    });
  }

  /* ---------------- import the file-mode recipes ---------------- */

  function importLocal() {
    var list = (window.RECIPES || []).slice();
    if (!list.length) return;
    if (!confirm("Copy " + list.length + " recipe(s) from data/recipes.js into the database?\n\n" +
      "Their media stays in the media/ folder in this repository — that keeps working. " +
      "Anything you upload from here goes to storage instead.")) return;

    var done = 0, failed = 0;
    (function step() {
      if (!list.length) {
        toast("Imported " + done + " recipe(s)" + (failed ? ", " + failed + " failed" : "") + ".", failed ? "bad" : "");
        refresh();
        return;
      }
      MRJStore.save(list.shift())
        .then(function () { done++; step(); })
        .catch(function (ex) { failed++; console.error(ex); step(); });
    })();
  }

  /* ---------------- boot ---------------- */

  function refresh() {
    return MRJStore.load().then(function (list) {
      recipes = list;
      screenList();
    });
  }

  function start() {
    if (MRJStore.configured()) {
      if (!MRJStore.token()) { screenSignIn(); whoEl.textContent = ""; signoutBtn.hidden = true; return; }
      whoEl.textContent = MRJStore.currentEmail();
      signoutBtn.hidden = false;
    } else {
      // File mode: nothing to sign in to. Recipes are saved in this browser
      // and exported to data/recipes.js when you're ready to share them.
      whoEl.textContent = "saved in this browser";
      signoutBtn.hidden = true;
      if (!window.MRJDrawer || !MRJDrawer.supported()) { screenNoStorage(); return; }
    }

    root.innerHTML = '<div class="empty"><span class="big">&hellip;</span>Opening the journal…</div>';
    refresh().catch(function (ex) {
      toast(ex.message, "bad");
      screenSignIn();
    });
  }

  /* theme — shares the journal's setting so the two pages never disagree */
  (function theme() {
    var btn = document.getElementById("theme-toggle");
    function read() { try { return JSON.parse(localStorage.getItem("mrj:theme") || "null"); } catch (e) { return null; } }
    function apply(t) {
      if (t === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    }
    apply(read() || "dark");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem("mrj:theme", JSON.stringify(next)); } catch (e) {}
    });
  })();

  signoutBtn.addEventListener("click", function () {
    MRJStore.signOut();
    location.reload();
  });

  start();
})();
