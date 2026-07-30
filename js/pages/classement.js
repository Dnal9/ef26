/* ============================================================
   EF26 — js/pages/classement.js : page Classement
   Tri par colonne, recherche, animation FLIP au changement.
   ============================================================ */
(function () {
  "use strict";

  C.navbar("classement.html");
  C.loader();
  Store.init();

  var st = Store.get();
  if (!st.matches.length) {
    Logic.assignPots(st.teams);
    st.matches = Logic.generateCalendar(st.teams);
    Store.save(true);
  }

  /* ---------- état local de la page ---------- */
  var sortCol = "rank";   // rank | name | j | g | n | p | bp | bc | diff | pts
  var sortDir = 1;        // 1 asc, -1 desc
  var query = "";

  var COLS = [
    { key: "rank", label: "#",       cls: "pos" },
    { key: "name", label: "Équipe",  cls: "team l" },
    { key: "j",    label: "J" },
    { key: "g",    label: "V" },
    { key: "n",    label: "N" },
    { key: "p",    label: "D" },
    { key: "bp",   label: "BP" },
    { key: "bc",   label: "BC" },
    { key: "diff", label: "Diff",    cls: "diff" },
    { key: "pts",  label: "Pts",     cls: "pts" },
    { key: "forme", label: "Forme",  noSort: true }
  ];
  var DESC_FIRST = { j:1, g:1, bp:1, diff:1, pts:1, n:1, p:1, bc:1 }; // colonnes chiffrées : desc d'abord

  /* ---------- construction du DOM (1 tr par équipe, réutilisé) ---------- */
  var rowMap = {};
  function buildRows() {
    var tb = U.$("cl-body"); tb.innerHTML = ""; rowMap = {};
    Store.get().teams.forEach(function (t) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="pos"></td><td class="team l"></td><td class="c-j"></td>' +
        '<td class="c-g"></td><td class="c-n"></td><td class="c-p"></td>' +
        '<td class="c-bp"></td><td class="c-bc"></td><td class="diff"></td>' +
        '<td class="pts"></td><td class="c-f"></td>';
      tb.appendChild(tr); rowMap[t.id] = tr;
    });
  }

  function buildHead() {
    U.$("cl-head").innerHTML = "<tr>" + COLS.map(function (c) {
      var sorted = c.key === sortCol;
      var arr = sorted ? '<span class="arr">' + (sortDir === 1 ? "▲" : "▼") + "</span>" : "";
      return '<th data-col="' + c.key + '" class="' + (c.cls || "") +
        (c.noSort ? " no-sort" : "") + (sorted ? " sorted" : "") + '">' + c.label + arr + "</th>";
    }).join("") + "</tr>";
  }

  /* ---------- rendu ---------- */
  function formeHTML(f) {
    return '<span class="forme">' + f.slice(-5).map(function (x) {
      return '<i class="f' + x + '">' + x + "</i>";
    }).join("") + "</span>";
  }

  function orderedRows(s) {
    var table = Logic.computeTable(s.teams, s.matches);
    var ranked = Logic.sortTable(table);
    var rankOf = {}, rowOf = {};
    ranked.forEach(function (r, i) { rankOf[r.id] = i; rowOf[r.id] = r; });
    var byId = {}; s.teams.forEach(function (t) { byId[t.id] = t; });

    var list = ranked.slice();
    if (sortCol !== "rank") {
      list.sort(function (a, b) {
        var va, vb;
        if (sortCol === "name") { va = byId[a.id].name.toLowerCase(); vb = byId[b.id].name.toLowerCase(); }
        else { va = a[sortCol]; vb = b[sortCol]; }
        if (va < vb) return -1 * sortDir;
        if (va > vb) return  1 * sortDir;
        return rankOf[a.id] - rankOf[b.id];
      });
    } else if (sortDir === -1) list.reverse();

    return { list: list, rankOf: rankOf, byId: byId };
  }

  var medals = ["🥇", "🥈", "🥉"];
  function render(s, animate) {
    var o = orderedRows(s);
    var tb = U.$("cl-body");

    /* FLIP : positions avant */
    var first = {};
    if (animate) o.list.forEach(function (r) {
      var el = rowMap[r.id]; if (el) first[r.id] = el.getBoundingClientRect().top;
    });

    var visible = 0;
    o.list.forEach(function (r) {
      var tr = rowMap[r.id]; if (!tr) return;
      var t = o.byId[r.id], rank = o.rankOf[r.id];
      var zone = Logic.zone(rank);
      tr.className = "zone-" + zone + (rank < 3 ? " p" + (rank + 1) : "");
      var med = rank < 3 ? '<span class="medal">' + medals[rank] + "</span>" : "";
      tr.children[0].innerHTML = (rank + 1) + med;
      tr.children[1].innerHTML = C.teamBadge(t);
      tr.children[2].textContent = r.j;
      tr.children[3].textContent = r.g;
      tr.children[4].textContent = r.n;
      tr.children[5].textContent = r.p;
      tr.children[6].textContent = r.bp;
      tr.children[7].textContent = r.bc;
      tr.children[8].textContent = (r.diff > 0 ? "+" : "") + r.diff;
      tr.children[8].className = "diff" + (r.diff > 0 ? " plus" : r.diff < 0 ? " minus" : "");
      tr.children[9].textContent = r.pts;
      tr.children[10].innerHTML = r.forme.length ? formeHTML(r.forme) : '<span style="color:var(--dim)">—</span>';

      var match = !query || t.name.toLowerCase().indexOf(query) !== -1;
      tr.style.display = match ? "" : "none";
      if (match) visible++;
      tb.appendChild(tr); // réordonne
    });

    U.$("cl-count").textContent = query ? visible + " / 28 équipes" : "28 équipes";

    /* FLIP : animer le déplacement */
    if (animate) o.list.forEach(function (r) {
      var el = rowMap[r.id]; if (!el || el.style.display === "none") return;
      var last = el.getBoundingClientRect().top;
      var dy = (first[r.id] != null ? first[r.id] : last) - last;
      if (Math.abs(dy) > 1) {
        el.style.transition = "none";
        el.style.transform = "translateY(" + dy + "px)";
        requestAnimationFrame(function () {
          el.style.transition = "transform .5s var(--ease)";
          el.style.transform = "";
        });
      }
    });
  }

  function renderPodium(s) {
    var table = Logic.computeTable(s.teams, s.matches);
    var sum = Logic.summary(s.teams, s.matches, table);
    var t3 = sum.top3;
    function pod(i) {
      if (!t3[i]) return "";
      return '<div class="pod p' + (i + 1) + '">' +
        '<div class="medal">' + medals[i] + "</div>" +
        C.teamBadge(t3[i].team, { size: i === 0 ? "lg" : "" }) +
        '<div class="pts">' + t3[i].row.pts + ' pts</div>' +
        '<div class="sub">' + t3[i].row.g + "V · " + t3[i].row.n + "N · " + t3[i].row.p + "D</div></div>";
    }
    U.$("cl-podium").innerHTML = pod(1) + pod(0) + pod(2);
  }

  /* ---------- interactions ---------- */
  U.$("cl-head").addEventListener("click", function (e) {
    var th = e.target.closest("th");
    if (!th || th.classList.contains("no-sort")) return;
    var col = th.dataset.col;
    if (col === sortCol) sortDir = -sortDir;
    else { sortCol = col; sortDir = DESC_FIRST[col] ? -1 : 1; }
    buildHead();
    render(Store.get(), true);
  });

  U.$("cl-q").addEventListener("input", function (e) {
    query = e.target.value.trim().toLowerCase();
    render(Store.get(), false);
  });

  /* ---------- init ---------- */
  buildHead();
  buildRows();
  render(Store.get(), false);
  renderPodium(Store.get());
  Store.onChange(function (s) { render(s, true); renderPodium(s); });
})();
