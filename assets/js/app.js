/* ============================================================
   Mom's Recipe Journal — app
   No build step, no dependencies. Data lives in data/recipes.js
   ============================================================ */
(function () {
  "use strict";

  var RECIPES = [];
  var loaded = false;

  var CATEGORIES = [
    { id: "breakfast", name: "Breakfast", emoji: "🌅", blurb: "Mornings at Mom's table" },
    { id: "lunch",     name: "Lunch",     emoji: "🍛", blurb: "The everyday afternoon plate" },
    { id: "dinner",    name: "Dinner",    emoji: "🌙", blurb: "What the whole house waits for" },
    { id: "treats",    name: "Treats",    emoji: "🍰", blurb: "Sweets, snacks and festival food" }
  ];

  var DIETS = [
    { key: "vegetarian", label: "Vegetarian" },
    { key: "vegan",      label: "Vegan" },
    { key: "glutenFree", label: "Gluten-free" },
    { key: "dairyFree",  label: "Dairy-free" }
  ];

  var main = document.getElementById("main");
  var searchInput = document.getElementById("search");

  /* ---------------- small helpers ---------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function store(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function catName(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].name;
    return id || "Uncategorised";
  }

  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }

  function minutes(t) {
    if (!t) return 0;
    return (Number(t.hrs) || 0) * 60 + (Number(t.mins) || 0);
  }

  function timeText(t) {
    var m = minutes(t);
    if (!m) return "—";
    var h = Math.floor(m / 60), r = m % 60;
    return (h ? h + " hr" + (h > 1 ? "s" : "") + (r ? " " : "") : "") + (r ? r + " mins" : "");
  }

  function totalTime(r) { return minutes(r.prep) + minutes(r.cook); }

  // Compact form for cards: "45 min", "1 hr 10", "9 hrs"
  function shortTime(m) {
    if (!m) return "—";
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " hr" + (h > 1 ? "s" : "") + (r ? " " + r : "");
  }

  function media(r, kind) {
    return (r.media && Array.isArray(r.media[kind])) ? r.media[kind] : [];
  }

  // Turns a stored src into something the browser can load: a full URL is
  // left alone, a repo path stays relative, a bucket path becomes a
  // Supabase public URL.
  function url(src) {
    return window.MRJStore ? window.MRJStore.mediaUrl(src) : src;
  }

  function coverImage(r) {
    if (r.cover) return url(r.cover);
    var imgs = media(r, "images");
    return imgs.length ? url(imgs[0].src || imgs[0]) : null;
  }

  function difficultyWord(n) {
    return ["", "Very easy", "Easy", "Medium", "Hard", "Mom-level"][Math.max(0, Math.min(5, Math.round(n) || 0))] || "";
  }

  /* favourites */
  function favs() { return store("mrj:favs", []); }
  function isFav(id) { return favs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i === -1) f.push(id); else f.splice(i, 1);
    save("mrj:favs", f);
    return i === -1;
  }

  /* ---------------- amount scaling ---------------- */

  var UNICODE_FRACTIONS = {
    "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
    "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875
  };

  // Reads a leading quantity such as "2", "1.5", "1/2", "1 1/2", "1½", "½".
  function readAmount(text) {
    var m = text.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[¼½¾⅓⅔⅕⅖⅗⅘⅙⅛⅜⅝⅞]|\d+(?:\.\d+)?|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅛⅜⅝⅞])/);
    if (!m) return null;
    var raw = m[1], value = 0;
    var uni = raw.match(/[¼½¾⅓⅔⅕⅖⅗⅘⅙⅛⅜⅝⅞]/);
    if (uni) {
      value += UNICODE_FRACTIONS[uni[0]];
      var lead = raw.replace(/[¼½¾⅓⅔⅕⅖⅗⅘⅙⅛⅜⅝⅞]/, "").trim();
      if (lead) value += parseFloat(lead);
    } else if (raw.indexOf("/") !== -1) {
      var parts = raw.trim().split(/\s+/);
      if (parts.length === 2) {
        value = parseFloat(parts[0]);
        var f = parts[1].split("/");
        value += parseFloat(f[0]) / parseFloat(f[1]);
      } else {
        var g = parts[0].split("/");
        value = parseFloat(g[0]) / parseFloat(g[1]);
      }
    } else {
      value = parseFloat(raw);
    }
    if (!isFinite(value)) return null;
    return { value: value, rest: text.slice(m[0].length) };
  }

  var NICE = [
    [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"], [0.5, "½"],
    [0.625, "⅝"], [2 / 3, "⅔"], [0.75, "¾"], [0.875, "⅞"]
  ];

  function formatAmount(n) {
    if (n <= 0) return "0";
    var whole = Math.floor(n + 1e-9);
    var frac = n - whole;
    if (frac < 0.05) return String(whole);
    for (var i = 0; i < NICE.length; i++) {
      if (Math.abs(frac - NICE[i][0]) < 0.045) {
        return (whole ? whole : "") + NICE[i][1];
      }
    }
    var rounded = Math.round(n * 100) / 100;
    return String(rounded);
  }

  function scaleIngredient(text, factor) {
    if (factor === 1) return { amount: "", rest: text };
    var read = readAmount(text);
    if (!read) return { amount: "", rest: text };
    return { amount: formatAmount(read.value * factor), rest: read.rest };
  }

  /* ---------------- filtering ---------------- */

  var state = {
    query: "",
    diet: {},          // key -> true
    maxTime: 0,        // 0 = any
    sort: "recent"
  };

  function matches(r) {
    var q = state.query.trim().toLowerCase();
    if (q) {
      var hay = [
        r.title, r.category, r.hints, r.goesWith, r.notes,
        (r.tags || []).join(" "),
        (r.ingredients || []).join(" "),
        (r.method || []).join(" ")
      ].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    for (var k in state.diet) {
      if (state.diet[k] && !(r.diet && r.diet[k])) return false;
    }
    if (state.maxTime && totalTime(r) > state.maxTime) return false;
    return true;
  }

  function sorted(list) {
    var out = list.slice();
    if (state.sort === "rating") out.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    else if (state.sort === "quickest") out.sort(function (a, b) { return totalTime(a) - totalTime(b); });
    else if (state.sort === "az") out.sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });
    else out.sort(function (a, b) { return String(b.addedOn || "").localeCompare(String(a.addedOn || "")); });
    return out;
  }

  /* ---------------- components ---------------- */

  function badgeHTML(r) {
    var out = "";
    DIETS.forEach(function (d) {
      if (r.diet && r.diet[d.key]) out += '<span class="badge">' + d.label + "</span>";
    });
    return out ? '<div class="badges">' + out + "</div>" : "";
  }

  function cardHTML(r) {
    var cover = coverImage(r);
    var flags = "";
    if (media(r, "videos").length) flags += "<span>▶ " + media(r, "videos").length + "</span>";
    if (media(r, "audio").length) flags += "<span>🎙 " + media(r, "audio").length + "</span>";
    if (media(r, "images").length) flags += "<span>📷 " + media(r, "images").length + "</span>";

    return '' +
      '<a class="card" href="#/r/' + encodeURIComponent(r.id) + '">' +
        '<div class="card-thumb">' +
          (cover ? '<img src="' + esc(cover) + '" alt="' + esc(r.title) + '" loading="lazy" onerror="this.remove()">' : "🍲") +
          (flags ? '<div class="card-media-flags">' + flags + "</div>" : "") +
        "</div>" +
        '<div class="card-body">' +
          '<span class="card-cat">' + esc(catName(r.category)) + "</span>" +
          "<h3>" + esc(r.title) + "</h3>" +
          badgeHTML(r) +
          '<div class="card-meta">' +
            '<span class="stars">' + stars(r.rating) + "</span>" +
            "<span>" + shortTime(totalTime(r)) + "</span>" +
            "<span>" + (r.portions ? r.portions + " portions" : "") + "</span>" +
          "</div>" +
        "</div>" +
      "</a>";
  }

  function gridHTML(list) {
    if (!list.length) {
      return '<div class="empty"><span class="big">🥄</span>Nothing here yet. Add a recipe in <code>data/recipes.js</code> — see <a href="#/about">how to add a recipe</a>.</div>';
    }
    return '<div class="grid">' + list.map(cardHTML).join("") + "</div>";
  }

  function filterBarHTML(count) {
    var chips = DIETS.map(function (d) {
      return '<button class="chip" type="button" data-diet="' + d.key + '" aria-pressed="' + (state.diet[d.key] ? "true" : "false") + '">' + d.label + "</button>";
    }).join("");

    var times = [[0, "Any time"], [30, "Under 30 min"], [60, "Under 1 hr"]].map(function (t) {
      return '<button class="chip" type="button" data-time="' + t[0] + '" aria-pressed="' + (state.maxTime === t[0] ? "true" : "false") + '">' + t[1] + "</button>";
    }).join("");

    var sorts = [["recent", "Newest"], ["rating", "Top rated"], ["quickest", "Quickest"], ["az", "A–Z"]].map(function (s) {
      return '<button class="chip" type="button" data-sort="' + s[0] + '" aria-pressed="' + (state.sort === s[0] ? "true" : "false") + '">' + s[1] + "</button>";
    }).join("");

    return '<div class="filters">' +
      '<span class="label">Filter</span>' + chips + times +
      '<span class="label" style="margin-left:1rem">Sort</span>' + sorts +
      '<span class="count">' + count + " recipe" + (count === 1 ? "" : "s") + "</span>" +
      "</div>";
  }

  /* ---------------- views ---------------- */

  function viewHome() {
    var total = RECIPES.length;
    var withVoice = RECIPES.filter(function (r) { return media(r, "audio").length; }).length;
    var withVideo = RECIPES.filter(function (r) { return media(r, "videos").length; }).length;

    var tiles = CATEGORIES.map(function (c) {
      var n = RECIPES.filter(function (r) { return r.category === c.id; }).length;
      return '<a class="tile" href="#/c/' + c.id + '">' +
        '<span class="emoji">' + c.emoji + "</span>" +
        "<h3>" + c.name + "</h3>" +
        "<p>" + esc(c.blurb) + " · " + n + " recipe" + (n === 1 ? "" : "s") + "</p>" +
        "</a>";
    }).join("");

    var recent = sorted(RECIPES.slice()).slice(0, 8);

    main.innerHTML =
      '<section class="hero">' +
        "<div>" +
          '<p class="script">from her kitchen to ours</p>' +
          "<h1>Mom&rsquo;s Recipe Journal</h1>" +
          '<p class="lede">Every page is one of her recipes — written the way her notebook does it, with room for the photos she sends, the voice notes she records and the videos we film over her shoulder.</p>' +
          '<div class="hero-stats">' +
            '<div class="stat"><b>' + total + "</b><span>Recipes</span></div>" +
            '<div class="stat"><b>' + withVoice + "</b><span>Voice notes</span></div>" +
            '<div class="stat"><b>' + withVideo + "</b><span>Videos</span></div>" +
          "</div>" +
        "</div>" +
        '<div class="hero-card"><p>“A little more, a little less —<br>taste it and you&rsquo;ll know.”</p></div>' +
      "</section>" +
      '<section><h2>The chapters</h2><div class="tiles">' + tiles + "</div></section>" +
      '<hr class="rule">' +
      "<section><h2>Recently added</h2>" + gridHTML(recent) + "</section>";
  }

  function viewCategory(cat) {
    var c = null;
    CATEGORIES.forEach(function (x) { if (x.id === cat) c = x; });
    var list = sorted(RECIPES.filter(function (r) { return r.category === cat; }).filter(matches));

    main.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">Chapter</p>' +
        "<h1>" + (c ? c.emoji + " " + c.name : esc(cat)) + "</h1>" +
        '<p class="lede">' + esc(c ? c.blurb : "") + "</p>" +
      "</div>" +
      filterBarHTML(list.length) +
      gridHTML(list);

    wireFilters();
  }

  function viewSearch() {
    var list = sorted(RECIPES.filter(matches));
    main.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">Search</p>' +
        "<h1>&ldquo;" + esc(state.query) + "&rdquo;</h1>" +
      "</div>" +
      filterBarHTML(list.length) +
      gridHTML(list);
    wireFilters();
  }

  function viewFavourites() {
    var f = favs();
    var list = sorted(RECIPES.filter(function (r) { return f.indexOf(r.id) !== -1; }).filter(matches));
    main.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">Saved</p>' +
        "<h1>♥ The ones we cook most</h1>" +
        '<p class="lede">Tap the heart on any recipe to keep it here. Saved on this device.</p>' +
      "</div>" +
      gridHTML(list);
  }

  /* ---- recipe page ---- */

  function youtubeEmbed(url) {
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? "https://www.youtube.com/embed/" + m[1] : null;
  }

  function mediaSectionsHTML(r) {
    var vids = media(r, "videos"), auds = media(r, "audio"), imgs = media(r, "images");
    var html = "";

    html += '<section class="media-section">' +
      '<div class="media-head"><h3>🎬 Cooking with Mom</h3><span class="n">' + vids.length + "</span></div>";
    if (vids.length) {
      html += '<div class="video-grid">' + vids.map(function (v) {
        var src = url(v.src || v);
        var yt = youtubeEmbed(src);
        var player = yt
          ? '<iframe src="' + esc(yt) + '" title="' + esc(v.caption || r.title) + '" loading="lazy" allowfullscreen frameborder="0"></iframe>'
          : '<video controls preload="metadata"' + (v.poster ? ' poster="' + esc(url(v.poster)) + '"' : "") + '><source src="' + esc(src) + '">Your browser cannot play this video.</video>';
        return "<figure class=\"video-item\">" + player +
          (v.caption ? "<figcaption>" + esc(v.caption) + "</figcaption>" : "") + "</figure>";
      }).join("") + "</div>";
    } else {
      html += '<p class="empty-media">No video yet. Drop the clip in <code>media/videos/</code> and list it under <code>media.videos</code>.</p>';
    }
    html += "</section>";

    html += '<section class="media-section">' +
      '<div class="media-head"><h3>🎙 Her voice notes</h3><span class="n">' + auds.length + "</span></div>";
    if (auds.length) {
      html += '<div class="audio-list">' + auds.map(function (a) {
        var src = url(a.src || a);
        return '<div class="audio-item">' +
          '<span class="icon">🎙</span>' +
          '<div class="body">' +
            '<div class="cap">' + esc(a.caption || "Voice message") + "</div>" +
            '<audio controls preload="none" src="' + esc(src) + '"></audio>' +
          "</div></div>";
      }).join("") + "</div>";
    } else {
      html += '<p class="empty-media">No voice note yet. Save the WhatsApp message in <code>media/audio/</code> and list it under <code>media.audio</code>.</p>';
    }
    html += "</section>";

    html += '<section class="media-section">' +
      '<div class="media-head"><h3>📷 How it looked</h3><span class="n">' + imgs.length + "</span></div>";
    if (imgs.length) {
      html += '<div class="photo-grid">' + imgs.map(function (im, i) {
        var src = url(im.src || im);
        return '<figure class="photo" data-lightbox="' + i + '" data-src="' + esc(src) + '" data-cap="' + esc(im.caption || "") + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(im.caption || r.title) + '" loading="lazy">' +
          (im.caption ? "<figcaption>" + esc(im.caption) + "</figcaption>" : "") +
          "</figure>";
      }).join("") + "</div>";
    } else {
      html += '<p class="empty-media">No photos yet. Put them in <code>media/images/</code> and list them under <code>media.images</code>.</p>';
    }
    html += "</section>";

    return html;
  }

  function viewRecipe(id) {
    var r = null;
    RECIPES.forEach(function (x) { if (x.id === id) r = x; });
    if (!r) {
      main.innerHTML = '<div class="empty"><span class="big">🤔</span>That recipe isn&rsquo;t in the journal. <a href="#/">Back home</a></div>';
      return;
    }

    var basePortions = Number(r.portions) || 1;
    var portions = basePortions;

    var dots = "";
    for (var i = 1; i <= 5; i++) dots += "<i" + (i <= (Number(r.difficulty) || 0) ? ' class="on"' : "") + "></i>";

    var dietHTML = DIETS.map(function (d) {
      var yes = !!(r.diet && r.diet[d.key]);
      return '<span class="diet' + (yes ? " yes" : "") + '"><span class="o"></span>' + d.label + "</span>";
    }).join("");

    main.innerHTML =
      '<div class="recipe-top">' +
        '<div class="grow">' +
          '<p class="eyebrow"><a href="#/c/' + esc(r.category) + '" style="text-decoration:none">' + esc(catName(r.category)) + "</a></p>" +
        "</div>" +
        '<div class="recipe-actions">' +
          '<button class="btn" id="fav-btn" type="button">' + (isFav(r.id) ? "♥ Saved" : "♡ Save") + "</button>" +
          '<button class="btn" id="print-btn" type="button">🖨 Print</button>' +
          '<a class="btn" href="#/c/' + esc(r.category) + '">← Back</a>' +
        "</div>" +
      "</div>" +

      /* ---- page 1 of the journal: the recipe card ---- */
      '<article class="sheet">' +
        '<div class="sheet-head">' +
          "<div>" +
            '<span class="field-label">Recipe</span>' +
            '<h1 class="recipe-title">' + esc(r.title) + "</h1>" +
            (r.subtitle ? '<p class="lede" style="margin-top:.4rem">' + esc(r.subtitle) + "</p>" : "") +
          "</div>" +
          '<div class="rating-block">' +
            '<span class="field-label">Rating</span><br>' +
            '<span class="stars">' + stars(r.rating) + "</span>" +
          "</div>" +
        "</div>" +

        '<div class="spread">' +
          "<div>" +
            '<h2 style="margin-bottom:.25rem">Ingredients</h2>' +
            '<div class="portion-tool">' +
              '<button type="button" id="p-minus" aria-label="Fewer portions">−</button>' +
              '<output id="p-out">' + basePortions + "</output>" +
              '<button type="button" id="p-plus" aria-label="More portions">+</button>' +
              '<span class="note">portions (recipe makes ' + basePortions + ")</span>" +
            "</div>" +
            '<ul class="ing-list" id="ing-list"></ul>' +
          "</div>" +

          "<div>" +
            '<div class="meta-rows">' +
              '<div class="meta-row"><span class="field-label">Difficulty</span>' +
                '<span class="dots">' + dots + '<span class="lvl">' + difficultyWord(r.difficulty) + "</span></span></div>" +
              '<div class="meta-row"><span class="field-label">Portions</span><span class="meta-value">' + basePortions + "</span></div>" +
              '<div class="meta-row"><span class="field-label">Prep time</span><span class="meta-value">' + timeText(r.prep) + "</span></div>" +
              '<div class="meta-row"><span class="field-label">Cook time</span><span class="meta-value">' + timeText(r.cook) + "</span></div>" +
            "</div>" +
            '<div class="diet-grid">' + dietHTML + "</div>" +
            '<div class="note-box"><h3>Hints, tips &amp; tricks</h3><p>' + (r.hints ? esc(r.hints) : "—") + "</p></div>" +
            '<div class="note-box"><h3>Goes great with</h3><p>' + (r.goesWith ? esc(r.goesWith) : "—") + "</p></div>" +
          "</div>" +
        "</div>" +
      "</article>" +

      /* ---- page 2 of the journal: the method ---- */
      '<article class="sheet method-sheet">' +
        '<div class="sheet-head" style="border:0;padding:0;margin-bottom:.75rem">' +
          '<span class="field-label">Method</span>' +
          '<span class="field-label">' + esc(catName(r.category)) + "</span>" +
        "</div>" +
        '<div class="lines"><ol class="steps" id="steps">' +
          (r.method || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") +
        "</ol></div>" +
        (r.notes ? '<div class="note-box" style="margin-top:1.5rem"><h3>Her note</h3><p>' + esc(r.notes) + "</p></div>" : "") +
      "</article>" +

      /* ---- page 3: the memories ---- */
      '<article class="sheet">' + mediaSectionsHTML(r) + "</article>";

    /* ingredients + portion scaling */
    var ingList = document.getElementById("ing-list");
    var checkedKey = "mrj:checked:" + r.id;
    var checked = store(checkedKey, []);

    function renderIngredients() {
      var factor = portions / basePortions;
      ingList.innerHTML = (r.ingredients || []).map(function (line, i) {
        var parts = scaleIngredient(line, factor);
        var text = parts.amount
          ? '<span class="amount">' + esc(parts.amount) + "</span>" + esc(parts.rest)
          : esc(parts.rest);
        var on = checked.indexOf(i) !== -1;
        return "<li><label><input type=\"checkbox\" data-i=\"" + i + "\"" + (on ? " checked" : "") + "><span>" + text + "</span></label></li>";
      }).join("");
    }
    renderIngredients();

    ingList.addEventListener("change", function (e) {
      var i = Number(e.target.getAttribute("data-i"));
      var at = checked.indexOf(i);
      if (e.target.checked && at === -1) checked.push(i);
      else if (!e.target.checked && at !== -1) checked.splice(at, 1);
      save(checkedKey, checked);
    });

    document.getElementById("p-minus").addEventListener("click", function () {
      if (portions > 1) { portions--; document.getElementById("p-out").textContent = portions; renderIngredients(); }
    });
    document.getElementById("p-plus").addEventListener("click", function () {
      if (portions < 50) { portions++; document.getElementById("p-out").textContent = portions; renderIngredients(); }
    });

    /* tick off method steps as you cook */
    var steps = document.getElementById("steps");
    if (steps) {
      steps.addEventListener("click", function (e) {
        var li = e.target.closest("li");
        if (li) li.classList.toggle("done");
      });
    }

    /* favourite + print */
    document.getElementById("fav-btn").addEventListener("click", function () {
      var now = toggleFav(r.id);
      this.textContent = now ? "♥ Saved" : "♡ Save";
      this.classList.toggle("on", now);
    });
    document.getElementById("fav-btn").classList.toggle("on", isFav(r.id));
    document.getElementById("print-btn").addEventListener("click", function () { window.print(); });

    document.title = r.title + " — Mom's Recipe Journal";
  }

  function viewAbout() {
    main.innerHTML =
      '<div class="page-head"><p class="eyebrow">For whoever keeps the journal</p><h1>How to add a recipe</h1></div>' +
      '<div class="prose">' +
        (window.MRJStore && window.MRJStore.configured()
          ? "<p>This journal is connected to a database, so adding a recipe is a form — no files, no commits. " +
            'Open <a href="admin.html"><strong>the writing desk</strong></a>, sign in, fill it in, and drop her ' +
            "photos, videos and voice notes straight in.</p>" +
            '<p><a class="btn primary" href="admin.html">Open the writing desk →</a></p>' +
            '<hr class="rule"><h2>The file way</h2><p>Still available if you prefer it — set ' +
            '<code>source: "local"</code> in <code>config.js</code>. Recipes then come from <code>data/recipes.js</code>:</p>'
          : "<p>Every recipe is one entry in <code>data/recipes.js</code>. Copy the block below, paste it into the list, change the words, and the website updates itself — no build step, nothing to install.</p>" +
            "<p>Once Mom&rsquo;s videos and voice notes start piling up, git stops being the right place for them — " +
            "GitHub refuses files over 100 MB and keeps every version forever. See <code>docs/database-setup.md</code> " +
            "to move the media to a proper database and add recipes from a form instead.</p>") +
        "<h2>1. Save the media first</h2>" +
        "<ul>" +
          "<li>Photos Mom sends → <code>media/images/</code></li>" +
          "<li>Videos you record → <code>media/videos/</code></li>" +
          "<li>Her voice messages → <code>media/audio/</code></li>" +
        "</ul>" +
        "<p>Use simple file names with no spaces, for example <code>aloo-paratha-1.jpg</code>. A YouTube link works too — just paste the link as the video <code>src</code>.</p>" +
        "<h2>2. Add the recipe entry</h2>" +
        "<pre><code>" + esc(TEMPLATE_SNIPPET) + "</code></pre>" +
        "<h2>3. Field guide</h2>" +
        "<ul>" +
          "<li><code>category</code> — one of <code>breakfast</code>, <code>lunch</code>, <code>dinner</code>, <code>treats</code></li>" +
          "<li><code>rating</code> — 0 to 5 stars &nbsp;·&nbsp; <code>difficulty</code> — 1 to 5 dots</li>" +
          "<li><code>portions</code> — the number the recipe makes; the site can scale the ingredients up or down from it</li>" +
          "<li><code>prep</code> / <code>cook</code> — <code>{ hrs: 0, mins: 30 }</code></li>" +
          "<li><code>ingredients</code> — one line each, starting with the amount so it can be scaled</li>" +
          "<li><code>method</code> — one line per step</li>" +
          "<li><code>hints</code>, <code>goesWith</code>, <code>notes</code> — free text, exactly like the boxes in her notebook</li>" +
          "<li><code>media</code> — the videos, voice notes and photos for this recipe</li>" +
        "</ul>" +
        "<p>Full instructions also live in <code>README.md</code> and <code>docs/adding-a-recipe.md</code> in the repository.</p>" +
      "</div>";
  }

  var TEMPLATE_SNIPPET = [
    "{",
    '  id: "aloo-paratha",              // unique, lowercase, no spaces',
    '  title: "Aloo Paratha",',
    '  category: "breakfast",           // breakfast | lunch | dinner | treats',
    "  rating: 5,",
    "  difficulty: 2,",
    "  portions: 4,",
    "  diet: { vegetarian: true, vegan: false, glutenFree: false, dairyFree: false },",
    "  prep: { hrs: 0, mins: 30 },",
    "  cook: { hrs: 0, mins: 20 },",
    "  ingredients: [",
    '    "2 cups wheat flour",',
    '    "3 potatoes, boiled and mashed"',
    "  ],",
    "  method: [",
    '    "Knead the flour with warm water and rest it for 20 minutes.",',
    '    "Mix the mashed potato with the spices."',
    "  ],",
    '  hints: "Rest the dough — that is the whole secret.",',
    '  goesWith: "Curd, butter and hot chai.",',
    '  notes: "Mom makes this every Sunday morning.",',
    '  addedOn: "2026-08-31",',
    "  media: {",
    '    images: [{ src: "media/images/aloo-paratha-1.jpg", caption: "Straight off the tawa" }],',
    '    videos: [{ src: "media/videos/aloo-paratha.mp4", caption: "Mom rolling the paratha" }],',
    '    audio:  [{ src: "media/audio/aloo-paratha-voice.m4a", caption: "Her voice note about the dough" }]',
    "  }",
    "}"
  ].join("\n");

  /* ---------------- lightbox ---------------- */

  var lightbox = el(
    '<div class="lightbox" hidden>' +
      '<button class="close" type="button" aria-label="Close">×</button>' +
      "<div><img alt=\"\"><p class=\"cap\"></p></div>" +
    "</div>"
  );
  document.body.appendChild(lightbox);

  function openLightbox(src, cap) {
    lightbox.querySelector("img").src = src;
    lightbox.querySelector(".cap").textContent = cap || "";
    lightbox.hidden = false;
  }
  function closeLightbox() { lightbox.hidden = true; lightbox.querySelector("img").src = ""; }
  /* one delegated listener for every photo on the page */
  main.addEventListener("click", function (e) {
    var fig = e.target.closest("[data-lightbox]");
    if (fig) openLightbox(fig.getAttribute("data-src"), fig.getAttribute("data-cap"));
  });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.classList.contains("close")) closeLightbox();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  /* ---------------- filters wiring ---------------- */

  function wireFilters() {
    var bar = main.querySelector(".filters");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.diet) state.diet[b.dataset.diet] = !state.diet[b.dataset.diet];
      else if (b.dataset.time !== undefined && b.dataset.time !== "") state.maxTime = Number(b.dataset.time);
      else if (b.dataset.sort) state.sort = b.dataset.sort;
      render();
    });
  }

  /* ---------------- router ---------------- */

  function render() {
    var hash = location.hash.replace(/^#/, "") || "/";
    var parts = hash.split("/").filter(Boolean);

    document.title = "Mom's Recipe Journal";
    window.scrollTo({ top: 0 });

    if (parts[0] === "r" && parts[1]) viewRecipe(decodeURIComponent(parts[1]));
    else if (parts[0] === "c" && parts[1]) viewCategory(parts[1]);
    else if (parts[0] === "favourites") viewFavourites();
    else if (parts[0] === "about") viewAbout();
    else if (parts[0] === "search") viewSearch();
    else viewHome();

    var navKey = parts[0] === "c" ? parts[1] : (parts[0] || "home");
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.classList.toggle("active", a.dataset.nav === navKey);
    });
  }

  window.addEventListener("hashchange", function () { if (loaded) render(); });

  /* search */
  var searchTimer;
  searchInput.addEventListener("input", function () {
    state.query = searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      if (state.query.trim()) {
        if (location.hash.indexOf("#/search") !== 0) location.hash = "#/search";
        else render();
      } else if (location.hash.indexOf("#/search") === 0) {
        location.hash = "#/";
      } else {
        render();
      }
    }, 180);
  });

  /* theme */
  var themeBtn = document.getElementById("theme-toggle");
  var saved = store("mrj:theme", null);
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    save("mrj:theme", next);
  });

  /* ---------------- boot ----------------
     Recipes may come from a database, so nothing renders until the
     store hands them over. With a cache present the first paint is
     immediate and the network refresh re-renders behind it. */

  function boot() {
    main.innerHTML = '<div class="empty"><span class="big">🍵</span>Getting the recipes\u2026</div>';

    window.MRJStore.load({
      onUpdate: function (fresh) {
        RECIPES = fresh;
        render();                      // newer copy arrived from the database
      },
      onError: function (err) {
        console.error(err);
        main.innerHTML = '<div class="empty"><span class="big">📡</span>' +
          "Couldn&rsquo;t reach the recipe database.<br><small>" + esc(err.message) + "</small></div>";
      }
    }).then(function (list) {
      RECIPES = list;
      loaded = true;
      render();
    });
  }

  boot();
})();
