/* Feedback form: branch bug/feature, validate, POST to the Azure Function, toast feedback. */
(function () {
  "use strict";

  var app = document.getElementById("feedback-app");
  if (!app) return;
  var fnUrl = (app.getAttribute("data-fn") || "").trim();
  var SUPPORT = "azuresqldb-container@microsoft.com";

  var form = document.getElementById("fb-form");
  var submit = document.getElementById("fb-submit");
  var success = document.getElementById("fb-success");
  var successMsg = document.getElementById("fb-success-msg");
  var again = document.getElementById("fb-again");
  var groups = form.querySelectorAll(".fb-group");
  // The type radios live in .fb-tabs, a sibling of the form — query from the app container.
  var typeRadios = app.querySelectorAll('input[name="type"]');

  // --- toast ---
  function toast(msg, type) {
    var wrap = document.getElementById("fb-toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "fb-toast-wrap";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var t = document.createElement("div");
    t.className = "toast toast-" + (type || "info");
    t.setAttribute("role", type === "error" ? "alert" : "status");
    var icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = type === "success" ? "✓" : (type === "error" ? "⚠" : "•");
    var span = document.createElement("span");
    span.textContent = msg;
    t.appendChild(icon);
    t.appendChild(span);
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 4500);
  }

  function setType(type) {
    groups.forEach(function (g) {
      var match = g.getAttribute("data-group") === type;
      g.classList.toggle("is-hidden", !match);
      g.disabled = !match; // disabled fieldset controls are excluded from submit + validation
    });
    typeRadios.forEach(function (r) { r.checked = r.value === type; });
  }

  function currentType() {
    var checked = app.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "bug";
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (e) { /* ignore */ }
    }
  }

  // Friendly message for the first invalid control.
  function invalidMessage(el) {
    if (el.name === "confirm") return "Please confirm you checked the Known limitations page.";
    var wrap = el.closest(".fb-field, .fb-checkset");
    var lbl = wrap && wrap.querySelector(".fb-label");
    var nm = lbl ? lbl.textContent.replace(/\*/g, "").trim() : "A required field";
    return nm + " is required.";
  }

  // Preselect from the URL hash (#bug / #feature) or the ?type= query param.
  var params = new URLSearchParams(window.location.search);
  var hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  var initial = hash || (params.get("type") || "").toLowerCase();
  setType(initial === "feature" ? "feature" : "bug");

  typeRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      setType(r.value);
      // Keep the URL in sync (shareable) without scrolling.
      try { history.replaceState(null, "", "#" + r.value); } catch (e) { /* ignore */ }
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!fnUrl) {
      toast("The feedback form isn’t configured yet. Please email " + SUPPORT + ".", "error");
      return;
    }

    // Required fields (custom, so we can toast instead of the native bubble).
    if (!form.checkValidity()) {
      var firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) {
        try { firstInvalid.focus(); } catch (e2) { /* ignore */ }
        toast(invalidMessage(firstInvalid), "error");
      }
      return;
    }

    // Feature: at least one "Who benefits".
    if (currentType() === "feature") {
      if (form.querySelectorAll('input[name="who-benefits"]:checked').length === 0) {
        toast("Please select at least one option for “Who benefits”.", "error");
        return;
      }
    }

    // Require a way to follow up: GitHub username or email.
    var ghField = form.querySelector('input[name="github-username"]');
    var emField = form.querySelector('input[name="email"]');
    var gh = ghField ? ghField.value.trim() : "";
    var em = emField ? emField.value.trim() : "";
    if (!gh && !em) {
      toast("Please provide your GitHub username or an email so we can follow up.", "error");
      if (ghField) ghField.focus();
      return;
    }

    var data = new FormData(form);
    data.set("type", currentType()); // type radios live outside the form

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = "Sending…";

    fetch(fnUrl, { method: "POST", body: data })
      .then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      })
      .then(function (r) {
        if (r.status === 200 && r.body && r.body.ok) {
          var tabs = document.querySelector(".fb-tabs");
          if (tabs) tabs.hidden = true;
          form.hidden = true;
          if (r.body.ref) {
            successMsg.textContent = "Your feedback was sent to the team (reference #" + r.body.ref + ").";
          }
          success.hidden = false;
          success.scrollIntoView({ behavior: "smooth", block: "center" });
          toast("Feedback sent — thank you!", "success");
        } else {
          toast((r.body && r.body.error) || "Something went wrong. Please try again.", "error");
          resetTurnstile();
        }
      })
      .catch(function () {
        toast("Network error. Please retry, or email " + SUPPORT + ".", "error");
        resetTurnstile();
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
  });

  if (again) {
    again.addEventListener("click", function () { window.location.reload(); });
  }
})();
