/* ============================================================
   Mom's Recipe Journal — the drawer.

   In file mode there is no server to save to, so recipes added
   from the + Add button are kept in this browser (IndexedDB —
   which, unlike localStorage, is happy holding video and audio).

   They show up in the journal straight away on this device, and
   "Export" turns them into a data/recipes.js you can commit so
   everyone else gets them too.
   ============================================================ */
window.MRJDrawer = (function () {
  "use strict";

  var NAME = "mrj", VERSION = 1;
  var RECIPES = "recipes", FILES = "files";
  var dbp = null;

  function supported() { return typeof indexedDB !== "undefined"; }

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!supported()) return reject(new Error("This browser has no IndexedDB, so recipes can't be saved here."));
      var req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(RECIPES)) db.createObjectStore(RECIPES, { keyPath: "id" });
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: "path" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("Could not open the local store")); };
    });
    return dbp;
  }

  function tx(store, mode, run) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var out = run(t.objectStore(store));
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error("Storage transaction aborted")); };
      });
    });
  }

  /* ---------------- recipes ---------------- */

  function allRecipes() {
    return tx(RECIPES, "readonly", function (s) { return s.getAll(); })
      .then(function (rows) { return rows || []; })
      .catch(function () { return []; });
  }

  function putRecipe(recipe) {
    return tx(RECIPES, "readwrite", function (s) { return s.put(recipe); }).then(function () { return recipe; });
  }

  function removeRecipe(id) {
    return tx(RECIPES, "readwrite", function (s) { return s.delete(id); });
  }

  /* ---------------- files ---------------- */

  function putFile(path, file) {
    return tx(FILES, "readwrite", function (s) {
      return s.put({ path: path, blob: file, type: file.type || "", name: file.name || path.split("/").pop() });
    }).then(function () { return path; });
  }

  function allFiles() {
    return tx(FILES, "readonly", function (s) { return s.getAll(); })
      .then(function (rows) { return rows || []; })
      .catch(function () { return []; });
  }

  function removeFile(path) {
    return tx(FILES, "readwrite", function (s) { return s.delete(path); });
  }

  /* How much of the browser's allowance we've used. */
  function usage() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (e) {
      return { used: e.usage || 0, quota: e.quota || 0 };
    }).catch(function () { return null; });
  }

  return {
    supported: supported,
    allRecipes: allRecipes,
    putRecipe: putRecipe,
    removeRecipe: removeRecipe,
    putFile: putFile,
    allFiles: allFiles,
    removeFile: removeFile,
    usage: usage
  };
})();
