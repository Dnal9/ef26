/* ============================================================
   EF26 — js/logic.js : calculs purs, aucun accès au DOM/stockage.
   Entrées → sorties. Testable ligne par ligne.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- pots : 5 pots de 4 selon la PE ---------- */
  function assignPots(teams) {
    var byPe = teams.slice().sort(function (a, b) { return b.pe - a.pe || a.id - b.id; });
    byPe.forEach(function (t, i) { t.pot = Math.floor(i / 4) + 1; });
    return teams;
  }

  /* ---------- calendrier : 1 adversaire par pot, 5 journées ----------
     50 matchs : 10 intra-pots (2 par pot) + 40 inter-pots (4 par paire).
     Construction "méthode du cercle" sur les 5 pots — correcte par
     construction : à la journée r, le pot r joue en interne (2 matchs)
     et les pots i,j avec i+j ≡ 2r (mod 5) s'affrontent (couplage 4v4).
     Chaque équipe joue donc exactement 1 fois par journée et rencontre
     exactement 1 adversaire de chaque pot (le sien inclus).           */
  function generateCalendar(teams) {
    var pots = [[], [], [], [], []];
    teams.forEach(function (t) { pots[t.pot - 1].push(t.id); });

    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }

    var rounds = [[], [], [], [], []];
    for (var r = 0; r < 5; r++) {
      // intra-pot : le pot r se joue en interne (2 matchs)
      var s = shuffle(pots[r]);
      rounds[r].push([s[0], s[1]], [s[2], s[3]]);
      // inter-pots : paires {i,j}, i<j, i+j ≡ 2r (mod 5)
      for (var i = 0; i < 5; i++) {
        for (var j = i + 1; j < 5; j++) {
          if ((i + j) % 5 === (2 * r) % 5) {
            var A = pots[i], B = shuffle(pots[j]); // permutation aléatoire = tirage
            for (var k = 0; k < 4; k++) rounds[r].push([A[k], B[k]]);
          }
        }
      }
    }

    var matches = [], id = 0;
    rounds.forEach(function (list, rr) {
      shuffle(list).forEach(function (pr) {
        var home = Math.random() < 0.5 ? pr[0] : pr[1];
        var away = home === pr[0] ? pr[1] : pr[0];
        matches.push({
          id: id++, journee: rr + 1, homeId: home, awayId: away,
          scoreHome: null, scoreAway: null, status: "a_venir"
        });
      });
    });
    return matches;
  }

  /* ---------- classement ---------- */
  function computeTable(teams, matches) {
    var rows = {};
    teams.forEach(function (t) {
      rows[t.id] = { id: t.id, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, forme: [] };
    });
    matches.forEach(function (m) {
      if (m.status !== "termine") return;
      var h = rows[m.homeId], a = rows[m.awayId];
      if (!h || !a) return;
      h.j++; a.j++;
      h.bp += m.scoreHome; h.bc += m.scoreAway;
      a.bp += m.scoreAway; a.bc += m.scoreHome;
      if (m.scoreHome > m.scoreAway)      { h.g++; a.p++; h.forme.push("G"); a.forme.push("P"); }
      else if (m.scoreHome < m.scoreAway) { a.g++; h.p++; a.forme.push("G"); h.forme.push("P"); }
      else                                { h.n++; a.n++; h.forme.push("N"); a.forme.push("N"); }
    });
    return Object.keys(rows).map(function (k) {
      var r = rows[k];
      r.pts = r.g * 3 + r.n; r.diff = r.bp - r.bc;
      return r;
    });
  }

  function sortTable(rows) {
    return rows.slice().sort(function (a, b) {
      return b.pts - a.pts || b.diff - a.diff || b.bp - a.bp || a.id - b.id;
    });
  }
  function zone(pos) { return pos < 4 ? "q" : (pos < 12 ? "b" : "o"); }

  /* ---------- stats globales ---------- */
  function summary(teams, matches, table) {
    var sorted = sortTable(table);
    var byId = {}; teams.forEach(function (t) { byId[t.id] = t; });
    var top = function (arr, cmp) { return arr.slice().sort(cmp)[0]; };
    var done = matches.filter(function (m) { return m.status === "termine"; });
    var goals = done.reduce(function (n, m) { return n + m.scoreHome + m.scoreAway; }, 0);
    return {
      leader:   { team: byId[sorted[0].id], row: sorted[0] },
      top3:     sorted.slice(0, 3).map(function (r) { return { team: byId[r.id], row: r }; }),
      attack:   (function () { var r = top(table, function (a, b) { return b.bp - a.bp; }); return { team: byId[r.id], row: r }; })(),
      defense:  (function () { var r = top(table, function (a, b) { return a.bc - b.bc || b.pts - a.pts; }); return { team: byId[r.id], row: r }; })(),
      mostWins: (function () { var r = top(table, function (a, b) { return b.g - a.g; }); return { team: byId[r.id], row: r }; })(),
      mostLoss: (function () { var r = top(table, function (a, b) { return b.p - a.p; }); return { team: byId[r.id], row: r }; })(),
      goals: goals,
      played: done.length,
      totalMatches: matches.length,
      avgDiff: done.length ? (goals / done.length).toFixed(1) : "0"
    };
  }

  /* ---------- matchs utiles ---------- */
  function nextMatch(matches) {
    var up = matches.filter(function (m) { return m.status === "a_venir"; });
    return up.length ? up.sort(function (a, b) { return a.journee - b.journee || a.id - b.id; })[0] : null;
  }
  function lastResult(matches) {
    var d = matches.filter(function (m) { return m.status === "termine"; });
    return d.length ? d[d.length - 1] : null;
  }
  function teamMatches(matches, teamId) {
    return matches.filter(function (m) { return m.homeId === teamId || m.awayId === teamId; });
  }

  /* ---------- tableau final : têtes de série + progression ---------- */
  function bracket(table, winners) {
    var s = sortTable(table);
    var id = function (i) { return s[i] ? s[i].id : null; };
    function w(key, a, b) {
      var v = winners[key];
      return (v == null || (v !== a && v !== b)) ? null : v;
    }
    var BA = [id(4), id(11)], BB = [id(5), id(10)], BC = [id(6), id(9)], BD = [id(7), id(8)];
    var wA = w("BA", BA[0], BA[1]), wB = w("BB", BB[0], BB[1]),
        wC = w("BC", BC[0], BC[1]), wD = w("BD", BD[0], BD[1]);
    var Q1 = [id(0), wD], Q2 = [id(1), wC], Q3 = [id(2), wB], Q4 = [id(3), wA];
    var w1 = w("QF1", Q1[0], Q1[1]), w2 = w("QF2", Q2[0], Q2[1]),
        w3 = w("QF3", Q3[0], Q3[1]), w4 = w("QF4", Q4[0], Q4[1]);
    var S1 = [w1, w2], S2 = [w3, w4];
    var s1 = w("SF1", S1[0], S1[1]), s2 = w("SF2", S2[0], S2[1]);
    var F = [s1, s2];
    return {
      barrages: { BA: BA, BB: BB, BC: BC, BD: BD },
      quarts:   { QF1: Q1, QF2: Q2, QF3: Q3, QF4: Q4 },
      demis:    { SF1: S1, SF2: S2 },
      finale:   { FIN: F },
      champion: w("FIN", F[0], F[1])
    };
  }

  window.Logic = {
    assignPots: assignPots, generateCalendar: generateCalendar,
    computeTable: computeTable, sortTable: sortTable, zone: zone,
    summary: summary, nextMatch: nextMatch, lastResult: lastResult,
    teamMatches: teamMatches, bracket: bracket
  };
})();
