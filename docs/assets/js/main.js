// Small progressive-enhancement helpers: copy-to-clipboard and the local/cloud swap.
(function () {
  "use strict";

  // ---- copy to clipboard ----
  function flash(btn) {
    var label = btn.querySelector(".copy-label");
    var prev = label ? label.textContent : btn.textContent;
    if (label) { label.textContent = "Copied"; } else { btn.textContent = "Copied"; }
    btn.classList.add("is-copied");
    setTimeout(function () {
      if (label) { label.textContent = prev; } else { btn.textContent = prev; }
      btn.classList.remove("is-copied");
    }, 1600);
  }

  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy-text");
      if (!text) {
        var target = document.querySelector(btn.getAttribute("data-copy"));
        text = target ? target.innerText : "";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(btn); }, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); flash(btn); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  // ---- local / cloud connection-string swap ----
  var swap = document.querySelector("[data-swap]");
  if (swap) {
    var buttons = swap.querySelectorAll(".swap-btn");
    var targets = swap.querySelectorAll("[data-local]");
    function setEnv(env) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-env") === env;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      targets.forEach(function (t) {
        t.textContent = t.getAttribute("data-" + env);
      });
      swap.setAttribute("data-active", env);
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setEnv(b.getAttribute("data-env")); });
    });
    setEnv("local");
  }

  // ---- open off-page links in a new tab (in-page #anchors scroll in place) ----
  document.querySelectorAll("a[href]").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href && href.charAt(0) !== "#") {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
})();
