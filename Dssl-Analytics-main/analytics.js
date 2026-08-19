/**
 * DSSL Admin — Player & Team Analytics Dashboard Client Logic
 * analytics.js
 */

const MANDALS = ["Vashishta Mandal","Vishwamitra Mandal","Atrey Mandal","Gautam Mandal","Bharadwaj Mandal","Jamdagni Mandal","Kashyap Mandal"];
const COURSES = ["BA English","BA Hindi","BA History","BA Music","BA Psychology","BA Sanskrit","BAJMC","BBA","BCA","B.Ed","BRS","B.Sc IT","B.Sc Maths","B.Sc Yogic Science","B.Voc","MA English","MA Hindi","MA History","MA Music","MA Psychology","MA Yoga Therapy (MA YT)","MAJMC","MBA","MCA","M.Sc HCYS","PhD"];
const SEMESTERS = ["1","2","3","4","5","6","7","8"];
const SPORTS = ["Basketball","Football","Cricket","Volleyball","Badminton","Badminton Singles","Table Tennis","Athletics (100 m)","Athletics (200 m)","Athletics (400 m)","Athletics (Relay Race)","Kho-Kho","Chess","7 Stones","Tug Of War","Long Jump","High Jump","Javelin Throw","Discus Throw","Shot Put"];
const GENDER_COLORS = { Male: "#3b82f6", Female: "#ec4899", Other: "#8b5cf6", Unknown: "#94a3b8" };
const MANDAL_COLORS = ["#ffbc01","#003e8a","#10b981","#ef4444","#8b5cf6","#f97316","#06b6d4"];

let analyticsCharts = {};
let analyticsFilters = { mandal: "", course: "", semester: "", gender: "", sport: "", search: "", page: 1 };
let analyticsTimer = null;

async function anApiCall(url) {
  const tk = localStorage.getItem("dsspl_token");
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
      const dt = new Date(d.date);
      return `${dt.getDate()}/${dt.getMonth()+1}`;
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
          backgroundColor: data.map((_, i) => `hsl(${120 + i*30},70%,55%)`),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: chartDefaults({ y: { beginAtZero: true } })
    });
  } catch (e) { console.error("Semester chart error:", e); }
}

async function loadSportChart() {
  try {
    const data = await anApiCall("/api/analytics/sport-distribution");
    destroyChart("an-chart-sport");
    const ctx = document.getElementById("an-chart-sport");
    if (!ctx) return;

    analyticsCharts["an-chart-sport"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => d.sport),
        datasets: [{
          label: "Players",
          data: data.map(d => d.count),
          backgroundColor: data.map((_, i) => `hsl(${i*19},70%,55%)`),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: chartDefaults()
    });
  } catch (e) { console.error("Sport chart error:", e); }
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
      const rankColor = i===0?"#ffbc01":i===1?"#94a3b8":i===2?"#f97316":"var(--bg-primary)";
      const rankText = i===0?"#000":i===1?"#000":i===2?"#000":"var(--text-muted)";
      return `<tr>
        <td><span style="width:26px;height:26px;border-radius:50%;background:${rankColor};color:${rankText};display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${i+1}</span></td>
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
  analyticsFilters = { mandal:"",course:"",semester:"",gender:"",sport:"",search:"",page:1 };
  const ids = ["an-filter-mandal","an-filter-course","an-filter-semester","an-filter-gender","an-filter-sport"];
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
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
    .then(r => r.blob()).then(blob => {
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
                  <span class="an-pill" style="background:rgba(255,188,1,.15);color:var(--primary)">${esc(p.mandalName.replace(" Mandal",""))}</span>
                </td>
                <td>
                  <span class="an-pill" style="background:${GENDER_COLORS[p.gender]||"#94a3b8"}22;color:${GENDER_COLORS[p.gender]||"#94a3b8"}">${esc(p.gender)||"—"}</span>
                </td>
                <td>${esc(p.sport)||"—"}</td>
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
        Showing ${(page-1)*limit+1}–${Math.min(page*limit,total)} of ${total} players
      </div>
    `;

    if (paginationEl) {
      let pHtml = "";
      if (page > 1) pHtml += `<button class="an-page-btn" onclick="goPage(${page-1})"><i class="ri-arrow-left-s-line"></i></button>`;
      const start = Math.max(1, page-2), end = Math.min(totalPages, page+2);
      for (let i = start; i <= end; i++) {
        pHtml += `<button class="an-page-btn ${i===page?"active":""}" onclick="goPage(${i})">${i}</button>`;
      }
      if (page < totalPages) pHtml += `<button class="an-page-btn" onclick="goPage(${page+1})"><i class="ri-arrow-right-s-line"></i></button>`;
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
    const initials = (p.name || "?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
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
        <div class="an-profile-field"><label>Gender</label><span>${esc(p.gender)||"—"}</span></div>
        <div class="an-profile-field"><label>Course</label><span>${esc(p.course)||"—"}</span></div>
        <div class="an-profile-field"><label>Semester</label><span>${p.semester ? "Semester "+esc(p.semester) : "—"}</span></div>
        <div class="an-profile-field"><label>Phone</label><span>${esc(p.phone)||"—"}</span></div>
        <div class="an-profile-field"><label>Email</label><span style="word-break:break-all;font-size:13px">${esc(p.email)||"—"}</span></div>
      </div>

      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:0 0 .75rem">Sports Information</h4>
      <div class="an-profile-grid">
        <div class="an-profile-field"><label>Mandal</label><span>${esc(p.mandalName)||"—"}</span></div>
        <div class="an-profile-field"><label>Sport</label><span>${esc(p.sport)||"—"}</span></div>
        <div class="an-profile-field"><label>Team Role</label><span>${esc(p.teamRole)||"—"}</span></div>
        <div class="an-profile-field"><label>Team Reg. ID</label><span style="font-size:12px"><code>${esc(p.teamRegistrationId)||"—"}</code></span></div>
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
    const r = await fetch("/api/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (btn) {
    btn.innerHTML = '<i class="ri-loader-4-line"></i> Syncing...';
    btn.disabled = true;
  }
  try {
    const r = await fetch("/api/admin/import-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl: "https://docs.google.com/spreadsheets/d/1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU/export?format=csv&gid=0" })
    });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || "Sync failed");

    alert(res.message || `Successfully synced ${res.count} records from Google Sheets.`);
    loadAllAnalytics();
  } catch (err) {
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
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || "—";
  return phone.slice(0,2) + "•".repeat(Math.max(0, phone.length-4)) + phone.slice(-2);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return "—"; }
}

window.loadTrend = loadTrend;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportPlayers = exportPlayers;
window.syncGoogleSheets = syncGoogleSheets;
window.debounceFilter = debounceFilter;
window.goPage = goPage;
window.openProfile = openProfile;
window.closeProfileModal = closeProfileModal;
window.openAddPlayerModal = openAddPlayerModal;
window.submitAddPlayer = submitAddPlayer;
