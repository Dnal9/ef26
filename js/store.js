/* ============================================================
   EF26 — js/store.js : LA couche de données.
   Seul fichier qui sait OÙ vivent les données (localStorage).
   Pour passer à Firebase : remplacer _read/_write et brancher
   l'écouteur temps réel dans init() — rien d'autre ne change.
   ============================================================ */
(function () {
  "use strict";
  var KEY = "ef26_v2";
  var state = null;
  var listeners = [];

  /* ---------- schéma par défaut ---------- */
  function defaultState() {
    var teams = [];
    for (var i = 0; i < 20; i++) {
      teams.push({
        id: i,
        name: "Équipe " + (i + 1),
        logo: "",                    // vide => monogramme SVG généré
        pe: 3000,                    // puissance d'équipe (eFootball)
        pot: Math.floor(i / 4) + 1   // 1..5, recalculé au tirage
      });
    }
    return {
      teams: teams,
      matches: [],                   // rempli par Logic.generateCalendar
      bracket: { winners: {} },
      meta: { updatedAt: 0, name: "EF26 · Final Chapter" }
    };
  }

  /* ---------- persistance (à remplacer pour Firebase) ---------- */
  function _read() {
    try {
      var v = localStorage.getItem(KEY);
      if (v) {
        var s = JSON.parse(v);
        if (s && s.teams && s.teams.length === 20) return s;
      }
    } catch (e) {}
    return null;
  }
  function _write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ---------- API publique ---------- */
  function get() { return state; }

  var saveT;
  function save(immediate) {
    state.meta.updatedAt = Date.now();
    if (immediate) { _write(state); }
    else { clearTimeout(saveT); saveT = setTimeout(function () { _write(state); }, 400); }
    emit();
  }

  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  function reset() { state = defaultState(); save(true); }

  function init() {
    state = _read() || defaultState();
    // synchro entre onglets (même contrat que le "on value" de Firebase)
    window.addEventListener("storage", function (e) {
      if (e.key === KEY && e.newValue) {
        try { state = JSON.parse(e.newValue); emit(); } catch (err) {}
      }
    });
    emit();
  }

  window.Store = { init: init, get: get, save: save, onChange: onChange, reset: reset };
})();
