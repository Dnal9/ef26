/* ============================================================
   EF26 — js/components.js : rendus réutilisables (HTML strings)
   ============================================================ */
(function () {
  "use strict";
  var esc = U.esc;

  /* ---------- palette des monogrammes (1 couleur stable par équipe) ---------- */
  var COLORS = [
    "#e8b23a", "#39e0b9", "#5aa7e8", "#e86a5a", "#a06ae8",
    "#6ae87f", "#e85aa7", "#e8d75a", "#5ae8d7", "#e8935a",
    "#7f8ce8", "#b0e85a", "#e85a5a", "#5ae88f", "#d75ae8",
    "#e8b95a", "#5ac8e8", "#9fe85a", "#e87f5a", "#8f5ae8"
  ];
  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    var s = parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name).slice(0, 2);
    return s.toUpperCase();
  }

  /* ---------- logo : monogramme SVG (ou image si team.logo fourni) ---------- */
  function logoSVG(team, size) {
    size = size || 28;
    if (team.logo) {
      return '<img class="tb-logo" src="' + esc(team.logo) + '" width="' + size + '" height="' + size +
        '" alt="" style="border-radius:50%;object-fit:cover">';
    }
    var c = COLORS[team.id % COLORS.length];
    var fs = Math.round(size * 0.40);
    return '<svg class="tb-logo" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="19" fill="#0c1a12" stroke="' + c + '" stroke-width="2.5"/>' +
      '<circle cx="20" cy="20" r="13.5" fill="none" stroke="' + c + '" stroke-width="1" opacity=".35"/>' +
      '<text x="20" y="21.5" text-anchor="middle" dominant-baseline="central" ' +
      'font-family="Oswald,Arial,sans-serif" font-weight="700" font-size="' + fs + '" fill="' + c + '">' +
      esc(initials(team.name)) + "</text></svg>";
  }

  /* ---------- TeamBadge : logo + nom ---------- */
  function teamBadge(team, opts) {
    opts = opts || {};
    var size = opts.size === "lg" ? 34 : opts.size === "sm" ? 22 : 28;
    var cls = "tb" + (opts.size ? " " + opts.size : "");
    var link = opts.link !== false;
    var inner = logoSVG(team, size) + '<span class="tb-name">' + esc(team.name) + "</span>";
    return link
      ? '<a class="' + cls + '" href="equipes.html#t' + team.id + '">' + inner + "</a>"
      : '<span class="' + cls + '">' + inner + "</span>";
  }

  /* ---------- MatchCard (façon Flashscore) ---------- */
  function matchCard(m, teamsById, opts) {
    opts = opts || {};
    var h = teamsById[m.homeId], a = teamsById[m.awayId];
    if (!h || !a) return "";
    var mid;
    if (m.status === "termine") {
      var hw = m.scoreHome > m.scoreAway, aw = m.scoreAway > m.scoreHome;
      mid = '<div class="mc-score">' +
        '<span class="' + (hw ? "win" : "") + '">' + m.scoreHome + "</span>" +
        '<span style="color:var(--muted)"> – </span>' +
        '<span class="' + (aw ? "win" : "") + '">' + m.scoreAway + "</span></div>" +
        '<span class="mc-tag done">Terminé</span>';
    } else {
      mid = '<div class="mc-time">J' + m.journee + "</div>" +
        '<span class="mc-tag next">À venir</span>';
    }
    return '<div class="mc" data-mid="' + m.id + '">' +
      '<div class="mc-home">' + teamBadge(h, { size: opts.small ? "sm" : "", link: opts.link }) + "</div>" +
      '<div class="mc-mid">' + mid + "</div>" +
      '<div class="mc-away">' + teamBadge(a, { size: opts.small ? "sm" : "", link: opts.link }) + "</div></div>";
  }

  /* ---------- StatCard ---------- */
  function statCard(o) { // {cls, ico, lab, val, sub, gold}
    return '<div class="stat ' + (o.cls || "") + '"><div class="ico">' + (o.ico || "") + "</div>" +
      '<div class="lab">' + esc(o.lab) + "</div>" +
      '<div class="val' + (o.gold ? " gold" : "") + '">' + o.val + "</div>" +
      '<div class="sub">' + (o.sub || "") + "</div></div>";
  }

  /* ---------- NAVBAR ---------- */
  var LINKS = [
    ["index.html", "Accueil"],
    ["classement.html", "Classement"],
    ["matchs.html", "Matchs"],
    ["eliminatoires.html", "Éliminatoires"],
    ["statistiques.html", "Stats"],
    ["equipes.html", "Équipes"]
  ];
  function navbar(active) {
    var links = LINKS.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[0] === active ? ' class="active"' : "") + ">" + l[1] + "</a>";
    }).join("");
    var el = document.createElement("nav");
    el.className = "nav";
    el.innerHTML = '<div class="nav-in">' +
      '<a class="nav-logo" href="index.html">' +
      '<svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs><linearGradient id="nlg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f7da86"/><stop offset="1" stop-color="#b8862a"/></linearGradient></defs>' +
      '<path d="M50 5 L88 22 V54 C88 76 71 90 50 96 C29 90 12 76 12 54 V22 Z" fill="#0c1a12" stroke="url(#nlg)" stroke-width="5"/>' +
      '<text x="50" y="44" text-anchor="middle" font-family="Oswald,Arial,sans-serif" font-weight="700" font-size="30" fill="#edece3">EF</text>' +
      '<text x="50" y="78" text-anchor="middle" font-family="Oswald,Arial,sans-serif" font-weight="700" font-size="33" fill="url(#nlg)">26</text>' +
      "</svg>EF26 <b>·&nbsp;Final Chapter</b></a>" +
      '<button class="nav-burger" aria-label="Menu">☰</button>' +
      '<div class="nav-links">' + links + "</div></div>";
    document.body.prepend(el);
    var burger = el.querySelector(".nav-burger"), menu = el.querySelector(".nav-links");
    burger.addEventListener("click", function () { menu.classList.toggle("open"); });
    menu.addEventListener("click", function () { menu.classList.remove("open"); });
  }

  /* ---------- LOADER ---------- */
  function loader(hideDelay) {
    var el = document.createElement("div");
    el.id = "loader";
    el.innerHTML = '<div class="spinner"></div><div class="lt">EF26 · Final Chapter</div>';
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add("hide"); }, hideDelay || 450);
  }

  window.C = {
    logoSVG: logoSVG, teamBadge: teamBadge, matchCard: matchCard,
    statCard: statCard, navbar: navbar, loader: loader
  };
})();
