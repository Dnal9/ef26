/* EF26 — js/utils.js : petits helpers partagés */
(function () {
  "use strict";
  window.U = {
    $: function (id) { return document.getElementById(id); },
    esc: function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
      });
    },
    fmtDateTime: function (ts) {
      if (!ts) return "—";
      return new Date(ts).toLocaleString("fr-FR",
        { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    },
    toast: function (msg) {
      var el = document.getElementById("toast");
      if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
      el.textContent = msg; el.classList.add("show");
      clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
    }
  };
})();
