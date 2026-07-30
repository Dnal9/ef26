/* ============================================================
   EF26 — js/pages/home.js : page Accueil
   ============================================================ */
(function () {
  "use strict";

  C.navbar("index.html");
  C.loader();
  Store.init();

  // première visite : pots + calendrier
  var st = Store.get();

  function render(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var table = Logic.computeTable(s.teams, s.matches);
    var sum = Logic.summary(s.teams, s.matches, table);

    /* prochain match / dernier résultat */
    var next = Logic.nextMatch(s.matches);
    var last = Logic.lastResult(s.matches);
    U.$("h-next").innerHTML = next
      ? C.matchCard(next, byId)
      : '<div class="duo-empty">Phase de championnat terminée — place au tableau final !</div>';
    U.$("h-last").innerHTML = last
      ? C.matchCard(last, byId)
      : '<div class="duo-empty">Aucun match joué pour l\'instant.</div>';

    /* podium top 3 (ordre visuel : 2 – 1 – 3) */
    var t3 = sum.top3, medals = ["🥇", "🥈", "🥉"];
    function pod(i) {
      if (!t3[i]) return "";
      return '<div class="pod p' + (i + 1) + '">' +
        '<div class="medal">' + medals[i] + "</div>" +
        C.teamBadge(t3[i].team, { size: i === 0 ? "lg" : "" }) +
        '<div class="pts">' + t3[i].row.pts + ' pts</div>' +
        '<div class="sub">' + t3[i].row.g + "V · " + t3[i].row.n + "N · " + t3[i].row.p + "D" +
        (t3[i].row.diff ? " · " + (t3[i].row.diff > 0 ? "+" : "") + t3[i].row.diff : "") + "</div></div>";
    }
    U.$("h-podium").innerHTML = pod(1) + pod(0) + pod(2);

    /* leader + chiffres clés */
    U.$("h-stats").innerHTML =
      C.statCard({ ico: "👑", lab: "Leader", val: sum.leader.row.pts + " pts", sub: U.esc(sum.leader.team.name), gold: true }) +
      C.statCard({ cls: "teal", ico: "📅", lab: "Matchs joués", val: sum.played + " / " + sum.totalMatches, sub: "phase de championnat" }) +
      C.statCard({ cls: "green", ico: "⚽", lab: "Buts marqués", val: sum.goals, sub: sum.avgDiff + " but(s) / match" }) +
      C.statCard({ ico: "🔄", lab: "Mise à jour", val: "", sub: U.fmtDateTime(s.meta.updatedAt) });
  }

  render(Store.get());
  Store.onChange(render);
})();
