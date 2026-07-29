/* ============================================================
   EF26 — js/components.js : rendus réutilisables (HTML strings)
   ============================================================ */
(function () {
  "use strict";
  var esc = U.esc;

  /* ---------- couleur unique par équipe (générée depuis le nom, stable) ---------- */
  function hashStr(s) {
    var h = 0; s = String(s);
    for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) {
      var c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(255 * c).toString(16).padStart(2, "0");
    };
    return "#" + f(0) + f(8) + f(4);
  }
  /* deux tons (clair → foncé) pour le dégradé du blason */
  function teamColors(team) {
    var seed = hashStr(team.name || ("e" + team.id));
    var hue = seed % 360;                    // teinte stable par nom
    return { light: hsl2hex(hue, 62, 56), dark: hsl2hex(hue, 66, 30) };
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    var s = parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name).slice(0, 2);
    return (s || "EF").toUpperCase();
  }

  /* ---------- logo : ÉCUSSON arrondi (dégradé + liseré or + brillance + étoile) ---------- */
  function logoSVG(team, size) {
    size = size || 28;
    if (team.logo) {
      return '<img class="tb-logo" src="' + esc(team.logo) + '" width="' + size + '" height="' + size +
        '" alt="" style="object-fit:cover">';
    }
    var col = teamColors(team);
    var uid = "b" + team.id;
    var fs = Math.round(size * 0.40);
    var h = Math.round(size * 1.3); // écusson : plus haut que large
    var crest = "M20 2 C33 2 38 9 38 21 C38 37 29 46 20 50 C11 46 2 37 2 21 C2 9 7 2 20 2 Z";
    return '<svg class="tb-logo" width="' + size + '" height="' + h + '" viewBox="0 0 40 52" aria-hidden="true">' +
      "<defs>" +
        '<linearGradient id="g' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + col.light + '"/><stop offset="1" stop-color="' + col.dark + '"/></linearGradient>' +
        '<linearGradient id="s' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      "</defs>" +
      '<path d="' + crest + '" fill="url(#g' + uid + ')" stroke="#f7da86" stroke-width="2"/>' +
      '<path d="' + crest + '" fill="url(#s' + uid + ')"/>' +
      '<text x="20" y="23" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="Oswald,Arial,sans-serif" font-weight="700" font-size="' + fs + '" fill="#fff" ' +
        'style="paint-order:stroke" stroke="rgba(0,0,0,.25)" stroke-width="0.6">' + esc(initials(team.name)) + "</text>" +
      '<text x="20" y="42" text-anchor="middle" font-size="8" fill="#f7da86">★</text>' +
      "</svg>";
  }

  /* tag court d'équipe (3 lettres) pour le style "club" */
  function teamTag(team) {
    var parts = String(team.name).trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return (parts[0][0] + parts[1][0] + parts[2][0]);
    if (parts.length === 2) return (parts[0].slice(0, 2) + parts[1][0]);
    return parts[0] ? parts[0].slice(0, 3) : "EF2";
  }

  /* ---------- TeamBadge : écusson + nom soigné ---------- */
  function teamBadge(team, opts) {
    opts = opts || {};
    var size = opts.size === "lg" ? 40 : opts.size === "sm" ? 26 : 32;
    var cls = "tb" + (opts.size ? " " + opts.size : "");
    var name = '<span class="tb-name">' + esc(team.name) + "</span>";
    var sub = opts.sub ? '<span class="tb-sub">' + esc(opts.sub) + "</span>" : "";
    var inner = logoSVG(team, size) +
      (sub ? '<span class="tb-text">' + name + sub + "</span>" : name);
    return opts.link !== false
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
    logoSVG: logoSVG, teamBadge: teamBadge, teamTag: teamTag, teamColors: teamColors,
    matchCard: matchCard, statCard: statCard, navbar: navbar, loader: loader
  };
})();
