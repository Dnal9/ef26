/* ============================================================
   EF26 — js/export.js : exports PNG / PDF (depuis l'admin)
   Construit une "feuille" propre (titre + date + contenu) hors écran,
   puis la rend en image via html2canvas, et en PDF via jsPDF.
   Dépendances (chargées dans admin.html) : html2canvas, jspdf.
   ============================================================ */
(function () {
  "use strict";
  var esc = U.esc;

  /* ---------- helpers de contenu ---------- */
  function medalRows(s) {
    var ranked = Logic.sortTable(Logic.computeTable(s.teams, s.matches));
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    return { ranked: ranked, byId: byId };
  }

  function viewClassement(s) {
    var d = medalRows(s), medals = ["🥇", "🥈", "🥉"];
    var rows = d.ranked.map(function (r, i) {
      var t = d.byId[r.id], z = Logic.zone(i);
      var zc = z === "q" ? "#d0a83e" : z === "b" ? "#c98a2b" : "#6a665c";
      return '<tr>' +
        '<td class="pos" style="border-left:4px solid ' + zc + '">' + (i + 1) + (i < 3 ? " " + medals[i] : "") + '</td>' +
        '<td class="tm">' + C.logoSVG(t, 22) + '<span>' + esc(t.name) + '</span></td>' +
        '<td>' + r.j + '</td><td>' + r.g + '</td><td>' + r.n + '</td><td>' + r.p + '</td>' +
        '<td>' + r.bp + '</td><td>' + r.bc + '</td>' +
        '<td>' + (r.diff > 0 ? "+" : "") + r.diff + '</td>' +
        '<td class="pts">' + r.pts + '</td></tr>';
    }).join("");
    return '<table class="xt"><thead><tr>' +
      '<th>#</th><th style="text-align:left">Équipe</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="xlegend"><span style="color:#d0a83e">■</span> 1–4 quarts &nbsp; ' +
      '<span style="color:#c98a2b">■</span> 5–12 barrages &nbsp; ' +
      '<span style="color:#6a665c">■</span> 13–28 éliminés</div>';
  }

  function viewPots(s) {
    var pots = [[], [], [], [], [], [], []];
    s.teams.forEach(function (t) { if (pots[t.pot - 1]) pots[t.pot - 1].push(t); });
    var cols = pots.map(function (list, i) {
      var items = list.sort(function (a, b) { return b.pe - a.pe; }).map(function (t) {
        return '<div class="xp-row">' + C.logoSVG(t, 20) + '<span class="xp-n">' + esc(t.name) + '</span>' +
          '<span class="xp-pe">' + t.pe + '</span></div>';
      }).join("");
      return '<div class="xp-col"><div class="xp-h">Pot ' + (i + 1) + '</div>' + items + '</div>';
    }).join("");
    return '<div class="xp-grid">' + cols + '</div>';
  }

  function viewStats(s) {
    var table = Logic.computeTable(s.teams, s.matches);
    var sum = Logic.summary(s.teams, s.matches, table);
    function card(ico, lab, val, sub) {
      return '<div class="xs-card"><div class="xs-ico">' + ico + '</div>' +
        '<div class="xs-lab">' + lab + '</div><div class="xs-val">' + val + '</div>' +
        '<div class="xs-sub">' + esc(sub) + '</div></div>';
    }
    return '<div class="xs-grid">' +
      card("👑", "Leader", sum.leader.row.pts + " pts", sum.leader.team.name) +
      card("⚔️", "Meilleure attaque", sum.attack.row.bp + " buts", sum.attack.team.name) +
      card("🛡️", "Meilleure défense", sum.defense.row.bc + " enc.", sum.defense.team.name) +
      card("🔥", "Plus de victoires", sum.mostWins.row.g, sum.mostWins.team.name) +
      card("🥶", "Plus de défaites", sum.mostLoss.row.p, sum.mostLoss.team.name) +
      card("⚽", "Total de buts", sum.goals, "toutes journées") +
      card("📅", "Matchs joués", sum.played + " / " + sum.totalMatches, "phase de championnat") +
      card("📈", "Buts / match", sum.avgDiff, "moyenne") +
      '</div>';
  }

  function viewMatchs(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var html = "";
    for (var j = 1; j <= 7; j++) {
      var list = s.matches.filter(function (m) { return m.journee === j; });
      if (!list.length) continue;
      html += '<div class="xm-day"><div class="xm-dh">Journée ' + j + '</div><div class="xm-list">' +
        list.map(function (m) {
          var done = m.status === "termine";
          var sc = done ? (m.scoreHome + " – " + m.scoreAway) : "à venir";
          return '<div class="xm-row"><span class="xm-h">' + esc(byId[m.homeId].name) + '</span>' +
            '<span class="xm-s ' + (done ? "d" : "") + '">' + sc + '</span>' +
            '<span class="xm-a">' + esc(byId[m.awayId].name) + '</span></div>';
        }).join("") + '</div></div>';
    }
    return '<div class="xm-grid">' + html + '</div>';
  }

  function viewBracket(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var bk = Logic.bracket(Logic.computeTable(s.teams, s.matches), s.bracket.winners);
    var W = s.bracket.winners;
    function nm(id) { return id == null ? "—" : esc(byId[id].name); }
    function tie(key, pair, seeds) {
      var w = W[key];
      function line(id, seed) {
        var win = w === id && id != null;
        return '<div class="xb-slot' + (win ? " w" : "") + '"><span class="xb-seed">' + (seed || "") + '</span>' + nm(id) + '</div>';
      }
      return '<div class="xb-tie">' + line(pair[0], seeds[0]) + line(pair[1], seeds[1]) + '</div>';
    }
    function col(title, inner) { return '<div class="xb-col"><div class="xb-h">' + title + '</div>' + inner + '</div>'; }
    return '<div class="xb-grid">' +
      col("Barrages",
        tie("BA", bk.barrages.BA, ["5", "12"]) + tie("BB", bk.barrages.BB, ["6", "11"]) +
        tie("BC", bk.barrages.BC, ["7", "10"]) + tie("BD", bk.barrages.BD, ["8", "9"])) +
      col("Quarts",
        tie("QF1", bk.quarts.QF1, ["1", ""]) + tie("QF2", bk.quarts.QF2, ["2", ""]) +
        tie("QF3", bk.quarts.QF3, ["3", ""]) + tie("QF4", bk.quarts.QF4, ["4", ""])) +
      col("Demies", tie("SF1", bk.demis.SF1, ["", ""]) + tie("SF2", bk.demis.SF2, ["", ""])) +
      col("Finale", tie("FIN", bk.finale.FIN, ["", ""]) +
        '<div class="xb-champ">🏆 ' + nm(bk.champion) + '</div>') +
      '</div>';
  }

  var VIEWS = {
    classement: { title: "Classement", w: 720, fn: viewClassement },
    pots:       { title: "Les 7 pots", w: 900, fn: viewPots },
    stats:      { title: "Statistiques", w: 760, fn: viewStats },
    matchs:     { title: "Calendrier", w: 900, fn: viewMatchs },
    bracket:    { title: "Tableau final", w: 900, fn: viewBracket }
  };

  /* ---------- feuille propre (hors écran) ---------- */
  function buildSheet(key) {
    var v = VIEWS[key]; var s = Store.get();
    var sheet = document.createElement("div");
    sheet.className = "xsheet";
    sheet.style.width = v.w + "px";
    var date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    sheet.innerHTML =
      '<div class="xhead">' +
        '<img src="assets/logo-ef26.svg" width="46" height="46" alt="">' +
        '<div class="xtitles"><div class="xkick">EF26 · Final Chapter</div>' +
        '<div class="xh1">' + v.title + '</div></div>' +
        '<div class="xdate">' + date + '</div></div>' +
        v.fn(s) +
      '<div class="xfoot">EF26 · Final Chapter — dnal9.github.io/ef26</div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function withSheet(key, cb) {
    var sheet = buildSheet(key);
    // laisser le temps aux polices / logos de se poser
    var go = function () {
      html2canvas(sheet, { backgroundColor: "#0c0c0d", scale: 2, useCORS: true, logging: false })
        .then(function (canvas) { cb(canvas); })
        .catch(function (e) { U.toast("Export impossible (réseau ?)"); console.warn(e); })
        .then(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 120); });
    else setTimeout(go, 250);
  }

  function exportPNG(key) {
    if (!window.html2canvas) { U.toast("Librairie image non chargée"); return; }
    U.toast("Génération de l'image…");
    withSheet(key, function (canvas) {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "EF26-" + key + ".png"; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }, "image/png");
    });
  }

  function exportPDF(key) {
    if (!window.html2canvas || !window.jspdf) { U.toast("Librairie PDF non chargée"); return; }
    U.toast("Génération du PDF…");
    withSheet(key, function (canvas) {
      var jsPDF = window.jspdf.jsPDF;
      var portrait = canvas.height >= canvas.width;
      var pdf = new jsPDF({ orientation: portrait ? "p" : "l", unit: "pt", format: "a4" });
      var pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      var margin = 24;
      var iw = pw - margin * 2;
      var ih = iw * canvas.height / canvas.width;
      var img = canvas.toDataURL("image/png");
      if (ih <= ph - margin * 2) {
        pdf.addImage(img, "PNG", margin, margin, iw, ih);
      } else {
        // plusieurs pages si trop long
        var sliceH = (ph - margin * 2) * canvas.width / iw;
        var y = 0, page = 0;
        while (y < canvas.height) {
          var cv = document.createElement("canvas");
          cv.width = canvas.width; cv.height = Math.min(sliceH, canvas.height - y);
          cv.getContext("2d").drawImage(canvas, 0, y, canvas.width, cv.height, 0, 0, canvas.width, cv.height);
          if (page > 0) pdf.addPage();
          pdf.addImage(cv.toDataURL("image/png"), "PNG", margin, margin, iw, iw * cv.height / canvas.width);
          y += sliceH; page++;
        }
      }
      pdf.save("EF26-" + key + ".pdf");
    });
  }

  window.EX = { png: exportPNG, pdf: exportPDF, VIEWS: VIEWS };
})();
