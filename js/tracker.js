/**
 * OpenSanta progress tracker.
 * Reads /status.json (or ./status.json) and updates every .tracker on the page.
 * The HTML is already marked for the current stage, so the bar works without JavaScript.
 *
 * To update the public status:
 *   1. Edit status.json: set "current" to one of formation, recording, dataset, training, release.
 *      Also update "updated" (YYYY-MM-DD) and the short "note".
 *   2. For visitors with JavaScript off, also set data-current and aria-current
 *      in the tracker markup on each HTML page so it stays in sync.
 * See README.md for the full note.
 */
(function () {
  "use strict";

  var STAGE_ORDER = ["formation", "recording", "dataset", "training", "release"];

  function applyStatus(data) {
    if (!data || !data.current) return;
    var current = String(data.current).toLowerCase();
    var currentIndex = STAGE_ORDER.indexOf(current);
    if (currentIndex === -1) return;

    var trackers = document.querySelectorAll(".tracker");
    trackers.forEach(function (ol) {
      ol.setAttribute("data-current", current);
      var items = ol.querySelectorAll("li[data-stage]");
      items.forEach(function (li) {
        var stage = li.getAttribute("data-stage");
        var idx = STAGE_ORDER.indexOf(stage);
        li.classList.remove("is-current", "is-done", "is-upcoming");
        li.removeAttribute("aria-current");
        if (idx < currentIndex) {
          li.classList.add("is-done");
        } else if (idx === currentIndex) {
          li.classList.add("is-current");
          li.setAttribute("aria-current", "step");
        } else {
          li.classList.add("is-upcoming");
        }
      });
    });

    var labels = {
      formation: "Formation",
      recording: "Recording",
      dataset: "Dataset",
      training: "Training",
      release: "Release",
    };
    var step = currentIndex + 1;
    var caption = "Step " + step + " of 5: " + labels[current];
    document.querySelectorAll("[data-status-step]").forEach(function (el) {
      el.textContent = caption;
    });
    document.querySelectorAll(".progress-thin").forEach(function (el) {
      el.setAttribute("aria-valuenow", String(step));
      el.setAttribute("aria-label", caption);
      var fill = el.querySelector("span");
      if (fill) fill.style.width = step * 20 + "%";
    });

    if (data.note) {
      document.querySelectorAll("[data-status-note]").forEach(function (el) {
        el.textContent = data.note;
      });
    }

    if (data.updated) {
      document.querySelectorAll("[data-status-updated]").forEach(function (el) {
        el.textContent = "Updated " + data.updated + ".";
      });
    }
  }

  var paths = ["status.json", "./status.json", "/status.json"];
  // Try relative to the current page first (repo-root Pages and local server).
  var tryFetch = function (i) {
    if (i >= paths.length) return;
    fetch(paths[i], { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("not ok");
        return res.json();
      })
      .then(applyStatus)
      .catch(function () {
        tryFetch(i + 1);
      });
  };
  tryFetch(0);
})();
