/* ============================================================
   EF26 — js/pages/matchs.js : page Matchs (façon Flashscore)
   Onglets par journée + filtres Terminés / À venir.
   ============================================================ */
(function () {
  "use strict";

  C.navbar("matchs.html");
  C.loader();
  Store.init();

  var st = Store.get();

  /* ---------- état local ---------- */
  var day = 0;        // 0 = toutes les journées, sinon 1..5
  var filter = "all"; // all | done | next

  /* ---------- rendu ---------- */
  function render(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var done = s.matches.filter(function (m) { return m.status === "termine"; });

    /* résumé */
    U.$("mx-summary").innerHTML =
      C.statCard({ ico: "📅", lab: "Matchs joués", val: done.length + " / " + s.matches.length, sub: "phase de championnat", gold: true }) +
      C.statCard({ cls: "teal", ico: "⏳", lab: "Matchs restants", val: s.matches.length - done.length, sub: "avant le tableau final" }) +
      C.statCard({ cls: "green", ico: "⚽", lab: "Buts marqués", val: done.reduce(function (n, m) { return n + m.scoreHome + m.scoreAway; }, 0), sub: "toutes journées" });

    /* onglets journées (avec progression x/10) */
    var tabs = '<button class="mx-tab' + (day === 0 ? " active" : "") + '" data-day="0">Toutes</button>';
    for (var j = 1; j <= 7; j++) {
      var dj = s.matches.filter(function (m) { return m.journee === j; });
      var dd = dj.filter(function (m) { return m.status === "termine"; }).length;
      tabs += '<button class="mx-tab' + (day === j ? " active" : "") + '" data-day="' + j + '">J' + j +
        '<span class="n">' + dd + "/" + dj.length + "</span></button>";
    }
    U.$("mx-tabs").innerHTML = tabs;

    /* filtres statut */
    U.$("mx-filters").innerHTML =
      '<button class="mx-chip' + (filter === "all"  ? " active" : "") + '" data-f="all">Tous</button>' +
      '<button class="mx-chip' + (filter === "done" ? " active" : "") + '" data-f="done">Terminés</button>' +
      '<button class="mx-chip' + (filter === "next" ? " active" : "") + '" data-f="next">À venir</button>';

    /* blocs journée */
    var days = day === 0 ? [1, 2, 3, 4, 5] : [day];
    var html = "";
    days.forEach(function (j) {
      var all = s.matches.filter(function (m) { return m.journee === j; });
      var dd = all.filter(function (m) { return m.status === "termine"; }).length;
      var list = all.filter(function (m) {
        if (filter === "done") return m.status === "termine";
        if (filter === "next") return m.status === "a_venir";
        return true;
      });
      var pct = all.length ? Math.round(dd / all.length * 100) : 0;
      html += '<section class="mx-day">' +
        '<div class="mx-day-head"><span class="dj">J' + j + "</span>" +
        '<span class="dt">Journée ' + j + "</span>" +
        '<span class="mx-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="dp">' + dd + " / " + all.length + " joués</span></div>";
      if (list.length) {
        html += '<div class="mx-list">' + list.map(function (m) {
          return C.matchCard(m, byId, { small: true });
        }).join("") + "</div>";
      } else {
        html += '<div class="mx-empty">' +
          (filter === "done" ? "Aucun match terminé dans cette journée pour l'instant."
                             : "Aucun match à venir dans cette journée — tout est joué !") + "</div>";
      }
      html += "</section>";
    });
    U.$("mx-days").innerHTML = html;
  }

  /* ---------- interactions ---------- */
  U.$("mx-tabs").addEventListener("click", function (e) {
    var b = e.target.closest(".mx-tab"); if (!b) return;
    day = parseInt(b.dataset.day, 10);
    render(Store.get());
  });
  U.$("mx-filters").addEventListener("click", function (e) {
    var b = e.target.closest(".mx-chip"); if (!b) return;
    filter = b.dataset.f;
    render(Store.get());
  });

  /* ---------- init ---------- */
  render(Store.get());
  Store.onChange(render);
})();
