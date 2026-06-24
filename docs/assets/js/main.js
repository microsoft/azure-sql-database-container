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

  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn); }, function () {});
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); flash(btn); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  // inline copy (commands, code blocks)
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy-text");
      if (!text) {
        var target = document.querySelector(btn.getAttribute("data-copy"));
        text = target ? target.innerText : "";
      }
      copyText(text, btn);
    });
  });

  // engine pivot (Docker / Apple Containers), page-level and persisted
  (function () {
    var btns = document.querySelectorAll(".pivot-btn");
    if (!btns.length) return;
    function setEngine(engine) {
      document.querySelectorAll(".pivot-btn").forEach(function (b) {
        var on = b.getAttribute("data-engine") === engine;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".engine-block").forEach(function (el) {
        el.hidden = el.getAttribute("data-engine") !== engine;
      });
      try { localStorage.setItem("asdb-engine", engine); } catch (e) {}
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { setEngine(b.getAttribute("data-engine")); });
    });
    var saved = "docker";
    try { saved = localStorage.getItem("asdb-engine") || "docker"; } catch (e) {}
    setEngine(saved);
  })();

  // add a copy button to every code block in the docs
  document.querySelectorAll(".prose pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "copy-btn code-copy";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML = '<span class="copy-label">Copy</span>';
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      copyText(code.innerText, btn);
    });
    pre.appendChild(btn);
  });

  // copy a full prompt fetched from a hosted markdown file
  document.querySelectorAll("[data-prompt]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-prompt");
      fetch(url).then(function (r) { return r.text(); }).then(function (text) {
        copyText(text, btn);
      }).catch(function () {});
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

  // ---- open off-page links in a new tab (header nav and in-page #anchors stay in place) ----
  document.querySelectorAll("a[href]").forEach(function (a) {
    var href = a.getAttribute("href");
    var inNav = a.closest && a.closest(".nav");
    if (href && href.charAt(0) !== "#" && !inNav) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
})();
