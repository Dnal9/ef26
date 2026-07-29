/* ============================================================
   EF26 — js/store.js  (VERSION FIREBASE — temps réel partagé)
   Même contrat que la version locale : get / save / onChange /
   reset / init. Aucune autre page à modifier.

   Source de vérité = Firebase Realtime Database.
   Cache localStorage = affichage instantané au chargement.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- config Firebase ---------- */
  var firebaseConfig = {
    apiKey: "AIzaSyDnwM_YeTtB73qKkjfLXXc9omn2h3Ra4ck",
    authDomain: "ef26-8661a.firebaseapp.com",
    databaseURL: "https://ef26-8661a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ef26-8661a",
    storageBucket: "ef26-8661a.firebasestorage.app",
    messagingSenderId: "864805970242",
    appId: "1:864805970242:web:122d8106728058828628db"
  };

  var CACHE = "ef26_cache";      // copie locale pour affichage immediat
  var PATH = "tournament";       // noeud racine dans la base
  var state = null;
  var listeners = [];
  var db = null;                 // reference Firebase (null tant que le SDK n'est pas la)
  var ready = false;             // 1re valeur recue du serveur ?
  var applyingRemote = false;    // evite de re-ecrire ce qu'on vient de recevoir

  /* ---------- schema par defaut ---------- */
  function defaultState() {
    var teams = [];
    for (var i = 0; i < 20; i++) {
      teams.push({
        id: i, name: "Equipe " + (i + 1), logo: "",
        pe: 3000, pot: Math.floor(i / 4) + 1
      });
    }
    return {
      teams: teams, matches: [], bracket: { winners: {} },
      meta: { updatedAt: 0, name: "EF26 - Final Chapter" }
    };
  }

  /* ---------- cache local ---------- */
  function readCache() {
    try {
      var v = localStorage.getItem(CACHE);
      if (v) { var s = JSON.parse(v); if (s && s.teams && s.teams.length === 20) return s; }
    } catch (e) {}
    return null;
  }
  function writeCache(s) { try { localStorage.setItem(CACHE, JSON.stringify(s)); } catch (e) {} }

  /* ---------- normalisation (Firebase retire tableaux vides / trous) ---------- */
  function normalize(s) {
    if (!s || typeof s !== "object") return defaultState();
    if (!Array.isArray(s.teams)) s.teams = defaultState().teams;
    if (!Array.isArray(s.matches)) s.matches = [];
    if (!s.bracket) s.bracket = { winners: {} };
    if (!s.bracket.winners) s.bracket.winners = {};
    if (!s.meta) s.meta = { updatedAt: 0, name: "EF26 - Final Chapter" };
    return s;
  }

  /* ---------- API publique ---------- */
  function get() { return state; }
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  var saveT;
  function save(immediate) {
    state.meta.updatedAt = Date.now();
    writeCache(state);
    emit();
    if (applyingRemote) return;           // on n'ecrit pas une valeur recue du serveur
    var push = function () { if (db) db.ref(PATH).set(state); };
    if (immediate) push();
    else { clearTimeout(saveT); saveT = setTimeout(push, 400); }
  }

  function reset() {
    state = defaultState();
    save(true);
  }

  /* ---------- init ---------- */
  function init() {
    // 1) demarrage instantane depuis le cache (ou defaut)
    state = readCache() || defaultState();
    emit();

    // 2) branchement Firebase (si le SDK est charge)
    if (typeof firebase === "undefined" || !firebase.initializeApp) {
      console.warn("[EF26] SDK Firebase absent - mode hors-ligne (cache local).");
      return;
    }
    try {
      var app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
      db = firebase.database(app);

      // ecoute temps reel : toute ecriture rafraichit le site
      db.ref(PATH).on("value", function (snap) {
        var val = snap.val();
        if (val) {
          applyingRemote = true;
          state = normalize(val);
          writeCache(state);
          applyingRemote = false;
        } else if (!ready) {
          // base vide au tout premier lancement : on la seme avec l'etat courant
          db.ref(PATH).set(state);
        }
        ready = true;
        emit();
      }, function (err) {
        console.warn("[EF26] Lecture Firebase impossible :", err && err.message);
      });
    } catch (e) {
      console.warn("[EF26] Firebase non initialise :", e && e.message);
    }
  }

  window.Store = { init: init, get: get, save: save, onChange: onChange, reset: reset };
})();
