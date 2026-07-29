/* ============================================================
   EF26 — js/pages/equipes.js : page Équipes (une fiche par équipe)
   ============================================================ */
(function () {
  "use strict";

  C.navbar("equipes.html");
  C.loader();
  Store.init();

  var st = Store.get();
  if (!st.matches.length) {
    Logic.assignPots(st.teams);
    st.matches = Logic.generateCalendar(st.teams);
    Store.save(true);
  }

  var query = "";

  /* ligne de match compacte, vue depuis l'équipe t */
  function rowHTML(m, t, byId) {
    var home = m.homeId === t.id;
    var opp = byId[home ? m.awayId : m.homeId];
    if (m.status === "termine") {
      var my = home ? m.scoreHome : m.scoreAway;
      var his = home ? m.scoreAway : m.scoreHome;
      var res = my > his ? "G" : my < his ? "P" : "N";
      return '<div class="eq-row"><span class="j">J' + m.journee + "</span>" +
        '<span class="opp">vs ' + U.esc(opp.name) + "</span>" +
        '<span class="sc">' + my + "–" + his + "</span>" +
        '<span class="res r' + res + '">' + res + "</span></div>";
    }
    return '<div class="eq-row up"><span class="j">J' + m.journee + "</span>" +
      '<span class="opp">vs ' + U.esc(opp.name) + "</span>" +
      '<span class="sc">à venir</span></div>';
  }

  function cardHTML(t, row, rank, byId, matches) {
    var zone = Logic.zone(rank);
    var zlab = zone === "q" ? "Quarts" : zone === "b" ? "Barrage" : "Éliminé";
    var mine = Logic.teamMatches(matches, t.id);
    var played = mine.filter(function (m) { return m.status === "termine"; }).slice(-3).reverse();
    var next = mine.filter(function (m) { return m.status === "a_venir"; }).slice(0, 2);

    var forme = row.forme.length
      ? '<span class="forme">' + row.forme.slice(-5).map(function (x) {
          return '<i class="f' + x + '">' + x + "</i>";
        }).join("") + "</span>"
      : '<span class="none">Aucun match joué</span>';

    return '<article class="card eq" id="t' + t.id + '">' +
      '<div class="eq-head">' + C.logoSVG(t, 40) +
        '<span class="tb-name">' + U.esc(t.name) + "</span>" +
        '<span class="eq-rank"><div class="r z-' + zone + '">' + (rank + 1) + "ᵉ</div>" +
        '<div class="pot">Pot ' + t.pot + " · " + zlab + "</div></span></div>" +
      '<div class="eq-stats">' +
        '<div><div class="v gold">' + row.pts + '</div><div class="k">Pts</div></div>' +
        '<div><div class="v">' + row.g + "-" + row.n + "-" + row.p + '</div><div class="k">V-N-D</div></div>' +
        '<div><div class="v">' + row.bp + ":" + row.bc + '</div><div class="k">Buts</div></div>' +
        '<div><div class="v">' + (row.diff > 0 ? "+" : "") + row.diff + '</div><div class="k">Diff</div></div>' +
      "</div>" +
      '<div class="eq-forme">Forme ' + forme + "</div>" +
      '<div class="eq-sec"><div class="t">Historique</div>' +
        (played.length ? played.map(function (m) { return rowHTML(m, t, byId); }).join("")
                       : '<div class="eq-empty-row">Aucun match joué pour l\'instant.</div>') + "</div>" +
      '<div class="eq-sec"><div class="t">Prochains matchs</div>' +
        (next.length ? next.map(function (m) { return rowHTML(m, t, byId); }).join("")
                     : '<div class="eq-empty-row">Phase de championnat terminée.</div>') + "</div>" +
      "</article>";
  }

  function render(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var ranked = Logic.sortTable(Logic.computeTable(s.teams, s.matches));
    var rankOf = {}, rowOf = {};
    ranked.forEach(function (r, i) { rankOf[r.id] = i; rowOf[r.id] = r; });

    /* cartes dans l'ordre du classement */
    var list = ranked
      .map(function (r) { return byId[r.id]; })
      .filter(function (t) { return !query || t.name.toLowerCase().indexOf(query) !== -1; });

    U.$("eq-grid").innerHTML = list.map(function (t) {
      return cardHTML(t, rowOf[t.id], rankOf[t.id], byId, s.matches);
    }).join("");
    U.$("eq-count").textContent = query ? list.length + " / 20 équipes" : "20 équipes";
  }

  U.$("eq-q").addEventListener("input", function (e) {
    query = e.target.value.trim().toLowerCase();
    render(Store.get());
  });

  render(Store.get());
  Store.onChange(render);

  /* atterrissage sur #tX depuis une autre page */
  if (location.hash) {
    var el = document.querySelector(location.hash.replace(/[^#a-zA-Z0-9_-]/g, ""));
    if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 250);
  }
})();
