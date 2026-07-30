/* ============================================================
   EF26 — js/pages/admin.js : espace organisateur
   Équipes (noms + PE) · Scores par match · Éliminatoires · Outils
   ------------------------------------------------------------
   ⚠️ SÉCURITÉ : ce mot de passe vit côté navigateur — il est
   visible dans le code source. Il filtre les curieux, mais la
   vraie protection (visiteurs = lecture / admin = écriture)
   viendra avec Firebase Auth + règles de base de données.
   ============================================================ */
(function () {
  "use strict";

  var ADMIN_PW = "ef26";          // ← change-le ici
  var SESS = "ef26_admin_ok";

  /* ---------- portail de connexion ---------- */
  function gate() {
    var ok = false;
    try { ok = sessionStorage.getItem(SESS) === "1"; } catch (e) {}
    if (ok) { openPanel(); return; }
    U.$("ad-login").style.display = "";
    U.$("ad-loginBtn").addEventListener("click", tryLogin);
    U.$("ad-pw").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
  }
  function tryLogin() {
    if (U.$("ad-pw").value === ADMIN_PW) {
      try { sessionStorage.setItem(SESS, "1"); } catch (e) {}
      U.$("ad-login").style.display = "none";
      openPanel();
    } else {
      U.$("ad-err").textContent = "Mot de passe incorrect.";
    }
  }

  /* ---------- panneau ---------- */
  var tab = "matchs";   // matchs | equipes | bracket | outils
  var day = 1;

  function openPanel() {
    U.$("ad-panel").style.display = "";
    Store.init();
    var st = Store.get();
    U.$("ad-tabs").addEventListener("click", function (e) {
      var b = e.target.closest(".ad-tab"); if (!b) return;
      tab = b.dataset.t; renderTabs(); renderSection();
    });
    renderTabs(); renderSection();
  }

  function renderTabs() {
    var T = [["matchs", "⚽ Scores"], ["equipes", "🛡️ Équipes"], ["bracket", "⚔️ Éliminatoires"], ["export", "📤 Export"], ["outils", "⚙️ Outils"]];
    U.$("ad-tabs").innerHTML = T.map(function (t) {
      return '<button class="ad-tab' + (tab === t[0] ? " active" : "") + '" data-t="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
  }

  function renderSection() {
    var host = U.$("ad-body");
    if (tab === "matchs") renderMatchs(host);
    else if (tab === "equipes") renderEquipes(host);
    else if (tab === "bracket") renderBracket(host);
    else if (tab === "export") renderExport(host);
    else renderOutils(host);
  }

  /* ============ EXPORT ============ */
  function renderExport(host) {
    var items = [
      ["classement", "🏆", "Classement", "Le tableau complet avec zones et podium"],
      ["pots", "🎯", "Les 7 pots", "La répartition des 28 équipes par PE"],
      ["stats", "📊", "Statistiques", "Les 8 cartes de records"],
      ["matchs", "📅", "Calendrier", "Les 7 journées et leurs scores"],
      ["bracket", "⚔️", "Tableau final", "Barrages, quarts, demies, finale"]
    ];
    host.innerHTML =
      '<p class="hint">Génère une image (PNG, idéale pour WhatsApp) ou un PDF propre — avec titre, date et logo. Le téléchargement part dans tes fichiers ; sur Android tu le retrouves dans « Téléchargements » et tu peux le partager directement.</p>' +
      '<div class="ad-export">' + items.map(function (it) {
        return '<div class="ad-xcard"><div class="ad-xtop"><span class="ad-xico">' + it[1] + '</span>' +
          '<div><div class="ad-xtitle">' + it[2] + '</div><div class="ad-xdesc">' + it[3] + '</div></div></div>' +
          '<div class="ad-xbtns">' +
          '<button class="btn" data-x="png" data-view="' + it[0] + '">🖼️ PNG</button>' +
          '<button class="btn" data-x="pdf" data-view="' + it[0] + '">📄 PDF</button>' +
          '</div></div>';
      }).join("") + '</div>' +
      '<p class="note">💡 Astuce : le PNG est parfait pour poster dans le groupe WhatsApp. Le PDF est mieux pour imprimer ou archiver.</p>';

    host.querySelector(".ad-export").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-x]"); if (!b) return;
      var view = b.dataset.view;
      if (b.dataset.x === "png") EX.png(view); else EX.pdf(view);
    });
  }

  /* ============ SCORES ============ */
  function renderMatchs(host) {
    var s = Store.get();
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var chips = "";
    for (var j = 1; j <= 7; j++) {
      var dj = s.matches.filter(function (m) { return m.journee === j; });
      var dd = dj.filter(function (m) { return m.status === "termine"; }).length;
      chips += '<button class="mx-tab' + (day === j ? " active" : "") + '" data-day="' + j + '">J' + j +
        '<span class="n">' + dd + "/" + dj.length + "</span></button>";
    }
    var list = s.matches.filter(function (m) { return m.journee === day; });
    host.innerHTML =
      '<p class="hint">Saisis les deux scores pour valider un match — vide une case pour le repasser « à venir ». Tout se recalcule partout, en direct.</p>' +
      '<div class="mx-tabs" id="ad-days">' + chips + "</div>" +
      '<div class="ad-mx">' + list.map(function (m) {
        var done = m.status === "termine";
        return '<div class="ad-m" data-mid="' + m.id + '">' +
          '<div class="home">' + C.teamBadge(byId[m.homeId], { size: "sm", link: false }) + "</div>" +
          '<div class="mid">' +
            '<input type="number" min="0" data-side="h" value="' + (m.scoreHome == null ? "" : m.scoreHome) + '">' +
            '<span class="sep">–</span>' +
            '<input type="number" min="0" data-side="a" value="' + (m.scoreAway == null ? "" : m.scoreAway) + '">' +
          "</div>" +
          '<div>' + C.teamBadge(byId[m.awayId], { size: "sm", link: false }) + "</div>" +
          '<span class="stt ' + (done ? "done" : "next") + '">' + (done ? "Terminé" : "À venir") + "</span></div>";
      }).join("") + "</div>";

    U.$("ad-days").addEventListener("click", function (e) {
      var b = e.target.closest(".mx-tab"); if (!b) return;
      day = parseInt(b.dataset.day, 10); renderMatchs(host);
    });

    host.querySelector(".ad-mx").addEventListener("input", function (e) {
      var inp = e.target; var row = inp.closest(".ad-m"); if (!row) return;
      var m = Store.get().matches.find(function (x) { return x.id === parseInt(row.dataset.mid, 10); });
      if (!m) return;
      var v = inp.value === "" ? null : Math.max(0, parseInt(inp.value, 10) || 0);
      if (inp.dataset.side === "h") m.scoreHome = v; else m.scoreAway = v;
      m.status = (m.scoreHome != null && m.scoreAway != null) ? "termine" : "a_venir";
      var stt = row.querySelector(".stt");
      stt.className = "stt " + (m.status === "termine" ? "done" : "next");
      stt.textContent = m.status === "termine" ? "Terminé" : "À venir";
      Store.save(false);
    });
  }

  /* ============ ÉQUIPES ============ */
  function renderEquipes(host) {
    var s = Store.get();
    host.innerHTML =
      '<p class="hint">Édite les noms et les PE. Les pots affichés sont ceux du tirage actuel : après un changement de PE, va dans <b>Outils → Régénérer le calendrier</b> pour refaire les pots et les matchs.</p>' +
      '<div class="card ad-teams"><div class="scroll-x"><table>' +
      '<thead><tr><th class="idx">#</th><th class="l">Équipe</th><th>PE</th><th>Pot actuel</th></tr></thead><tbody>' +
      s.teams.map(function (t, i) {
        return '<tr><td class="idx">' + (i + 1) + "</td>" +
          '<td class="l"><input value="' + U.esc(t.name) + '" data-id="' + t.id + '" data-k="name"></td>' +
          '<td><input class="pe" type="number" min="0" value="' + t.pe + '" data-id="' + t.id + '" data-k="pe"></td>' +
          '<td class="pot">Pot ' + t.pot + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";

    host.querySelector("tbody").addEventListener("input", function (e) {
      var inp = e.target; if (!inp.dataset.id) return;
      var t = Store.get().teams.find(function (x) { return x.id === parseInt(inp.dataset.id, 10); });
      if (!t) return;
      if (inp.dataset.k === "name") t.name = inp.value;
      else t.pe = Math.max(0, parseInt(inp.value, 10) || 0);
      Store.save(false);
    });
  }

  /* ============ ÉLIMINATOIRES ============ */
  function renderBracket(host) {
    var s = Store.get();
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var bk = Logic.bracket(Logic.computeTable(s.teams, s.matches), s.bracket.winners);
    var W = s.bracket.winners;

    function slot(key, id, seed) {
      if (id == null) return '<div class="ad-slot empty"><span class="seed">' + (seed || "") + "</span>À déterminer</div>";
      var w = W[key];
      return '<div class="ad-slot' + (w === id ? " win" : "") + '" data-key="' + key + '" data-id="' + id + '">' +
        '<span class="seed">' + (seed || "") + "</span>" + C.teamBadge(byId[id], { size: "sm", link: false }) + "</div>";
    }
    function tie(key, pair, seeds) {
      var w = W[key], decided = w != null && (w === pair[0] || w === pair[1]);
      return '<div class="ad-tie' + (decided ? " decided" : "") + '">' +
        (decided ? '<button class="clear" data-clear="' + key + '" title="Annuler">✕</button>' : "") +
        slot(key, pair[0], seeds[0]) + slot(key, pair[1], seeds[1]) + "</div>";
    }
    function round(title, inner) {
      return '<div class="ad-bk-round"><div class="rt">' + title + "</div>" + inner + "</div>";
    }

    host.innerHTML =
      '<p class="hint">Clique sur une équipe pour la déclarer vainqueur — elle avance automatiquement. ✕ pour annuler une décision.</p>' +
      '<div class="ad-bk">' +
      round("Barrages",
        tie("BA", bk.barrages.BA, ["5", "12"]) + tie("BB", bk.barrages.BB, ["6", "11"]) +
        tie("BC", bk.barrages.BC, ["7", "10"]) + tie("BD", bk.barrages.BD, ["8", "9"])) +
      round("Quarts de finale",
        tie("QF1", bk.quarts.QF1, ["1", ""]) + tie("QF2", bk.quarts.QF2, ["2", ""]) +
        tie("QF3", bk.quarts.QF3, ["3", ""]) + tie("QF4", bk.quarts.QF4, ["4", ""])) +
      round("Demi-finales",
        tie("SF1", bk.demis.SF1, ["", ""]) + tie("SF2", bk.demis.SF2, ["", ""])) +
      round("Finale", tie("FIN", bk.finale.FIN, ["", ""])) +
      "</div>";

    host.querySelector(".ad-bk").addEventListener("click", function (e) {
      var clear = e.target.closest(".clear");
      if (clear) {
        delete Store.get().bracket.winners[clear.dataset.clear];
        Store.save(true); renderBracket(host); return;
      }
      var sl = e.target.closest(".ad-slot");
      if (!sl || sl.classList.contains("empty")) return;
      Store.get().bracket.winners[sl.dataset.key] = parseInt(sl.dataset.id, 10);
      Store.save(true); renderBracket(host);
    });
  }

  /* ============ OUTILS ============ */
  function renderOutils(host) {
    host.innerHTML =
      '<div class="ad-tools" style="display:grid;gap:14px">' +
      '<div class="card ad-warn"><h3>♻️ Régénérer le calendrier</h3>' +
      '<p>Refait les pots selon les PE actuelles et retire un nouveau calendrier de 84 matchs. <b>Efface tous les scores saisis et les décisions du tableau final.</b></p>' +
      '<button class="btn" id="ad-regen">Régénérer</button></div>' +
      '<div class="card ad-warn"><h3>🗑️ Réinitialiser le tournoi</h3>' +
      '<p>Remet tout à zéro : équipes par défaut, aucun score, tableau vide.</p>' +
      '<button class="btn danger" id="ad-reset">Tout réinitialiser</button></div>' +
      '<div class="card"><h3>🔐 Sécurité</h3>' +
      '<p>Le mot de passe se change en haut de <b>js/pages/admin.js</b> (variable <b>ADMIN_PW</b>). Il est visible dans le code source : c\'est un filtre, pas une vraie protection — celle-ci viendra avec Firebase.</p></div>' +
      "</div>";

    U.$("ad-regen").addEventListener("click", function () {
      if (!confirm("Régénérer le calendrier ?\nTous les scores et le tableau final seront effacés.")) return;
      var s = Store.get();
      Logic.assignPots(s.teams);
      s.matches = Logic.generateCalendar(s.teams);
      s.bracket.winners = {};
      Store.save(true); U.toast("Calendrier régénéré");
    });
    U.$("ad-reset").addEventListener("click", function () {
      if (!confirm("Tout réinitialiser ? Cette action est définitive.")) return;
      Store.reset();
      var s = Store.get();
      Logic.assignPots(s.teams);
      s.matches = Logic.generateCalendar(s.teams);
      Store.save(true); U.toast("Tournoi réinitialisé");
      renderSection();
    });
  }

  /* ---------- démarrage ---------- */
  C.navbar("admin.html");
  gate();
})();
