/* ============================================================
   EF26 — js/pages/stats.js : page Statistiques (dashboard)
   8 cartes + 2 graphiques canvas maison (aucune dépendance).
   ============================================================ */
(function () {
  "use strict";

  C.navbar("statistiques.html");
  C.loader();
  Store.init();

  var st = Store.get();

  /* ---------- palette des graphes ---------- */
  var CH = {
    grid: "rgba(143,167,155,.18)", label: "#8fa79b", bone: "#edece3",
    gold: "#e8b23a", goldLt: "#f7da86", teal: "#d6cbb0", dim: "#3a4f43",
    fontS: '500 11px "Oswald", sans-serif', fontM: '600 12px "Barlow Condensed", sans-serif'
  };

  /* ---------- cartes ---------- */
  function renderCards(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var table = Logic.computeTable(s.teams, s.matches);
    var sum = Logic.summary(s.teams, s.matches, table);
    var badge = function (o) { return C.teamBadge(o.team, { size: "sm" }); };

    U.$("st-cards").innerHTML =
      C.statCard({ ico: "👑", lab: "Leader", val: sum.leader.row.pts + " pts", sub: badge(sum.leader), gold: true }) +
      C.statCard({ cls: "teal", ico: "⚔️", lab: "Meilleure attaque", val: sum.attack.row.bp + " buts", sub: badge(sum.attack) }) +
      C.statCard({ cls: "green", ico: "🛡️", lab: "Meilleure défense", val: sum.defense.row.bc + " encaissés", sub: badge(sum.defense) }) +
      C.statCard({ ico: "🔥", lab: "Plus de victoires", val: sum.mostWins.row.g, sub: badge(sum.mostWins), gold: true }) +
      C.statCard({ cls: "teal", ico: "🥶", lab: "Plus de défaites", val: sum.mostLoss.row.p, sub: badge(sum.mostLoss) }) +
      C.statCard({ cls: "green", ico: "⚽", lab: "Total de buts", val: sum.goals, sub: "toutes journées" }) +
      C.statCard({ ico: "📅", lab: "Matchs joués", val: sum.played + " / " + sum.totalMatches, sub: "phase de championnat", gold: true }) +
      C.statCard({ cls: "teal", ico: "📈", lab: "Buts par match", val: sum.avgDiff, sub: "moyenne du tournoi" });
  }

  /* ---------- moteur canvas (DPR-aware) ---------- */
  function prep(cv) {
    var dpr = window.devicePixelRatio || 1;
    var r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, Math.abs(w) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* graphe 1 : top 10 aux points (barres horizontales) */
  function chartPoints(s) {
    var cv = U.$("ch-points"); var p = prep(cv), ctx = p.ctx;
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var top = Logic.sortTable(Logic.computeTable(s.teams, s.matches)).slice(0, 10);
    var max = Math.max(3, top[0] ? top[0].pts : 0);
    var padL = 118, padR = 34, padT = 8, rowH = (p.h - padT - 6) / 10;

    top.forEach(function (r, i) {
      var y = padT + i * rowH, bh = Math.min(16, rowH - 8);
      var bw = (p.w - padL - padR) * (r.pts / max);
      /* nom */
      ctx.font = CH.fontM; ctx.fillStyle = i < 3 ? CH.bone : CH.label;
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      var nm = byId[r.id].name;
      if (nm.length > 15) nm = nm.slice(0, 14) + "…";
      ctx.fillText(nm, padL - 10, y + rowH / 2);
      /* piste */
      ctx.fillStyle = "rgba(58,79,67,.35)";
      roundRect(ctx, padL, y + (rowH - bh) / 2, p.w - padL - padR, bh, bh / 2); ctx.fill();
      /* barre */
      if (r.pts > 0) {
        var grad = ctx.createLinearGradient(padL, 0, padL + bw, 0);
        grad.addColorStop(0, i < 3 ? "#b8862a" : "#8a6b2a");
        grad.addColorStop(1, i < 3 ? CH.goldLt : CH.teal);
        ctx.fillStyle = grad;
        roundRect(ctx, padL, y + (rowH - bh) / 2, bw, bh, bh / 2); ctx.fill();
      }
      /* valeur */
      ctx.font = CH.fontS; ctx.fillStyle = i < 3 ? CH.gold : CH.label;
      ctx.textAlign = "left";
      ctx.fillText(String(r.pts), padL + Math.max(bw, 2) + 7, y + rowH / 2);
    });
  }

  /* graphe 2 : buts par journée (barres verticales) */
  function chartGoals(s) {
    var cv = U.$("ch-goals"); var p = prep(cv), ctx = p.ctx;
    var goals = [0,0,0,0,0,0,0], counts = [0,0,0,0,0,0,0];
    s.matches.forEach(function (m) {
      if (m.status !== "termine") return;
      goals[m.journee - 1] += m.scoreHome + m.scoreAway;
      counts[m.journee - 1]++;
    });
    var max = Math.max(5, Math.max.apply(null, goals));
    var padL = 34, padB = 30, padT = 12;
    var iw = (p.w - padL - 16) / 7;

    /* grille + axe Y */
    ctx.font = CH.fontS; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var v = Math.round(max * i / steps);
      var y = p.h - padB - (p.h - padB - padT) * (i / steps);
      ctx.strokeStyle = CH.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(p.w - 8, y); ctx.stroke();
      ctx.fillStyle = CH.label; ctx.fillText(String(v), padL - 8, y);
    }

    for (var j = 0; j < 7; j++) {
      var bw = Math.min(40, iw * 0.55);
      var x = padL + iw * j + (iw - bw) / 2;
      var bh = (p.h - padB - padT) * (goals[j] / max);
      var y0 = p.h - padB - bh;
      if (goals[j] > 0) {
        var grad = ctx.createLinearGradient(0, y0, 0, p.h - padB);
        grad.addColorStop(0, CH.goldLt); grad.addColorStop(1, "#8a6420");
        ctx.fillStyle = grad;
        roundRect(ctx, x, y0, bw, bh, 5); ctx.fill();
        ctx.font = CH.fontM; ctx.fillStyle = CH.gold;
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(String(goals[j]), x + bw / 2, y0 - 4);
      } else {
        ctx.fillStyle = "rgba(58,79,67,.35)";
        roundRect(ctx, x, p.h - padB - 3, bw, 3, 1.5); ctx.fill();
      }
      /* label X */
      ctx.font = CH.fontM; ctx.fillStyle = counts[j] ? CH.bone : CH.label;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("J" + (j + 1), x + bw / 2, p.h - padB + 8);
    }
  }

  /* ---------- orchestration ---------- */
  function render(s) {
    renderCards(s);
    chartPoints(s);
    chartGoals(s);
  }

  render(Store.get());
  Store.onChange(render);
  var rT;
  window.addEventListener("resize", function () {
    clearTimeout(rT); rT = setTimeout(function () { render(Store.get()); }, 120);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { render(Store.get()); });
  }
})();
