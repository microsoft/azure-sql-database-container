/* Feedback form: branch bug/feature, validate, POST to the Azure Function. */
(function () {
  "use strict";

  var app = document.getElementById("feedback-app");
  if (!app) return;
  var fnUrl = (app.getAttribute("data-fn") || "").trim();

  var form = document.getElementById("fb-form");
  var submit = document.getElementById("fb-submit");
  var status = document.getElementById("fb-status");
  var success = document.getElementById("fb-success");
  var successMsg = document.getElementById("fb-success-msg");
  var again = document.getElementById("fb-again");
  var groups = form.querySelectorAll(".fb-group");
  // The type radios live in .fb-tabs, a sibling of the form — query from the app container, not the form.
  var typeRadios = app.querySelectorAll('input[name="type"]');

  function setType(type) {
    groups.forEach(function (g) {
      var match = g.getAttribute("data-group") === type;
      g.classList.toggle("is-hidden", !match);
      g.disabled = !match; // disabled fieldset controls are excluded from submit + validation
    });
    typeRadios.forEach(function (r) {
      r.checked = r.value === type;
    });
  }

  function currentType() {
    var checked = app.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "bug";
  }

  function setStatus(msg, isError) {
    status.textContent = msg || "";
    status.classList.toggle("is-error", !!isError);
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(); } catch (e) { /* ignore */ }
    }
  }

  // Preselect from ?type=
  var params = new URLSearchParams(window.location.search);
  var initial = (params.get("type") || "").toLowerCase();
  setType(initial === "feature" ? "feature" : "bug");

  typeRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      setType(r.value);
      setStatus("");
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("");

    if (!fnUrl) {
      setStatus("The feedback form is not fully configured yet. Please email azuresqldb-container@microsoft.com.", true);
      return;
    }

    // Native validation on the visible (enabled) controls.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Feature: require at least one "Who benefits".
    if (currentType() === "feature") {
      var checked = form.querySelectorAll('input[name="who-benefits"]:checked');
      if (checked.length === 0) {
        setStatus("Please select at least one option for “Who benefits”.", true);
        return;
      }
    }

    // Require a way to follow up: GitHub username or email.
    var ghField = form.querySelector('input[name="github-username"]');
    var emField = form.querySelector('input[name="email"]');
    var gh = ghField ? ghField.value.trim() : "";
    var em = emField ? emField.value.trim() : "";
    if (!gh && !em) {
      setStatus("Please provide your GitHub username or an email so we can follow up.", true);
      return;
    }

    var data = new FormData(form); // disabled fieldset => inactive branch excluded automatically
    data.set("type", currentType()); // type radios live outside the form, so set it explicitly

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = "Sending…";
    setStatus("");

    fetch(fnUrl, { method: "POST", body: data })
      .then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      })
      .then(function (r) {
        if (r.status === 200 && r.body && r.body.ok) {
          form.hidden = true;
          document.querySelector(".fb-tabs").hidden = true;
          if (r.body.ref) {
            successMsg.textContent = "Your feedback was sent to the team (reference #" + r.body.ref + ").";
          }
          success.hidden = false;
          success.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setStatus((r.body && r.body.error) || "Something went wrong. Please try again.", true);
          resetTurnstile();
        }
      })
      .catch(function () {
        setStatus("Network error. Please retry, or email azuresqldb-container@microsoft.com.", true);
        resetTurnstile();
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
  });

  if (again) {
    again.addEventListener("click", function () {
      window.location.reload();
    });
  }
})();
