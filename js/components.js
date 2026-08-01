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
    return { light: hsl2hex(hue, 58, 68), dark: hsl2hex(hue, 42, 26) };
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    var s = parts.length >= 2 ? parts[0][0] + parts[1][0] : String(name).slice(0, 2);
    return (s || "EF").toUpperCase();
  }

  /* ---------- logo : FLAT / minimal e-sport (carré arrondi + initiales) ---------- */
  function logoSVG(team, size) {
    size = size || 32;
    if (team.logo) {
      return '<img class="tb-logo" src="' + esc(team.logo) + '" width="' + size + '" height="' + size +
        '" alt="" style="object-fit:cover;border-radius:9px">';
    }
    var col = teamColors(team);
    var fs = Math.round(size * 0.42);
    var r = Math.round(size * 0.28);
    return '<svg class="tb-logo" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<rect x="0" y="0" width="40" height="40" rx="' + (r * 40 / size) + '" fill="' + col.dark + '"/>' +
      '<text x="20" y="21" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="Oswald,Arial,sans-serif" font-weight="700" font-size="' +
        Math.round(fs * 40 / size) + '" fill="' + col.light + '" letter-spacing="0.5">' +
        esc(initials(team.name)) + '</text></svg>';
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

  /* ---------- NAVIGATION : topbar + bottom nav (mobile) / sidebar (desktop) ---------- */
  var LINKS = [
    ["index.html",         "Accueil",     "\u{1F3E0}"],
    ["classement.html",    "Classement",  "\u{1F3C6}"],
    ["statistiques.html",  "Stats",       "\u{1F4CA}"],
    ["matchs.html",        "Calendrier",  "\u{1F4C5}"],
    ["eliminatoires.html", "Matchs",      "\u2694\uFE0F"],
    ["equipes.html",       "Équipes",     "\u{1F6E1}\uFE0F"]
  ];
  function navbar(active) {
    var current = LINKS.filter(function (l) { return l[0] === active; })[0];

    /* --- topbar (mobile) --- */
    var top = document.createElement("nav");
    top.className = "nav";
    top.innerHTML = '<div class="nav-in">' +
      '<a class="nav-logo" href="index.html"><span class="cup">\u{1F3C6}</span>EF<b>26</b></a>' +
      '<span class="nav-page">' + (current ? current[1] : "") + '</span></div>';
    document.body.prepend(top);

    /* --- bottom navigation (mobile) --- */
    var bot = document.createElement("nav");
    bot.className = "botnav";
    bot.setAttribute("aria-label", "Navigation principale");
    bot.innerHTML = LINKS.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[0] === active ? ' class="active" aria-current="page"' : "") + '>' +
        '<span class="ic">' + l[2] + '</span><span class="lb">' + l[1] + '</span></a>';
    }).join("");
    document.body.appendChild(bot);

    /* --- sidebar (desktop) --- */
    var side = document.createElement("aside");
    side.className = "sidebar";
    side.innerHTML =
      '<a class="sb-logo" href="index.html"><span class="cup">\u{1F3C6}</span>EF<b>26</b></a>' +
      LINKS.map(function (l) {
        return '<a href="' + l[0] + '"' + (l[0] === active ? ' class="active" aria-current="page"' : "") + '>' +
          '<span class="ic">' + l[2] + '</span>' + l[1] + '</a>';
      }).join("") +
      '<div class="sb-foot">Final Chapter · 28 équipes</div>';
    document.body.prepend(side);
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
