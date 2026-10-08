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
      return navigator.clipboard.writeText(text).then(function () {
        flash(btn);
        return true;
      }, function () {
        return false;
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      var copied = false;
      try {
        copied = document.execCommand("copy");
        if (copied) flash(btn);
      } catch (e) {}
      document.body.removeChild(ta);
      return Promise.resolve(copied);
    }
  }

  // ---- analytics ----
  function currentView() {
    return document.body.getAttribute("data-view") || "unknown";
  }

  function browserFamily() {
    var ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) return "edge";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Safari\//.test(ua)) return "safari";
    return "other";
  }

  function osFamily() {
    var ua = navigator.userAgent || "";
    if (/Windows/.test(ua)) return "windows";
    if (/Android/.test(ua)) return "android";
    if (/iPhone|iPad|iPod/.test(ua)) return "ios";
    if (/Mac OS/.test(ua)) return "macos";
    if (/Linux/.test(ua)) return "linux";
    return "other";
  }

  function deviceClass() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/.test(ua)) return "tablet";
    if (/Mobile|Android|iPhone|iPod/.test(ua)) return "mobile";
    return "desktop";
  }

  function localeGroup() {
    var language = (navigator.language || "other").slice(0, 2).toLowerCase();
    return ["de", "en", "fr", "ja"].indexOf(language) >= 0 ? language : "other";
  }

  function referrerCategory() {
    if (!document.referrer) return "direct";
    try {
      var hostname = new URL(document.referrer).hostname.toLowerCase();
      if (hostname === "github.com" || /\.github\.com$/.test(hostname)) return "github";
      if (
        /\.microsoft\.com$/.test(hostname) ||
        hostname === "microsoft.github.io" ||
        /\.microsoft\.github\.io$/.test(hostname)
      ) return "microsoft";
      if (/google\.|bing\.com$|duckduckgo\.com$/.test(hostname)) return "search";
    } catch (error) {
      console.warn("[telemetry] could not classify referrer", error);
    }
    return "other";
  }

  function isLandingPage() {
    if (!document.referrer) return true;
    try {
      return new URL(document.referrer).origin !== location.origin;
    } catch (error) {
      return true;
    }
  }

  function browserContext() {
    return {
      browserFamily: browserFamily(),
      deviceClass: deviceClass(),
      localeGroup: localeGroup(),
      osFamily: osFamily(),
      pagePath: location.pathname,
      referrerCategory: referrerCategory(),
      timeZoneOffsetMinutes: String(new Date().getTimezoneOffset()),
      view: currentView()
    };
  }

  function track(name, props) {
    var properties = Object.assign(browserContext(), props || {});
    var measurements = { count: 1 };
    try { console.log("[telemetry]", name, properties); } catch (e) {}
    try {
      if (window.appInsights && typeof window.appInsights.trackEvent === "function") {
        window.appInsights.trackEvent({ name: name }, properties, measurements);
      }
    } catch (error) {
      console.warn("[telemetry] App Insights event failed", error);
    }
    try {
      if (
        window.mssqlAgentSkillsTelemetry &&
        typeof window.mssqlAgentSkillsTelemetry.track === "function"
      ) {
        window.mssqlAgentSkillsTelemetry.track(name, properties, measurements);
      }
    } catch (error) {
      console.warn("[telemetry] 1DS event failed", error);
    }
  }

  function actionLocation(element) {
    if (element.closest(".hero")) return "hero";
    if (element.closest(".skill-card")) return "skill-card";
    if (element.closest(".prose")) return "prose";
    if (element.closest(".nav")) return "nav";
    if (element.closest(".footer")) return "footer";
    return "other";
  }

  function scenarioFromUrl(value) {
    try {
      var pathname = new URL(value, location.href).pathname;
      return pathname.split("/").pop().replace(/\.(md|html)$/, "");
    } catch (error) {
      return "unknown";
    }
  }

  function destinationType(link) {
    var href = link.getAttribute("href") || "";
    if (/^mailto:/i.test(href)) return "feedback";
    try {
      var url = new URL(link.href, location.href);
      if (/youtube\.com$|youtu\.be$/.test(url.hostname)) return "youtube";
      if (url.hostname === "github.com") return "github";
      if (url.hostname === "skills.sh") return "skills-sh";
      if (/learn\.microsoft\.com$/.test(url.hostname)) return "docs";
      if (/signup|preview-signup/.test(url.href)) return "signup";
    } catch (error) {}
    return "other";
  }

  function destinationId(link) {
    try {
      var url = new URL(link.href, location.href);
      if (url.hostname === "github.com") return "github";
      if (url.hostname === "skills.sh") return "skills-sh";
      if (/learn\.microsoft\.com$/.test(url.hostname)) return "microsoft-learn";
      if (/youtube\.com$|youtu\.be$/.test(url.hostname)) return "youtube";
      if (/signup|preview-signup/.test(url.href)) return "container-preview";
      return url.hostname.replace(/^www\./, "") || "other";
    } catch (error) {
      return "other";
    }
  }

  function harnessId(element) {
    var headings = Array.prototype.slice.call(
      document.querySelectorAll(".prose h2[id], .prose h3[id]")
    );
    var section = "";
    headings.forEach(function (heading) {
      if (heading.compareDocumentPosition(element) & 4) section = heading.id;
    });
    return {
      "claude-code": "claude",
      "codex": "codex",
      "cursor": "cursor",
      "vs-code-with-github-copilot": "vscode-copilot"
    }[section];
  }

  function commandDetails(text, index, element) {
    var skill = /--skill\s+([A-Za-z0-9._-]+)/.exec(text || "");
    if (skill) {
      return { contentId: skill[1], contentType: "skill-install" };
    }
    if (/npx skills add|plugin marketplace add|plugin (?:install|add)/.test(text || "")) {
      var harness = harnessId(element);
      return {
        contentId: "azure-sql-database-container",
        contentType: harness ? "harness-install" : "collection-install",
        ...(harness ? { harnessId: harness } : {})
      };
    }
    return { contentId: currentView() + "-command-" + (index + 1), contentType: "command" };
  }

  track("site/action", { action: "pageView", isLanding: isLandingPage() });

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
  document.querySelectorAll("[data-copy], [data-copy-text]").forEach(function (btn, index) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy-text");
      if (!text) {
        var target = document.querySelector(btn.getAttribute("data-copy"));
        text = target ? target.innerText : "";
      }
      copyText(normalizeCommand(text), btn).then(function (copied) {
        if (!copied) return;
        track("site/action", Object.assign({
          action: "contentCopied",
          actionLocation: actionLocation(btn)
        }, commandDetails(text, index, btn)));
      });
    });
  });

  // add a copy button to every code block in the docs
  document.querySelectorAll(".prose pre").forEach(function (pre, index) {
    var btn = document.createElement("button");
    btn.className = "copy-btn code-copy";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML = '<span class="copy-label">Copy</span>';
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code") || pre;
      var text = normalizeCommand(code.innerText);
      copyText(text, btn).then(function (copied) {
        if (!copied) return;
        var details = commandDetails(text, index, pre);
        if (details.contentType === "command") details.contentType = "code";
        track("site/action", Object.assign({
          action: "contentCopied",
          actionLocation: "prose"
        }, details));
      });
    });
    pre.appendChild(btn);
  });

  // copy a full prompt fetched from a hosted markdown file
  document.querySelectorAll("[data-prompt]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-prompt");
      var scenario = scenarioFromUrl(url);
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("prompt fetch failed");
        return r.text();
      }).then(function (text) {
        return copyText(text, btn);
      }).then(function (copied) {
        if (!copied) return;
        track("site/action", {
          action: "copyPrompt",
          actionLocation: "skill-card",
          scenario: scenario
        });
      }).catch(function () {});
    });
  });

  document.querySelectorAll(".card-view").forEach(function (link) {
    link.addEventListener("click", function () {
      track("site/action", {
        action: "viewPrompt",
        actionLocation: "skill-card",
        scenario: scenarioFromUrl(link.href)
      });
    });
  });

  document.querySelectorAll(".skill-card").forEach(function (link) {
    link.addEventListener("click", function () {
      var contentId = link.querySelector(".skill-tag");
      track("site/action", {
        action: "contentOpened",
        actionLocation: "skill-card",
        contentId: contentId ? contentId.textContent.trim() : "skills",
        contentType: "skill"
      });
    });
  });

  document.querySelectorAll("a.demo-link").forEach(function (link) {
    link.addEventListener("click", function () {
      track("site/action", {
        action: "mediaEngaged",
        contentId: "container-demo",
        mediaAction: "start"
      });
    });
  });

  // ---- quickstart: Docker / Podman / containerd / WSL container runtime tabs ----
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
        var runtime = tab.getAttribute("data-runtime");
        setRuntime(runtime);
        track("site/action", {
          action: "runtimeSelected",
          runtimeId: runtime === "wslc" ? "wsl" : runtime
        });
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
      b.addEventListener("click", function () {
        var environment = b.getAttribute("data-env");
        setEnv(environment);
        track("site/action", { action: "pathSelected", pathId: environment });
      });
    });
    setEnv("local");
  }

  // ---- open off-page links in a new tab (header nav and in-page #anchors stay in place) ----
  document.querySelectorAll("a[href]").forEach(function (a) {
    var href = a.getAttribute("href");
    var inNav = a.closest && a.closest(".nav");
    if (href && href.charAt(0) !== "#") {
      if (!inNav) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
      if (
        a.classList.contains("card-view") ||
        a.classList.contains("skill-card") ||
        a.classList.contains("demo-link")
      ) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (e) {}
      if (!url || url.origin === location.origin) return;
      a.addEventListener("click", function () {
        track("site/action", {
          action: "outboundClicked",
          actionLocation: actionLocation(a),
          destinationId: destinationId(a),
          destinationType: destinationType(a)
        });
      });
    }
  });
})();
