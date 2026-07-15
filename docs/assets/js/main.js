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

  // Make a copied command paste-safe on every shell. The display keeps the
  // readable multi-line form with a trailing "\", but bash/zsh use "\" for line
  // continuation while PowerShell uses "`" and cmd uses "^", so a copied
  // multi-line block breaks on Windows. Joining the continuations into one line
  // produces a command that runs verbatim in bash, PowerShell, and cmd. We also
  // drop comment-only lines ("#" is not a comment in cmd or PowerShell either).
  // Quotes, "!", and every other character are preserved exactly; indentation
  // on non-continued lines (YAML, code) is left untouched.
  function normalizeCommand(text) {
    return text
      .replace(/[ \t]*\\[ \t]*\r?\n[ \t]*/g, " ") // join "\" line-continuations
      .split(/\r?\n/)
      .filter(function (line) { return !/^[ \t]*#/.test(line); }) // drop comment-only lines
      .join("\n")
      .replace(/\n{2,}/g, "\n") // collapse blank lines left by removed comments
      .replace(/^\n+/, "")
      .replace(/\n+$/, "");
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

  // shareable anchors on doc-page headings (kramdown already gives them ids)
  document.querySelectorAll(".prose h2[id], .prose h3[id]").forEach(function (h) {
    if (h.querySelector(".head-anchor")) return;
    var a = document.createElement("a");
    a.className = "head-anchor";
    a.href = "#" + h.id;
    a.setAttribute("aria-label", "Link to this section");
    a.textContent = "#";
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var url = location.origin + location.pathname + "#" + h.id;
      history.replaceState(null, "", "#" + h.id);
      // copy the full link, but flash a tooltip rather than swapping the "#" for
      // "Copied", which would reflow the heading
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function () {});
      }
      a.classList.add("is-copied");
      setTimeout(function () { a.classList.remove("is-copied"); }, 1600);
    });
    h.appendChild(a);
  });

  // show/hide the rest of the skill cards
  document.querySelectorAll("[data-toggle-skills]").forEach(function (btn) {
    var grid = document.querySelector(".skill-cards");
    var label = btn.querySelector(".skill-more-label");
    if (!grid || !label) return;
    var hidden = grid.querySelectorAll(".skill-card-extra").length;
    var shown = grid.querySelectorAll(".skill-card:not(.skill-card-extra):not(.skill-card-action)").length;
    label.textContent = "See all " + (hidden + shown) + " skills";
    btn.addEventListener("click", function () {
      var open = grid.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      label.textContent = open ? "Show fewer" : "See all " + (hidden + shown) + " skills";
    });
  });

  // modals (native <dialog>: Escape and focus handling come for free)
  document.querySelectorAll("[data-open-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dlg = document.getElementById(btn.getAttribute("data-open-modal"));
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    });
  });
  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () { dlg.close(); });
    });
    // click the backdrop (i.e. the dialog element itself, outside its content) to close
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
  });

  // inline copy (commands, code blocks)
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy-text");
      if (!text) {
        var target = document.querySelector(btn.getAttribute("data-copy"));
        text = target ? target.innerText : "";
      }
      copyText(normalizeCommand(text), btn);
    });
  });

  // add a copy button to every code block in the docs
  document.querySelectorAll(".prose pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "copy-btn code-copy";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML = '<span class="copy-label">Copy</span>';
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      copyText(normalizeCommand(code.innerText), btn);
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

  // ---- quickstart: Docker / Podman / containerd runtime tabs ----
  var runtimeGroups = document.querySelectorAll("[data-runtime-tabs]");
  function setRuntime(runtime) {
    runtimeGroups.forEach(function (group) {
      group.querySelectorAll(".runtime-tab").forEach(function (tab) {
        tab.classList.toggle("is-active", tab.getAttribute("data-runtime") === runtime);
      });
      group.querySelectorAll("[data-runtime-panel]").forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-runtime-panel") !== runtime;
      });
    });
    try { localStorage.setItem("runtime", runtime); } catch (e) {}
  }
  runtimeGroups.forEach(function (group) {
    group.querySelectorAll(".runtime-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setRuntime(tab.getAttribute("data-runtime"));
      });
    });
  });
  try {
    var savedRuntime = localStorage.getItem("runtime");
    if (savedRuntime) setRuntime(savedRuntime);
  } catch (e) {}

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
