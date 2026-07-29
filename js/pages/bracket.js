/* ============================================================
   EF26 — js/pages/bracket.js : page Éliminatoires
   Bracket en colonnes + connecteurs SVG mesurés sur le DOM réel
   (donc toujours alignés, quel que soit l'écran).
   ============================================================ */
(function () {
  "use strict";

  C.navbar("eliminatoires.html");
  C.loader();
  Store.init();

  var st = Store.get();
  if (!st.matches.length) {
    Logic.assignPots(st.teams);
    st.matches = Logic.generateCalendar(st.teams);
    Store.save(true);
  }

  /* flux du tableau : source → cible (pour les connecteurs) */
  var FLOW = [
    ["BA", "QF4"], ["BB", "QF3"], ["BC", "QF2"], ["BD", "QF1"],
    ["QF1", "SF1"], ["QF2", "SF1"], ["QF3", "SF2"], ["QF4", "SF2"],
    ["SF1", "FIN"], ["SF2", "FIN"], ["FIN", "CHAMP"]
  ];

  function slotHTML(id, seed, winId, decided, byId) {
    if (id == null) {
      return '<div class="bk-slot empty"><span class="seed">' + (seed || "") +
        '</span><span class="ph">À déterminer</span></div>';
    }
    var cls = "bk-slot";
    if (decided) cls += (winId === id ? " win" : " lose");
    return '<div class="' + cls + '"><span class="seed">' + (seed || "") + "</span>" +
      C.teamBadge(byId[id], { size: "sm" }) +
      (decided && winId === id ? '<span class="wtag">Qualifié</span>' : "") + "</div>";
  }

  function tieHTML(key, pair, seeds, winners, byId) {
    var w = winners[key];
    var decided = w != null && (w === pair[0] || w === pair[1]);
    return '<div class="bk-tie' + (decided ? " decided" : "") + '" data-tid="' + key + '">' +
      slotHTML(pair[0], seeds[0], w, decided, byId) +
      slotHTML(pair[1], seeds[1], w, decided, byId) + "</div>";
  }

  var hadChampion = null;

  function render(s) {
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });
    var table = Logic.computeTable(s.teams, s.matches);
    var bk = Logic.bracket(table, s.bracket.winners);
    var W = s.bracket.winners;

    var col = function (title, sub, inner) {
      return '<div class="bk-col"><div class="bk-col-title">' + title +
        (sub ? " <b>" + sub + "</b>" : "") + "</div>" + inner + "</div>";
    };

    var champBadge = bk.champion != null
      ? C.teamBadge(byId[bk.champion], { size: "lg" })
      : "";
    var champHTML =
      '<div class="bk-col"><div class="bk-col-title">Sacre</div>' +
      '<div class="bk-champ' + (bk.champion == null ? " waiting" : "") + '" data-tid="CHAMP">' +
      '<div class="cup">🏆</div><div class="lab">Champion EF26</div>' +
      (bk.champion != null
        ? champBadge + '<div class="nm won">' + U.esc(byId[bk.champion].name) + "</div>"
        : '<div class="nm">—</div>') +
      "</div></div>";

    U.$("bk-grid").innerHTML =
      col("Barrages", "5ᵉ–12ᵉ",
        tieHTML("BA", bk.barrages.BA, ["5", "12"], W, byId) +
        tieHTML("BB", bk.barrages.BB, ["6", "11"], W, byId) +
        tieHTML("BC", bk.barrages.BC, ["7", "10"], W, byId) +
        tieHTML("BD", bk.barrages.BD, ["8", "9"], W, byId)) +
      col("Quarts", "de finale",
        tieHTML("QF1", bk.quarts.QF1, ["1", ""], W, byId) +
        tieHTML("QF2", bk.quarts.QF2, ["2", ""], W, byId) +
        tieHTML("QF3", bk.quarts.QF3, ["3", ""], W, byId) +
        tieHTML("QF4", bk.quarts.QF4, ["4", ""], W, byId)) +
      col("Demi-finales", "",
        tieHTML("SF1", bk.demis.SF1, ["", ""], W, byId) +
        tieHTML("SF2", bk.demis.SF2, ["", ""], W, byId)) +
      col("Finale", "",
        tieHTML("FIN", bk.finale.FIN, ["", ""], W, byId)) +
      champHTML;

    drawLinks(W, bk);

    /* confettis à l'apparition d'un champion */
    if (bk.champion != null && hadChampion !== bk.champion && hadChampion !== null) celebrate();
    if (hadChampion === null) hadChampion = bk.champion != null ? bk.champion : -1;
    else hadChampion = bk.champion != null ? bk.champion : -1;
  }

  /* ---------- connecteurs SVG mesurés ---------- */
  function drawLinks(winners, bk) {
    var grid = U.$("bk-grid"), svg = U.$("bk-svg");
    svg.setAttribute("width", grid.scrollWidth);
    svg.setAttribute("height", grid.scrollHeight);
    svg.setAttribute("viewBox", "0 0 " + grid.scrollWidth + " " + grid.scrollHeight);
    var g = svg.getBoundingClientRect(); // repère = le SVG lui-même (aligné pixel-perfect)
    var paths = "";
    FLOW.forEach(function (fl) {
      var a = grid.querySelector('[data-tid="' + fl[0] + '"]');
      var b = grid.querySelector('[data-tid="' + fl[1] + '"]');
      if (!a || !b) return;
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      var x1 = ra.right - g.left, y1 = ra.top + ra.height / 2 - g.top;
      var x2 = rb.left - g.left,  y2 = rb.top + rb.height / 2 - g.top;
      var mx = (x1 + x2) / 2;
      var won = winners[fl[0]] != null ||
                (fl[0] === "FIN" && bk.champion != null);
      paths += '<path class="bk-link' + (won ? " won" : "") + '" d="M' + x1 + " " + y1 +
        " C" + mx + " " + y1 + ", " + mx + " " + y2 + ", " + x2 + " " + y2 + '"/>';
    });
    svg.innerHTML = paths;
  }

  /* ---------- confettis ---------- */
  function celebrate() {
    var cv = U.$("bk-confetti"); if (!cv) return;
    var ctx = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight;
    var cols = ["#e8b23a", "#f7da86", "#39e0b9", "#edece3", "#31b07a"];
    var parts = [];
    for (var i = 0; i < 170; i++) parts.push({
      x: Math.random() * W, y: -20 - Math.random() * H * .4, r: 4 + Math.random() * 6,
      c: cols[i % cols.length], vy: 2.5 + Math.random() * 3.5, vx: -1.5 + Math.random() * 3,
      a: Math.random() * 6.28, va: -.2 + Math.random() * .4
    });
    var t0 = performance.now();
    (function frame(now) {
      var el = now - t0; ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); ctx.restore();
      });
      if (el < 3400) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  /* ---------- init ---------- */
  render(Store.get());
  Store.onChange(render);
  /* recalcul des connecteurs si la mise en page bouge */
  window.addEventListener("resize", function () { render(Store.get()); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { render(Store.get()); });
  }
})();
