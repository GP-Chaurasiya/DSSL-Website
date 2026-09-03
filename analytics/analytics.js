/**
 * DSSL Admin — Player & Team Analytics Dashboard Client Logic
 * analytics.js
 */

const MANDALS = ["Vashishta Mandal", "Vishwamitra Mandal", "Atrey Mandal", "Gautam Mandal", "Bharadwaj Mandal", "Jamdagni Mandal", "Kashyap Mandal"];
const COURSES = ["BA English", "BA Hindi", "BA History", "BA Music", "BA Psychology", "BA Sanskrit", "BAJMC", "BBA", "BCA", "B.Ed", "BRS", "B.Sc IT", "B.Sc Maths", "B.Sc Yogic Science", "B.Voc", "MA English", "MA Hindi", "MA History", "MA Music", "MA Psychology", "MA Yoga Therapy (MA YT)", "MAJMC", "MBA", "MCA", "M.Sc HCYS", "PhD"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SPORTS = ["Basketball", "Football", "Cricket", "Volleyball", "Badminton (Doubles)", "Badminton (Singles)", "Table Tennis", "Athletics (100m)", "Athletics (200m)", "Athletics (400m)", "Athletics (Relay)", "Kho-Kho", "Chess", "7 Stones", "Tug of War", "Long Jump", "High Jump", "Javelin Throw", "Discus Throw", "Shot Put", "Kabaddi", "Track Marking"];
const GENDER_COLORS = { Male: "#3b82f6", Female: "#ec4899", Other: "#8b5cf6", Unknown: "#94a3b8" };
const MANDAL_COLORS = ["#ffbc01", "#003e8a", "#10b981", "#ef4444", "#8b5cf6", "#f97316", "#06b6d4"];

let analyticsCharts = {};
let analyticsFilters = { mandal: "", course: "", semester: "", gender: "", sport: "", search: "", page: 1 };
let analyticsTimer = null;

async function anApiCall(url) {
  let tk = localStorage.getItem("DSSL_token") || localStorage.getItem("dsspl_token");
  if (!tk) {
    try {
      if (window.parent && window.parent.localStorage) {
        tk = window.parent.localStorage.getItem("DSSL_token") || window.parent.localStorage.getItem("dsspl_token");
      }
    } catch (e) {}
  }
  const headers = {};
  if (tk) headers["Authorization"] = `Bearer ${tk}`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

async function loadAllAnalytics() {
  try {
    await Promise.all([
      loadOverview(),
      loadTrend(7),
      loadMandalChart(),
      loadGenderChart(),
      loadCourseChart(),
      loadSemesterChart(),
      loadSportChart(),
      loadMandalGenderChart(),
      loadTeamStats(),
      loadPlayers()
    ]);
  } catch (e) {
    console.error("Analytics load error:", e);
  }
}

async function loadOverview() {
  try {
    const d = await anApiCall("/api/analytics/overview");
    setText("an-kpi-total", d.totalPlayers ?? 0);
    setText("an-kpi-male", d.maleCount ?? 0);
    setText("an-kpi-female", d.femaleCount ?? 0);
    setText("an-kpi-today", d.todayRegistrations ?? 0);
    setText("an-kpi-mandals", d.totalMandals ?? 0);
    setText("an-kpi-sports", d.totalSports ?? 0);
    setText("an-kpi-live", d.matches?.live ?? 0);
    setText("an-kpi-completed", d.matches?.completed ?? 0);
  } catch (e) {
    console.error("Overview error:", e);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function loadTrend(days) {
  [7, 30, 60].forEach(d => {
    const btn = document.getElementById(`an-trend-${d}`);
    if (btn) btn.classList.toggle("active", d === days);
  });

  try {
    const data = await anApiCall(`/api/analytics/registration-trend?days=${days}`);
    const labels = data.map(d => {
      // Parse YYYY-MM-DD parts directly to avoid UTC-to-local timezone shift
      const [, , mm, dd] = d.date.split("-");
      return `${parseInt(dd)}/${parseInt(mm)}`;
    });
    const counts = data.map(d => d.count);

    destroyChart("an-chart-trend");
    const ctx = document.getElementById("an-chart-trend");
    if (!ctx) return;

    analyticsCharts["an-chart-trend"] = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Registrations",
          data: counts,
          borderColor: "#ffbc01",
          backgroundColor: "rgba(255,188,1,.12)",
          borderWidth: 2.5,
          pointRadius: counts.length < 20 ? 4 : 2,
          pointBackgroundColor: "#ffbc01",
          fill: true,
          tension: 0.4
        }]
      },
      options: chartDefaults({ y: { beginAtZero: true, ticks: { stepSize: 1 } } })
    });
  } catch (e) { console.error("Trend error:", e); }
}

async function loadMandalChart() {
  try {
    const data = await anApiCall("/api/analytics/mandal-distribution");
    destroyChart("an-chart-mandal");
    const ctx = document.getElementById("an-chart-mandal");
    if (!ctx) return;

    analyticsCharts["an-chart-mandal"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => d.mandal.replace(" Mandal", "")),
        datasets: [{
          label: "Players",
          data: data.map(d => d.count),
          backgroundColor: MANDAL_COLORS,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: chartDefaults()
    });
  } catch (e) { console.error("Mandal chart error:", e); }
}

async function loadGenderChart() {
  try {
    const result = await anApiCall("/api/analytics/gender-distribution");
    const data = result.distribution || [];
    destroyChart("an-chart-gender");
    const ctx = document.getElementById("an-chart-gender");
    if (!ctx) return;

    analyticsCharts["an-chart-gender"] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map(d => `${d.gender} (${d.percentage}%)`),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => GENDER_COLORS[d.gender] || "#94a3b8"),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        ...chartDefaults(),
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: getCSSVar("--text-muted"), padding: 12, font: { size: 12, family: "Outfit" } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} players`
            }
          }
        }
      }
    });
  } catch (e) { console.error("Gender chart error:", e); }
}

async function loadCourseChart() {
  try {
    const data = (await anApiCall("/api/analytics/course-distribution")).slice(0, 10);
    destroyChart("an-chart-course");
    const ctx = document.getElementById("an-chart-course");
    if (!ctx) return;

    analyticsCharts["an-chart-course"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => d.course),
        datasets: [{
          label: "Players",
          data: data.map(d => d.count),
          backgroundColor: "rgba(59,130,246,.8)",
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: { ...chartDefaults(), indexAxis: "y" }
    });
  } catch (e) { console.error("Course chart error:", e); }
}

async function loadSemesterChart() {
  try {
    const data = await anApiCall("/api/analytics/semester-distribution");
    destroyChart("an-chart-semester");
    const ctx = document.getElementById("an-chart-semester");
    if (!ctx) return;

    analyticsCharts["an-chart-semester"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => `Sem ${d.semester}`),
        datasets: [{
          label: "Players",
          data: data.map(d => d.count),
          backgroundColor: data.map((_, i) => `hsl(${120 + i * 30},70%,55%)`),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: chartDefaults({ y: { beginAtZero: true } })
    });
  } catch (e) { console.error("Semester chart error:", e); }
}

async function loadSportChart() {
  const chartId = "an-chart-sport";
  const canvas = document.getElementById(chartId);

  if (!canvas) {
    console.error("Sports chart canvas not found:", chartId);
    return;
  }

  try {
    let rows = [];

    // =========================================================
    // 1. TRY THE DEDICATED SPORTS ANALYTICS API
    // =========================================================
    try {
      const result = await anApiCall("/api/analytics/sport-distribution");

      if (Array.isArray(result)) {
        rows = result;
      } else if (Array.isArray(result?.distribution)) {
        rows = result.distribution;
      } else if (Array.isArray(result?.data)) {
        rows = result.data;
      } else if (Array.isArray(result?.sports)) {
        rows = result.sports;
      }

      // Convert API response into:
      // [{ sport: "Football", count: 25 }, ...]
      rows = rows
        .map(item => ({
          sport: String(
            item?.sport ??
            item?.name ??
            item?.label ??
            ""
          ).trim(),

          count: Number(
            item?.count ??
            item?.players ??
            item?.total ??
            item?.value ??
            0
          )
        }))
        .filter(
          item =>
            item.sport &&
            Number.isFinite(item.count) &&
            item.count >= 0
        );

    } catch (apiError) {
      console.warn(
        "Sport distribution API failed:",
        apiError
      );
    }

    // =========================================================
    // 2. FALLBACK TO REAL PLAYER DATA
    // =========================================================
    // If the analytics endpoint gives no data,
    // calculate sports directly from registered players.
    // =========================================================

    if (!rows.length) {
      console.log(
        "No sport distribution data found. Calculating from players..."
      );

      const firstPage = await anApiCall(
        "/api/players?page=1&limit=100"
      );

      let players = Array.isArray(firstPage)
        ? firstPage
        : (firstPage?.players || []);

      const totalPages = Number(
        firstPage?.totalPages || 1
      );

      // Load remaining pages if they exist
      for (let page = 2; page <= totalPages; page++) {
        const pageResult = await anApiCall(
          `/api/players?page=${page}&limit=100`
        );

        const pagePlayers = Array.isArray(pageResult)
          ? pageResult
          : (pageResult?.players || []);

        players = players.concat(pagePlayers);
      }

      // Count players for each sport
      const sportCounts = {};

      players.forEach(player => {
        const sport = String(
          player?.sport || ""
        ).trim();

        if (!sport) return;

        sportCounts[sport] =
          (sportCounts[sport] || 0) + 1;
      });

      rows = Object.entries(sportCounts).map(
        ([sport, count]) => ({
          sport,
          count
        })
      );
    }

    // =========================================================
    // 3. SORT SPORTS — HIGHEST FIRST
    // =========================================================

    rows.sort((a, b) => b.count - a.count);

    console.log(
      "Sports Distribution:",
      rows
    );

    // =========================================================
    // 4. DESTROY OLD CHART
    // =========================================================

    destroyChart(chartId);

    const wrapper = canvas.parentElement;

    // =========================================================
    // 5. NO DATA MESSAGE
    // =========================================================

    if (!rows.length) {

      canvas.style.display = "none";

      if (wrapper) {
        wrapper.style.height = "240px";

        let message =
          wrapper.querySelector(
            ".an-sport-empty"
          );

        if (!message) {
          message =
            document.createElement("div");

          message.className =
            "an-sport-empty";

          message.style.cssText = `
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            color:var(--text-muted);
            font-size:13px;
          `;

          wrapper.appendChild(message);
        }

        message.textContent =
          "No sport registration data available yet.";
      }

      return;
    }

    // =========================================================
    // 6. SHOW CANVAS
    // =========================================================

    canvas.style.display = "block";

    if (wrapper) {

      const oldMessage =
        wrapper.querySelector(
          ".an-sport-empty"
        );

      if (oldMessage) {
        oldMessage.remove();
      }

      // Dynamic height based on number of sports
      wrapper.style.height =
        `${Math.max(
          240,
          rows.length * 42 + 50
        )}px`;
    }

    // =========================================================
    // 7. PREPARE DATA
    // =========================================================

    const labels =
      rows.map(item => item.sport);

    const counts =
      rows.map(item => item.count);

    // =========================================================
    // 8. CREATE SPORTS CHART
    // =========================================================

    analyticsCharts[chartId] =
      new Chart(canvas, {

        type: "bar",

        data: {

          labels,

          datasets: [{

            label:
              "Registered Players",

            data: counts,

            backgroundColor:
              labels.map(
                (_, index) =>
                  `hsl(${(index * 29 + 35) % 360}, 70%, 55%)`
              ),

            borderRadius: 7,

            borderSkipped: false,

            barThickness: 24,

            maxBarThickness: 28
          }]
        },

        options: {

          ...chartDefaults(),

          // Horizontal bars
          indexAxis: "y",

          responsive: true,

          maintainAspectRatio: false,

          scales: {

            x: {

              ...chartScales().x,

              beginAtZero: true,

              ticks: {

                ...chartScales().x.ticks,

                precision: 0,

                stepSize: 1
              }
            },

            y: {

              ...chartScales().y,

              grid: {
                display: false
              },

              ticks: {
                ...chartScales().y.ticks,

                autoSkip: false
              }
            }
          },

          plugins: {

            ...chartDefaults().plugins,

            tooltip: {

              ...chartDefaults()
                .plugins
                .tooltip,

              callbacks: {

                label: function (ctx) {

                  const count =
                    Number(ctx.raw || 0);

                  return ` ${count} registered player${count === 1 ? "" : "s"
                    }`;
                }
              }
            }
          }
        }
      });

  } catch (error) {

    console.error(
      "Sports Distribution Chart Error:",
      error
    );

    const wrapper =
      canvas.parentElement;

    canvas.style.display = "none";

    if (wrapper) {

      wrapper.style.height =
        "240px";

      let errorMessage =
        wrapper.querySelector(
          ".an-sport-empty"
        );

      if (!errorMessage) {

        errorMessage =
          document.createElement(
            "div"
          );

        errorMessage.className =
          "an-sport-empty";

        errorMessage.style.cssText = `
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          color:var(--text-muted);
          font-size:13px;
          padding:20px;
        `;

        wrapper.appendChild(
          errorMessage
        );
      }

      errorMessage.innerHTML = `
        Unable to load sport distribution.
        <br>
        <small>
          Check browser Console for details.
        </small>
      `;
    }
  }
}

async function loadMandalGenderChart() {
  try {
    const result = await anApiCall("/api/analytics/cross/mandal-gender");
    const { genders, data } = result;
    destroyChart("an-chart-mandal-gender");
    const ctx = document.getElementById("an-chart-mandal-gender");
    if (!ctx || !data.length) return;

    analyticsCharts["an-chart-mandal-gender"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => d.mandal.replace(" Mandal", "")),
        datasets: genders.map(g => ({
          label: g,
          data: data.map(d => d[g] || 0),
          backgroundColor: GENDER_COLORS[g] || "#94a3b8",
          borderRadius: 4,
          borderSkipped: false
        }))
      },
      options: {
        ...chartDefaults(),
        scales: {
          x: chartScales().x,
          y: { ...chartScales().y, stacked: true, beginAtZero: true }
        },
        plugins: {
          legend: {
            labels: { color: getCSSVar("--text-muted"), font: { family: "Outfit", size: 12 } }
          },
          tooltip: { mode: "index" }
        }
      }
    });
  } catch (e) { console.error("Mandal×Gender error:", e); }
}

async function loadTeamStats() {
  const tbody = document.getElementById("an-team-tbody");
  if (!tbody) return;
  try {
    const data = await anApiCall("/api/analytics/team-stats");
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-muted)">No team stats recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((t, i) => {
      const rankColor = i === 0 ? "#ffbc01" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : "var(--bg-primary)";
      const rankText = i === 0 ? "#000" : i === 1 ? "#000" : i === 2 ? "#000" : "var(--text-muted)";
      return `<tr>
        <td><span style="width:26px;height:26px;border-radius:50%;background:${rankColor};color:${rankText};display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${i + 1}</span></td>
        <td><strong>${esc(t.name)}</strong></td>
        <td>${t.playerCount}</td>
        <td>${t.matchesPlayed}</td>
        <td style="color:#10b981;font-weight:700">${t.wins}</td>
        <td style="color:#ef4444;font-weight:700">${t.losses}</td>
        <td style="color:#94a3b8">${t.draws}</td>
        <td><strong style="color:var(--primary)">${t.points}</strong></td>
      </tr>`;
    }).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Could not load team stats.</td></tr>`;
  }
}

function debounceFilter() {
  clearTimeout(analyticsTimer);
  analyticsTimer = setTimeout(applyFilters, 350);
}

function applyFilters() {
  analyticsFilters.mandal = document.getElementById("an-filter-mandal")?.value || "";
  analyticsFilters.course = document.getElementById("an-filter-course")?.value || "";
  analyticsFilters.semester = document.getElementById("an-filter-semester")?.value || "";
  analyticsFilters.gender = document.getElementById("an-filter-gender")?.value || "";
  analyticsFilters.sport = document.getElementById("an-filter-sport")?.value || "";
  analyticsFilters.search = document.getElementById("an-filter-search")?.value || "";
  analyticsFilters.page = 1;
  loadPlayers();
}

function resetFilters() {
  analyticsFilters = { mandal: "", course: "", semester: "", gender: "", sport: "", search: "", page: 1 };
  const ids = ["an-filter-mandal", "an-filter-course", "an-filter-semester", "an-filter-gender", "an-filter-sport"];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  const search = document.getElementById("an-filter-search");
  if (search) search.value = "";
  loadPlayers();
}

function exportPlayers() {
  const p = new URLSearchParams();
  if (analyticsFilters.mandal) p.set("mandal", analyticsFilters.mandal);
  if (analyticsFilters.course) p.set("course", analyticsFilters.course);
  if (analyticsFilters.semester) p.set("semester", analyticsFilters.semester);
  if (analyticsFilters.gender) p.set("gender", analyticsFilters.gender);
  if (analyticsFilters.sport) p.set("sport", analyticsFilters.sport);
  if (analyticsFilters.search) p.set("search", analyticsFilters.search);
  p.set("format", "csv");

  const btn = document.getElementById("an-export-btn");
  if (btn) { btn.innerHTML = '<i class="ri-loader-4-line"></i> Exporting...'; btn.disabled = true; }
  fetch(`/api/analytics/export?${p.toString()}`)
    .then(r => {
      if (!r.ok) throw new Error("Export failed");
      return r.blob();
    }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DSSL_Players_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(e => alert("Export failed: " + e.message))
    .finally(() => {
      if (btn) { btn.innerHTML = '<i class="ri-download-2-line"></i> Export CSV'; btn.disabled = false; }
    });
}

// Convert canvas chart to high quality image data URL with white background
function getChartImageDataUrl(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  // Create an offscreen canvas to render with white background
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tCtx = tempCanvas.getContext("2d");
  
  tCtx.fillStyle = "#ffffff";
  tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tCtx.drawImage(canvas, 0, 0);
  
  return tempCanvas.toDataURL("image/png");
}

async function exportAnalyticsPDF() {
  const btn = document.getElementById("an-pdf-btn");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Generating PDF...';
    btn.disabled = true;
  }

  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error("PDF generation library (jsPDF) is loading. Please try again in a moment.");
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 14;

    const primaryColor = [255, 188, 1]; // #ffbc01
    const darkNavy = [11, 15, 25]; // #0b0f19
    const brandBlue = [0, 62, 138]; // #003e8a
    const textDark = [30, 41, 59];
    const textMuted = [100, 116, 139];

    // Helper: Add header banner
    function addHeader(title, subtitle) {
      // Top header band
      doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.rect(0, 0, pageWidth, 28, "F");

      // Accent gold strip
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 28, pageWidth, 2.5, "F");

      // Header text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("DEV SANSKRITI SPORTS LEAGUE (DSSL) 2026", margin, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title || "Official Analytics & Performance Report", margin, 19);

      doc.setFontSize(8.5);
      doc.setTextColor(180, 195, 215);
      const dateStr = `Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`;
      doc.text(dateStr, pageWidth - margin, 19, { align: "right" });

      y = 36;
    }

    // Helper: Footer
    function addFooters() {
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("Dev Sanskriti Vishwavidyalaya · DSSL 2026 Analytics Dashboard", margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
      }
    }

    // Helper: Check page break
    function checkPageBreak(requiredHeight) {
      if (y + requiredHeight > pageHeight - 18) {
        doc.addPage();
        addHeader("Executive Analytics Report (Continued)");
        return true;
      }
      return false;
    }

    // --- PAGE 1: Executive Summary & KPIs ---
    addHeader("Official Analytics & Performance Executive Report");

    // Fetch Overview Data
    let overview = {};
    try {
      overview = await anApiCall("/api/analytics/overview");
    } catch (e) {
      console.warn("Could not fetch overview for PDF:", e);
    }

    const totalPlayers = overview.totalPlayers ?? document.getElementById("an-kpi-total")?.textContent ?? "—";
    const malePlayers = overview.maleCount ?? document.getElementById("an-kpi-male")?.textContent ?? "—";
    const femalePlayers = overview.femaleCount ?? document.getElementById("an-kpi-female")?.textContent ?? "—";
    const registeredToday = overview.todayRegistrations ?? document.getElementById("an-kpi-today")?.textContent ?? "—";
    const totalMandals = overview.totalMandals ?? document.getElementById("an-kpi-mandals")?.textContent ?? "—";
    const totalSports = overview.totalSports ?? document.getElementById("an-kpi-sports")?.textContent ?? "—";
    const liveMatches = overview.matches?.live ?? document.getElementById("an-kpi-live")?.textContent ?? "—";
    const completedMatches = overview.matches?.completed ?? document.getElementById("an-kpi-completed")?.textContent ?? "—";

    // Section title: KPI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    doc.text("1. Executive Summary & Key Performance Indicators", margin, y);
    y += 6;

    // KPI Cards Grid (4 columns x 2 rows)
    const kpis = [
      { label: "Total Players", val: String(totalPlayers), bg: [255, 251, 235], border: [255, 188, 1], text: [180, 83, 9] },
      { label: "Male Players", val: String(malePlayers), bg: [239, 246, 255], border: [59, 130, 246], text: [29, 78, 216] },
      { label: "Female Players", val: String(femalePlayers), bg: [253, 242, 248], border: [236, 72, 153], text: [190, 24, 93] },
      { label: "Registered Today", val: String(registeredToday), bg: [236, 253, 245], border: [16, 185, 129], text: [4, 120, 87] },
      { label: "Active Mandals", val: String(totalMandals), bg: [245, 243, 255], border: [139, 92, 246], text: [109, 40, 217] },
      { label: "Total Sports", val: String(totalSports), bg: [255, 247, 237], border: [249, 115, 22], text: [194, 65, 12] },
      { label: "Live Matches", val: String(liveMatches), bg: [254, 242, 242], border: [239, 68, 68], text: [185, 28, 28] },
      { label: "Completed Matches", val: String(completedMatches), bg: [236, 254, 255], border: [6, 182, 212], text: [14, 116, 144] }
    ];

    const cardWidth = (contentWidth - 9) / 4;
    const cardHeight = 18;

    kpis.forEach((kpi, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const cx = margin + col * (cardWidth + 3);
      const cy = y + row * (cardHeight + 3);

      doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
      doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
      doc.roundedRect(cx, cy, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(kpi.label.toUpperCase(), cx + 4, cy + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
      doc.text(kpi.val, cx + 4, cy + 14);
    });

    y += 2 * (cardHeight + 3) + 6;

    // --- CHARTS SECTION (Page 1 Charts) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    doc.text("2. Registration Trends & Demographics", margin, y);
    y += 6;

    // Trend Chart (Full width)
    const trendImg = getChartImageDataUrl("an-chart-trend");
    if (trendImg) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("Registration Timeline Trend", margin, y);
      y += 3;

      const chartW = contentWidth;
      const chartH = 46;
      doc.addImage(trendImg, "PNG", margin, y, chartW, chartH);
      y += chartH + 7;
    }

    // Mandal & Gender Side-by-Side Charts
    const mandalImg = getChartImageDataUrl("an-chart-mandal");
    const genderImg = getChartImageDataUrl("an-chart-gender");

    if (mandalImg || genderImg) {
      const colW = (contentWidth - 6) / 2;
      const colH = 46;

      if (mandalImg) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Players by Mandal", margin, y);
        doc.addImage(mandalImg, "PNG", margin, y + 3, colW, colH);
      }

      if (genderImg) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Gender Distribution", margin + colW + 6, y);
        doc.addImage(genderImg, "PNG", margin + colW + 6, y + 3, colW, colH);
      }

      y += colH + 9;
    }

    // --- PAGE 2: More Visualizations & Team Standings ---
    doc.addPage();
    addHeader("Detailed Distributions & Team Performance");

    // Course & Semester Side-by-side
    const courseImg = getChartImageDataUrl("an-chart-course");
    const semesterImg = getChartImageDataUrl("an-chart-semester");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    doc.text("3. Academic Demographics & Sports Distribution", margin, y);
    y += 6;

    if (courseImg || semesterImg) {
      const colW = (contentWidth - 6) / 2;
      const colH = 46;

      if (courseImg) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Course Distribution (Top 10)", margin, y);
        doc.addImage(courseImg, "PNG", margin, y + 3, colW, colH);
      }

      if (semesterImg) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Semester Distribution", margin + colW + 6, y);
        doc.addImage(semesterImg, "PNG", margin + colW + 6, y + 3, colW, colH);
      }

      y += colH + 8;
    }

    // Sport Distribution Chart
    const sportImg = getChartImageDataUrl("an-chart-sport");
    if (sportImg) {
      checkPageBreak(55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("Sports Participation Breakdown", margin, y);
      y += 3;

      const chartH = 48;
      doc.addImage(sportImg, "PNG", margin, y, contentWidth, chartH);
      y += chartH + 8;
    }

    // Mandal x Gender Cross Chart
    const crossImg = getChartImageDataUrl("an-chart-mandal-gender");
    if (crossImg) {
      checkPageBreak(55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("Mandal × Gender Cross Analysis", margin, y);
      y += 3;

      const chartH = 48;
      doc.addImage(crossImg, "PNG", margin, y, contentWidth, chartH);
      y += chartH + 8;
    }

    // --- TEAM LEADERBOARD TABLE ---
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
    doc.text("4. Team Leaderboard & Performance Stats", margin, y);
    y += 4;

    let teamStats = [];
    try {
      teamStats = await anApiCall("/api/analytics/team-stats");
    } catch (e) {
      console.warn("Could not fetch team stats for PDF:", e);
    }

    if (teamStats && teamStats.length > 0) {
      const tableRows = teamStats.map((t, idx) => [
        `#${idx + 1}`,
        t.name || "—",
        String(t.playerCount ?? 0),
        String(t.matchesPlayed ?? 0),
        String(t.wins ?? 0),
        String(t.losses ?? 0),
        String(t.draws ?? 0),
        String(t.points ?? 0)
      ]);

      doc.autoTable({
        startY: y,
        head: [["Rank", "Mandal Name", "Players", "Matches", "Wins", "Losses", "Draws", "Points"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [17, 24, 39],
          textColor: [255, 188, 1],
          fontStyle: "bold",
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
          1: { fontStyle: "bold" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center", textColor: [16, 185, 129], fontStyle: "bold" },
          5: { halign: "center", textColor: [239, 68, 68] },
          6: { halign: "center" },
          7: { halign: "center", textColor: [0, 62, 138], fontStyle: "bold" }
        },
        margin: { left: margin, right: margin }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Finalize Footers
    addFooters();

    // Save PDF
    const timestamp = new Date().toISOString().split("T")[0];
    doc.save(`DSSL_2026_Analytics_Report_${timestamp}.pdf`);
  } catch (err) {
    console.error("PDF Export Error:", err);
    alert("Could not generate PDF: " + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = originalHtml || '<i class="ri-file-pdf-2-line"></i> Export Analytics (PDF)';
      btn.disabled = false;
    }
  }
}

// Export Filtered Players Directory as PDF
async function exportPlayersPDF() {
  const btn = document.getElementById("an-export-players-pdf-btn");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Preparing PDF...';
    btn.disabled = true;
  }

  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error("jsPDF library not available.");
    }

    const p = new URLSearchParams({ page: 1, limit: 1000 });
    if (analyticsFilters.mandal) p.set("mandal", analyticsFilters.mandal);
    if (analyticsFilters.course) p.set("course", analyticsFilters.course);
    if (analyticsFilters.semester) p.set("semester", analyticsFilters.semester);
    if (analyticsFilters.gender) p.set("gender", analyticsFilters.gender);
    if (analyticsFilters.sport) p.set("sport", analyticsFilters.sport);
    if (analyticsFilters.search) p.set("search", analyticsFilters.search);

    const result = await anApiCall(`/api/players?${p.toString()}`);
    const players = result.players || [];

    if (!players.length) {
      alert("No player records found matching current filters to export.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Header
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setFillColor(255, 188, 1);
    doc.rect(0, 24, pageWidth, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("DEV SANSKRITI SPORTS LEAGUE (DSSL) 2026 — PLAYER DIRECTORY", margin, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 188, 1);
    const filterDesc = [
      analyticsFilters.mandal || "All Mandals",
      analyticsFilters.course || "All Courses",
      analyticsFilters.sport || "All Sports",
      analyticsFilters.gender || "All Genders"
    ].filter(Boolean).join(" · ");
    doc.text(`Filter: ${filterDesc} | Total Players: ${players.length}`, margin, 18);

    doc.setFontSize(8);
    doc.setTextColor(180, 195, 215);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, 18, { align: "right" });

    const tableRows = players.map((p, idx) => [
      idx + 1,
      p.name || "—",
      p.scholarNo || "—",
      p.course || "—",
      p.semester ? `Sem ${p.semester}` : "—",
      (p.mandalName || "—").replace(" Mandal", ""),
      p.gender || "—",
      p.sport || "—",
      maskPhone(p.phone),
      formatDate(p.registrationDate)
    ]);

    doc.autoTable({
      startY: 30,
      head: [["#", "Player Name", "Scholar ID", "Course", "Sem", "Mandal", "Gender", "Sport", "Phone", "Reg. Date"]],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 188, 1],
        fontStyle: "bold",
        fontSize: 8.5
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        font: "helvetica"
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { fontStyle: "bold" },
        2: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 32 },
        6: { cellWidth: 16, halign: "center" },
        7: { cellWidth: 34 }
      },
      margin: { left: margin, right: margin, bottom: 14 },
      didDrawPage: function (data) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`DSSL 2026 Directory · Page ${doc.internal.getNumberOfPages()}`, margin, pageHeight - 6);
      }
    });

    const timestamp = new Date().toISOString().split("T")[0];
    doc.save(`DSSL_2026_Players_Directory_${timestamp}.pdf`);
  } catch (err) {
    console.error("Directory PDF Error:", err);
    alert("Could not export directory PDF: " + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = originalHtml || '<i class="ri-file-pdf-line"></i> Export Directory PDF';
      btn.disabled = false;
    }
  }
}

async function loadPlayers() {
  const resultsEl = document.getElementById("an-player-results");
  const paginationEl = document.getElementById("an-pagination");
  if (!resultsEl) return;

  resultsEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)"><i class="ri-loader-4-line"></i> Loading...</div>`;

  const p = new URLSearchParams({ page: analyticsFilters.page, limit: 20 });
  if (analyticsFilters.mandal) p.set("mandal", analyticsFilters.mandal);
  if (analyticsFilters.course) p.set("course", analyticsFilters.course);
  if (analyticsFilters.semester) p.set("semester", analyticsFilters.semester);
  if (analyticsFilters.gender) p.set("gender", analyticsFilters.gender);
  if (analyticsFilters.sport) p.set("sport", analyticsFilters.sport);
  if (analyticsFilters.search) p.set("search", analyticsFilters.search);

  try {
    const result = await anApiCall(`/api/players?${p.toString()}`);
    const { players, total, page, limit, totalPages } = result;

    if (!players.length) {
      resultsEl.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted)"><i class="ri-user-unfollow-line" style="font-size:36px;display:block;margin-bottom:10px"></i>No players match the selected filters.</div>`;
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    resultsEl.innerHTML = `
      <div class="an-table-wrap">
        <table class="an-table">
          <thead>
            <tr>
              <th>Name</th><th>Scholar ID</th><th>Course</th><th>Sem</th>
              <th>Mandal</th><th>Gender</th><th>Sport</th><th>Phone</th><th>Reg. Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${players.map(p => `
              <tr>
                <td><span class="an-player-link" onclick="openProfile(${p.id})">${esc(p.name)}</span></td>
                <td><code style="font-size:12px">${esc(p.scholarNo)}</code></td>
                <td>${esc(p.course)}</td>
                <td>${esc(p.semester)}</td>
                <td>
                  <span class="an-pill" style="background:rgba(255,188,1,.15);color:var(--primary)">${esc(p.mandalName.replace(" Mandal", ""))}</span>
                </td>
                <td>
                  <span class="an-pill" style="background:${GENDER_COLORS[p.gender] || "#94a3b8"}22;color:${GENDER_COLORS[p.gender] || "#94a3b8"}">${esc(p.gender) || "—"}</span>
                </td>
                <td>${esc(p.sport) || "—"}</td>
                <td style="font-size:12px;color:var(--text-muted)">${maskPhone(p.phone)}</td>
                <td style="font-size:12px;color:var(--text-muted)">${formatDate(p.registrationDate)}</td>
                <td>
                  <button class="an-filter-btn secondary" title="View Profile" onclick="openProfile(${p.id})" style="padding:4px 8px;font-size:12px">
                    <i class="ri-eye-line"></i>
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:.75rem;">
        Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} players
      </div>
    `;

    if (paginationEl) {
      let pHtml = "";
      if (page > 1) pHtml += `<button class="an-page-btn" onclick="goPage(${page - 1})"><i class="ri-arrow-left-s-line"></i></button>`;
      const start = Math.max(1, page - 2), end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) {
        pHtml += `<button class="an-page-btn ${i === page ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
      }
      if (page < totalPages) pHtml += `<button class="an-page-btn" onclick="goPage(${page + 1})"><i class="ri-arrow-right-s-line"></i></button>`;
      paginationEl.innerHTML = pHtml;
    }
  } catch (e) {
    resultsEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger)">Error loading players: ${e.message}</div>`;
  }
}

function goPage(p) {
  analyticsFilters.page = p;
  loadPlayers();
}

async function openProfile(id) {
  const overlay = document.getElementById("an-profile-modal");
  const content = document.getElementById("an-profile-content");
  if (!overlay || !content) return;

  overlay.classList.add("open");
  content.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)"><i class="ri-loader-4-line"></i> Loading profile...</div>`;

  try {
    const p = await anApiCall(`/api/players/${id}`);
    const initials = (p.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <div class="an-profile-avatar">${initials}</div>
        <div>
          <h3 style="font-size:18px;font-weight:800;margin:0">${esc(p.name)}</h3>
          <p style="font-size:13px;color:var(--text-muted);margin:4px 0 0">#${p.id} · Registered ${formatDate(p.registrationDate)}</p>
        </div>
      </div>

      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:0 0 .75rem">Personal Information</h4>
      <div class="an-profile-grid" style="margin-bottom:1.25rem">
        <div class="an-profile-field"><label>Scholar ID</label><span><code>${esc(p.scholarNo)}</code></span></div>
        <div class="an-profile-field"><label>Gender</label><span>${esc(p.gender) || "—"}</span></div>
        <div class="an-profile-field"><label>Course</label><span>${esc(p.course) || "—"}</span></div>
        <div class="an-profile-field"><label>Semester</label><span>${p.semester ? "Semester " + esc(p.semester) : "—"}</span></div>
        <div class="an-profile-field"><label>Phone</label><span>${esc(p.phone) || "—"}</span></div>
        <div class="an-profile-field"><label>Email</label><span style="word-break:break-all;font-size:13px">${esc(p.email) || "—"}</span></div>
      </div>

      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:0 0 .75rem">Sports Information</h4>
      <div class="an-profile-grid">
        <div class="an-profile-field"><label>Mandal</label><span>${esc(p.mandalName) || "—"}</span></div>
        <div class="an-profile-field"><label>Sport</label><span>${esc(p.sport) || "—"}</span></div>
        <div class="an-profile-field"><label>Team Role</label><span>${esc(p.teamRole) || "—"}</span></div>
        <div class="an-profile-field"><label>Team Reg. ID</label><span style="font-size:12px"><code>${esc(p.teamRegistrationId) || "—"}</code></span></div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger)">Could not load player profile.</div>`;
  }
}

function closeProfileModal() {
  const overlay = document.getElementById("an-profile-modal");
  if (overlay) overlay.classList.remove("open");
}

document.addEventListener("click", (e) => {
  const profileOverlay = document.getElementById("an-profile-modal");
  const addOverlay = document.getElementById("an-addplayer-modal");
  if (e.target === profileOverlay) closeProfileModal();
  if (e.target === addOverlay) addOverlay.classList.remove("open");
});

function openAddPlayerModal() {
  document.getElementById("an-addplayer-modal").classList.add("open");
  document.getElementById("an-addplayer-form").reset();
  const errEl = document.getElementById("ap-error");
  if (errEl) errEl.style.display = "none";
}

async function submitAddPlayer(e) {
  e.preventDefault();
  const errEl = document.getElementById("ap-error");
  const submitBtn = document.getElementById("ap-submit-btn");
  if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

  const data = {
    name: document.getElementById("ap-name").value.trim(),
    scholarNo: document.getElementById("ap-scholarNo").value.trim(),
    course: document.getElementById("ap-course").value.trim(),
    semester: document.getElementById("ap-semester").value.trim(),
    mandalName: document.getElementById("ap-mandal").value,
    gender: document.getElementById("ap-gender").value,
    phone: document.getElementById("ap-phone").value.trim(),
    email: document.getElementById("ap-email").value.trim(),
    sport: document.getElementById("ap-sport").value.trim(),
    teamRole: document.getElementById("ap-role").value
  };

  if (!data.name || !data.scholarNo) {
    if (errEl) { errEl.textContent = "Name and Scholar ID are required."; errEl.style.display = "block"; }
    return;
  }

  submitBtn.textContent = "Saving..."; submitBtn.disabled = true;

  try {
    const tk = localStorage.getItem("DSSL_token");
    const r = await fetch("/api/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
      body: JSON.stringify(data)
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Registration failed");

    document.getElementById("an-addplayer-modal").classList.remove("open");
    loadAllAnalytics();
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.style.display = "block"; }
  } finally {
    submitBtn.textContent = "Add Player"; submitBtn.disabled = false;
  }
}

async function syncGoogleSheets() {
  const btn = document.getElementById("an-sync-btn");
  const tk = localStorage.getItem("DSSL_token") || localStorage.getItem("dsspl_token");

  if (!tk) {
    alert("Authentication required: Please log in to the admin panel to sync Google Sheets.");
    return;
  }

  const defaultSheet = "https://docs.google.com/spreadsheets/d/1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU/export?format=csv&gid=0";
  const userUrl = prompt("Enter Google Sheet URL to sync (or leave blank to use default DSSL 2026 Sheet):", defaultSheet);

  if (userUrl === null) return; // User cancelled
  const targetUrl = userUrl.trim() || defaultSheet;

  if (btn) {
    btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Syncing...';
    btn.disabled = true;
  }

  try {
    const r = await fetch("/api/admin/import-sheets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tk}`
      },
      body: JSON.stringify({ sheetUrl: targetUrl })
    });

    const res = await r.json();
    if (!r.ok) throw new Error(res.error || "Sync failed");

    alert(res.message || `Successfully synced ${res.count} player records from Google Sheets.`);
    await loadAllAnalytics();
  } catch (err) {
    console.error("Google Sheets Sync Error:", err);
    alert("Sync error: " + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = '<i class="ri-refresh-line"></i> Sync Google Sheets';
      btn.disabled = false;
    }
  }
}

function destroyChart(id) {
  if (analyticsCharts[id]) {
    analyticsCharts[id].destroy();
    delete analyticsCharts[id];
  }
}

function getCSSVar(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#94a3b8";
}

function chartScales() {
  const muted = getCSSVar("--text-muted");
  const border = getCSSVar("--border-color");
  return {
    x: { ticks: { color: muted, font: { family: "Outfit", size: 11 } }, grid: { color: border + "40" } },
    y: { ticks: { color: muted, font: { family: "Outfit", size: 11 } }, grid: { color: border + "40" } }
  };
}

function chartDefaults(extraScales = {}) {
  const { x, y } = chartScales();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,.08)",
        borderWidth: 1,
        padding: 10,
        titleFont: { family: "Outfit", weight: "bold" },
        bodyFont: { family: "Outfit" }
      }
    },
    scales: { x: { ...x, ...(extraScales.x || {}) }, y: { ...y, ...(extraScales.y || {}) } }
  };
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || "—";
  return phone.slice(0, 2) + "•".repeat(Math.max(0, phone.length - 4)) + phone.slice(-2);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

window.loadTrend = loadTrend;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportPlayers = exportPlayers;
window.exportAnalyticsPDF = exportAnalyticsPDF;
window.exportPlayersPDF = exportPlayersPDF;
window.syncGoogleSheets = syncGoogleSheets;
window.debounceFilter = debounceFilter;
window.goPage = goPage;
window.openProfile = openProfile;
window.closeProfileModal = closeProfileModal;
window.openAddPlayerModal = openAddPlayerModal;
window.submitAddPlayer = submitAddPlayer;
