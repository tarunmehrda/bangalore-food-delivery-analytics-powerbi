/* ============================================================
   Live charts — real data from the 200K-order dataset (Chart.js)
   Rendered lazily on scroll for performance.
   Dependency: chart.js (CDN in index.html)
   ============================================================ */
(function () {
  "use strict";
  if (typeof Chart === "undefined") return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Chart.defaults.color = "#9AA0AE";
  Chart.defaults.font.family = "Inter, 'Segoe UI', sans-serif";
  Chart.defaults.borderColor = "#22232C";

  // ---- real data (computed from data/dataset.xlsx) ----
  var MONTHS = ["23-01","23-02","23-03","23-04","23-05","23-06","23-07","23-08","23-09","23-10","23-11","23-12",
    "24-01","24-02","24-03","24-04","24-05","24-06","24-07","24-08","24-09","24-10","24-11","24-12",
    "25-01","25-02","25-03","25-04","25-05","25-06","25-07","25-08","25-09"];
  var REV_M = [5.15,4.61,5.2,4.97,5.09,4.92,5.1,5.18,5.05,5.09,4.95,5.14,5.09,4.71,5.09,4.88,5.2,4.81,
    5.16,5.15,4.87,5.09,4.92,5.25,5.07,4.68,5.07,5.0,5.02,4.93,5.09,5.11,4.26];
  var CUM = [], run = 0;
  REV_M.forEach(function (v) { run += v; CUM.push(Math.round(run * 10) / 10); });

  var GRID = "rgba(255,255,255,0.05)";
  var anim = reduce ? false : { duration: 900, easing: "easeOutQuart" };

  function tip(isPct) {
    return {
      backgroundColor: "#0E0F17", borderColor: "#262838", borderWidth: 1,
      titleColor: "#EAECF2", bodyColor: "#EAECF2", padding: 10, cornerRadius: 8,
      callbacks: {
        label: function (c) {
          if (isPct) {
            var tot = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
            return " " + c.label + ": " + Number(c.raw).toLocaleString() + " (" + (100 * c.raw / tot).toFixed(1) + "%)";
          }
          return " " + Number(c.raw).toLocaleString();
        }
      }
    };
  }

  var done = {};
  function build(id) {
    if (done[id]) return; done[id] = true;
    var cv = document.getElementById(id); if (!cv) return;
    var ctx = cv.getContext("2d");

    if (id === "cRevenue") {
      var stroke = ctx.createLinearGradient(0, 0, cv.width, 0);
      stroke.addColorStop(0, "#6C4AE0"); stroke.addColorStop(1, "#3DDC84");
      var fill = ctx.createLinearGradient(0, 0, 0, 240);
      fill.addColorStop(0, "rgba(108,74,224,0.35)"); fill.addColorStop(1, "rgba(108,74,224,0)");
      new Chart(ctx, {
        type: "line",
        data: { labels: MONTHS, datasets: [{ data: CUM, borderColor: stroke, backgroundColor: fill, fill: true, borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: anim,
          plugins: { legend: { display: false }, tooltip: tip() },
          scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
            y: { grid: { color: GRID }, ticks: { callback: function (v) { return "₹" + v + "M"; } } } } }
      });
    } else if (id === "cStatus") {
      new Chart(ctx, {
        type: "doughnut",
        data: { labels: ["Delivered", "Delayed", "Cancelled"], datasets: [{ data: [160227, 19826, 19947], backgroundColor: ["#3DDC84", "#F5B54B", "#F43F5E"], borderColor: "#16171F", borderWidth: 3, hoverOffset: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "64%", animation: anim,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } }, tooltip: tip(true) } }
      });
    } else if (id === "cLocation") {
      var g = ctx.createLinearGradient(0, 0, cv.width, 0);
      g.addColorStop(0, "#6C4AE0"); g.addColorStop(1, "#3DDC84");
      new Chart(ctx, {
        type: "bar",
        data: { labels: ["BTM", "Koramangala", "HSR", "JP Nagar", "Whitefield", "Indiranagar"], datasets: [{ data: [17952, 9047, 9000, 7884, 7749, 7390], backgroundColor: g, borderRadius: 6, borderSkipped: false }] },
        options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, animation: anim,
          plugins: { legend: { display: false }, tooltip: tip() },
          scales: { x: { grid: { color: GRID } }, y: { grid: { display: false } } } }
      });
    } else if (id === "cCuisine") {
      new Chart(ctx, {
        type: "bar",
        data: { labels: ["North Indian", "Chinese", "South Indian", "Fast Food", "Biryani", "Continental"], datasets: [{ data: [21085, 15547, 8644, 8096, 6493, 5765], backgroundColor: ["#6C4AE0", "#3A8FE0", "#3DDC84", "#F5B54B", "#CBB894", "#EC4899"], borderRadius: 6, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, animation: anim,
          plugins: { legend: { display: false }, tooltip: tip() },
          scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 9 } } }, y: { grid: { color: GRID } } } }
      });
    }
  }

  var ids = ["cRevenue", "cStatus", "cLocation", "cCuisine"];
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { build(e.target.id); io.unobserve(e.target); } });
    }, { threshold: 0.25 });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  } else {
    ids.forEach(build);
  }
})();
