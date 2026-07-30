/* ============================================================
   EF26 — js/logic.js : calculs purs, aucun accès au DOM/stockage.
   Entrées → sorties. Testable ligne par ligne.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- pots : 7 pots de 4 selon la PE (28 équipes) ---------- */
  function assignPots(teams) {
    var byPe = teams.slice().sort(function (a, b) { return b.pe - a.pe || a.id - b.id; });
    byPe.forEach(function (t, i) { t.pot = Math.floor(i / 4) + 1; });
    return teams;
  }

  /* ---------- calendrier : 1 adversaire de chaque AUTRE pot ----------
     28 équipes, 7 pots de 4. Chaque équipe joue 6 matchs (un contre un
     adversaire de chacun des 6 autres pots), répartis sur 7 journées :
     à la journée r, le pot r se repose, et les 6 autres pots se couplent
     via la méthode du cercle (paires {i,j} avec i+j ≡ 2r mod 7).
     → 12 matchs par journée · 84 au total · chaque équipe se repose 1 fois
     et rencontre exactement 1 adversaire de chaque autre pot.          */
  function generateCalendar(teams) {
    var NP = 7;
    var pots = []; for (var p = 0; p < NP; p++) pots.push([]);
    teams.forEach(function (t) { if (pots[t.pot - 1]) pots[t.pot - 1].push(t.id); });

    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }

    var rounds = [];
    for (var r = 0; r < NP; r++) {
      var round = [];
      for (var i = 0; i < NP; i++) {
        for (var j = i + 1; j < NP; j++) {
          if (i === r || j === r) continue;            // le pot r se repose
          if ((i + j) % NP === (2 * r) % NP) {          // couplage méthode du cercle
            var A = pots[i], B = shuffle(pots[j]);       // tirage aléatoire des oppositions
            for (var k = 0; k < 4; k++) round.push([A[k], B[k]]);
          }
        }
      }
      rounds.push(round);
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

  /* ---------- probabilités de qualification (Monte-Carlo) ----------
     Rejoue N fois les matchs restants, pondérés par la force des équipes
     (PE + points déjà pris), et compte la fréquence d'arrivée en
     top 4 (quarts directs) et top 12 (quarts + barrages).
     Résultat : estimation, pas une certitude.                         */
  function qualificationOdds(teams, matches, opts) {
    opts = opts || {};
    var N = opts.runs || 3000;
    var byId = {}; teams.forEach(function (t) { byId[t.id] = t; });

    var baseTable = computeTable(teams, matches);
    var ptsById = {}; baseTable.forEach(function (r) { ptsById[r.id] = r.pts; });
    var pes = teams.map(function (t) { return t.pe || 3000; });
    var peMin = Math.min.apply(null, pes), peMax = Math.max.apply(null, pes);
    var peSpan = (peMax - peMin) || 1;
    function strength(id) {
      var t = byId[id];
      var peN = ((t.pe || 3000) - peMin) / peSpan;
      return 0.6 + peN * 1.1 + (ptsById[id] || 0) * 0.04;
    }

    var rest = matches.filter(function (m) { return m.status !== "termine"; });

    var start = {};
    baseTable.forEach(function (r) { start[r.id] = { pts: r.pts, diff: r.diff, bp: r.bp }; });

    var top4 = {}, top12 = {};
    teams.forEach(function (t) { top4[t.id] = 0; top12[t.id] = 0; });

    for (var n = 0; n < N; n++) {
      var acc = {};
      teams.forEach(function (t) { acc[t.id] = { id: t.id, pts: start[t.id].pts, diff: start[t.id].diff, bp: start[t.id].bp }; });

      for (var i = 0; i < rest.length; i++) {
        var m = rest[i], sh = strength(m.homeId), sa = strength(m.awayId);
        var pHome = sh / (sh + sa), pDraw = 0.26;
        var rr = Math.random(), h = acc[m.homeId], a = acc[m.awayId];
        if (rr < pHome * (1 - pDraw)) { h.pts += 3; h.diff += 1; h.bp += 1; }
        else if (rr < pHome * (1 - pDraw) + pDraw) { h.pts += 1; a.pts += 1; }
        else { a.pts += 3; a.diff += 1; a.bp += 1; }
      }

      var arr = teams.map(function (t) { return acc[t.id]; });
      arr.sort(function (x, y) { return y.pts - x.pts || y.diff - x.diff || y.bp - x.bp || x.id - y.id; });
      for (var k = 0; k < arr.length; k++) {
        if (k < 4) top4[arr[k].id]++;
        if (k < 12) top12[arr[k].id]++;
      }
    }

    var out = {};
    teams.forEach(function (t) {
      out[t.id] = {
        direct: Math.round(top4[t.id] / N * 100),
        qualif: Math.round(top12[t.id] / N * 100),
        runs: N
      };
    });
    return out;
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
    teamMatches: teamMatches, bracket: bracket, qualificationOdds: qualificationOdds
  };
})();
