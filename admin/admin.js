// Auth Verification
const token = localStorage.getItem("dsspl_token");
const user = JSON.parse(localStorage.getItem("dsspl_user") || "null");

if (!token || !user) {
  logout();
}

// Global state
let activeMatch = null;
let timerInterval = null;
let allMatches = [];
let allDals = [];

// Sports Catalogue Matching Scoreboard Client
const SPORTS = [
  { id: 1, name: "Basketball", icon: "🏀" },
  { id: 2, name: "Football", icon: "⚽" },
  { id: 3, name: "Cricket", icon: "🏏" },
  { id: 4, name: "Volleyball", icon: "🏐" },
  { id: 5, name: "Badminton (Doubles)", icon: "🏸" },
  { id: 6, name: "Table Tennis", icon: "🏓" },
  { id: 7, name: "Athletics (100m)", icon: "🏃" },
  { id: 8, name: "Athletics (400m)", icon: "🏃" },
  { id: 9, name: "Athletics (Relay)", icon: "🔁" },
  { id: 10, name: "Kho-Kho", icon: "🤸" },
  { id: 11, name: "Chess", icon: "♟️" },
  { id: 12, name: "High Jump", icon: "🏋️" },
  { id: 13, name: "Tug of War", icon: "💪" },
  { id: 14, name: "Long Jump", icon: "🦘" },
  { id: 15, name: "Javelin Throw", icon: "🎿" },
  { id: 16, name: "Discus Throw", icon: "🥏" },
  { id: 17, name: "Shot Put", icon: "⚫" },
  { id: 18, name: "Athletics (200m)", icon: "🏃" },
  { id: 19, name: "7 Stones", icon: "🪨" },
  { id: 20, name: "Kabaddi", icon: "🤼" }
];

// Socket.IO Init
const socket = io();

// Set up UI Profiles
document.getElementById("profileName").textContent = user.username;
document.getElementById("profileRole").textContent = user.role.replace("_", " ");
document.getElementById("avatarName").textContent = user.username.substring(0, 2).toUpperCase();

// Theme Toggle Setup
const themeToggleBtn = document.getElementById("themeToggleBtn");
const savedTheme = localStorage.getItem("admin_theme") || "dark";
document.body.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("admin_theme", newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector("i");
  if (theme === "light") {
    icon.className = "ri-moon-line";
  } else {
    icon.className = "ri-sun-line";
  }
}

// RBAC: Sidebar Visibility Filters
const sidebarItems = document.querySelectorAll(".sidebar-menu .menu-item");
sidebarItems.forEach((item) => {
  const access = item.getAttribute("data-access");
  if (access === "ALL") return;

  if (user.role === "SUPER_ADMIN") return; // Super admin has full visibility

  if (access === "ORGANISER" && user.role === "ORGANISER_TEAM") return;
  if (access === "CREATOR" && user.role === "CREATOR_TEAM") return;
  if (access === "MEDIA" && user.role === "MEDIA_TEAM") return;

  item.style.display = "none"; // Hide disallowed tabs
});

// Tab Navigation
const tabButtons = document.querySelectorAll(".menu-btn");
const tabContents = document.querySelectorAll(".tab-content");
const viewTitle = document.getElementById("viewTitle");
const sidebar = document.getElementById("sidebar");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Mobile side-bar collapse on select
    sidebar.classList.remove("open");

    const tab = btn.getAttribute("data-tab");
    
    // Set active button
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Set active pane
    tabContents.forEach(c => c.classList.remove("active"));
    const activePane = document.getElementById(`tab-${tab}`);
    activePane.classList.add("active");

    // Update Header Title
    viewTitle.textContent = btn.querySelector("span").textContent;

    // Load data for selected view
    loadTabData(tab);
  });
});

// Mobile Sidebar Toggles
document.getElementById("openSidebarBtn").addEventListener("click", () => {
  sidebar.classList.add("open");
});
document.getElementById("closeSidebarBtn").addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// Logout Event
document.getElementById("logoutBtn").addEventListener("click", logout);

function logout() {
  localStorage.removeItem("dsspl_token");
  localStorage.removeItem("dsspl_user");
  window.location.href = "login.html";
}

// ── API Caller Helper ─────────────────────────────────────────────────────────
async function apiCall(url, options = {}) {
  const headers = options.headers || {};
  headers["Authorization"] = `Bearer ${token}`;
  
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    logout();
  }
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Request failed");
  }

  return response.json();
}

// ── Load Data Functions ───────────────────────────────────────────────────────

async function loadTabData(tab) {
  try {
    switch (tab) {
      case "dashboard":
        await loadMatches();
        renderDashboard();
        break;
      case "match-control":
        await loadMatches();
        populateScorerSelect();
        break;
      case "scheduling":
        await loadDals();
        await loadMatches();
        renderSchedulingList();
        break;
      case "teams":
        await loadDals();
        renderTeamsList();
        break;
      case "news":
        await loadNews();
        break;
      case "media":
        await loadMedia();
        break;
      case "users":
        await loadUsers();
        break;
      case "registration-settings":
        renderRegistrationControl();
        await loadRegistrationSettings();
        break;
      case "fixtures":
        await loadDals();
        await loadMatches();
        initFixturesModule();
        break;
      case "scoreboard":
        const iframe = document.getElementById("scoreboardIframe");
        if (iframe) {
          iframe.src = iframe.src;
        }
        break;
    }
  } catch (error) {
    console.error("Tab load error:", error);
  }
}

// Fetch lists
async function loadMatches() {
  allMatches = await apiCall("/api/matches");
}

async function loadDals() {
  allDals = await apiCall("/api/mandals");
}

async function loadNews() {
  const news = await apiCall("/api/news");
  const tbody = document.getElementById("newsList");
  tbody.innerHTML = "";
  
  news.forEach((post) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${post.title}</strong></td>
      <td>${post.author.username}</td>
      <td>${new Date(post.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteNews(${post.id})">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadMedia() {
  const mediaList = await apiCall("/api/media");
  const tbody = document.getElementById("mediaList");
  if (!tbody) return;
  tbody.innerHTML = "";

  mediaList.forEach((media) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${media.type === "IMAGE" 
          ? `<img src="${media.url}" style="height: 35px; border-radius: 4px; object-fit: cover;">` 
          : `<i class="ri-video-line" style="font-size: 24px; color: var(--primary)"></i>`}
      </td>
      <td>${media.title || "Untitled"}</td>
      <td><span class="badge badge-paused">${media.type}</span></td>
      <td><a href="${media.url}" target="_blank" style="color: var(--accent);">${media.url}</a></td>
      <td>${new Date(media.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-icon btn-danger btn-sm" onclick="deleteMedia(${media.id})" title="Delete media">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteMedia = async function(id) {
  if (!confirm("Are you sure you want to delete this media asset?")) return;
  try {
    await apiCall(`/api/media/${id}`, { method: "DELETE" });
    const activeTab = document.querySelector(".menu-btn.active")?.getAttribute("data-tab");
    if (activeTab === "dashboard") {
      renderDashboard();
    } else {
      await loadMedia();
    }
  } catch (error) {
    alert(error.message);
  }
};

async function loadUsers() {
  const tbody = document.getElementById("usersList");
  tbody.innerHTML = `
    <tr>
      <td>admin</td>
      <td><span class="badge badge-live">SUPER_ADMIN</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>organiser</td>
      <td><span class="badge badge-scheduled">ORGANISER_TEAM</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>creator</td>
      <td><span class="badge badge-paused">CREATOR_TEAM</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>media</td>
      <td><span class="badge badge-completed">MEDIA_TEAM</span></td>
      <td>System</td>
    </tr>
  `;
}

// ── Rendering Dynamic Dashboard Per Admin Role ───────────────────────────────

async function renderDashboard() {
  const roleBannerTitle = document.getElementById("roleBannerTitle");
  const roleBannerSubtitle = document.getElementById("roleBannerSubtitle");
  const roleBadge = document.getElementById("roleBadge");
  const statsGrid = document.getElementById("dashboardStatsGrid");
  const roleContent = document.getElementById("dashboardRoleContent");

  if (!statsGrid || !roleContent) return;

  if (user.role === "CREATOR_TEAM") {
    // 🎨 CREATOR ADMIN DASHBOARD (Media Gallery Feature Only)
    if (roleBannerTitle) roleBannerTitle.innerHTML = `<i class="ri-palette-line" style="color: #a855f7;"></i> Creator Admin Studio`;
    if (roleBannerSubtitle) roleBannerSubtitle.textContent = "Your workspace is optimized for Media Gallery & Asset Uploads.";
    if (roleBadge) { roleBadge.textContent = "CREATOR TEAM"; roleBadge.className = "badge badge-paused"; }

    let mediaList = [];
    try {
      mediaList = await apiCall("/api/media");
    } catch (e) { mediaList = []; }

    const totalMedia = mediaList.length;
    const imageCount = mediaList.filter(m => m.type === "IMAGE").length;
    const videoCount = mediaList.filter(m => m.type === "VIDEO").length;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Total Media Assets</h3>
          <div class="stat-number">${totalMedia}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(168, 85, 247, 0.1); color: #a855f7">
          <i class="ri-gallery-line"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Photos / Images</h3>
          <div class="stat-number">${imageCount}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(59, 130, 246, 0.1); color: #3b82f6">
          <i class="ri-image-2-line"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Video Clips</h3>
          <div class="stat-number">${videoCount}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444">
          <i class="ri-video-line"></i>
        </div>
      </div>
    `;

    roleContent.innerHTML = `
      <div class="section-card" style="margin-bottom: 2rem;">
        <div class="section-header">
          <h3><i class="ri-upload-cloud-2-line" style="color: var(--accent);"></i> Quick Upload Media Asset</h3>
        </div>
        <form id="dashMediaForm" enctype="multipart/form-data">
          <div class="form-grid">
            <div class="form-group">
              <label for="dashMediaFile">Select Image or Video</label>
              <input type="file" id="dashMediaFile" accept="image/*,video/*" required>
            </div>
            <div class="form-group">
              <label for="dashMediaTitle">Asset Caption / Title</label>
              <input type="text" id="dashMediaTitle" placeholder="e.g. Ceremony highlight photo">
            </div>
          </div>
          <button type="submit" class="btn" style="margin-top: 1rem;"><i class="ri-upload-cloud-line"></i> Upload Asset</button>
        </form>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3><i class="ri-image-line"></i> Recent Media Assets</h3>
          <button class="btn btn-secondary btn-sm" onclick="document.querySelector('.menu-btn[data-tab=\\'media\\']').click()">Go to Full Gallery</button>
        </div>
        <div class="media-preview-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-top: 1rem;">
          ${mediaList.length === 0 ? `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">No media assets uploaded yet</p>` : ''}
          ${mediaList.slice(0, 8).map(m => `
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
              ${m.type === 'IMAGE' 
                ? `<img src="${m.url}" style="width: 100%; height: 140px; object-fit: cover;">` 
                : `<div style="width: 100%; height: 140px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><i class="ri-video-line" style="font-size: 40px; color: var(--accent);"></i></div>`}
              <div style="padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;" title="${m.title || 'Untitled'}">${m.title || 'Untitled'}</div>
                <button class="btn btn-icon btn-danger btn-sm" onclick="deleteMedia(${m.id})" title="Delete media">
                  <i class="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById("dashMediaForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("dashMediaFile");
      const titleInput = document.getElementById("dashMediaTitle");

      if (!fileInput.files[0]) return;
      const formData = new FormData();
      formData.append("file", fileInput.files[0]);
      formData.append("title", titleInput.value);

      try {
        await apiCall("/api/media/upload", { method: "POST", body: formData });
        alert("Media uploaded successfully.");
        renderDashboard();
      } catch (err) { alert(err.message); }
    });

  } else if (user.role === "MEDIA_TEAM") {
    // 📰 MEDIA ADMIN DASHBOARD (Post News Feature Only)
    if (roleBannerTitle) roleBannerTitle.innerHTML = `<i class="ri-newspaper-line" style="color: #10b981;"></i> Media Admin Operations`;
    if (roleBannerSubtitle) roleBannerSubtitle.textContent = "Your workspace is optimized for Publishing News & Announcements.";
    if (roleBadge) { roleBadge.textContent = "MEDIA TEAM"; roleBadge.className = "badge badge-completed"; }

    let news = [];
    try {
      news = await apiCall("/api/news");
    } catch (e) { news = []; }

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Published News Posts</h3>
          <div class="stat-number">${news.length}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(16, 185, 129, 0.1); color: #10b981">
          <i class="ri-news-line"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>News Status</h3>
          <div class="stat-number">${news.length > 0 ? 'ACTIVE' : 'READY'}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(59, 130, 246, 0.1); color: #3b82f6">
          <i class="ri-broadcast-line"></i>
        </div>
      </div>
    `;

    roleContent.innerHTML = `
      <div class="section-card" style="margin-bottom: 2rem;">
        <div class="section-header">
          <h3><i class="ri-quill-pen-line" style="color: var(--accent);"></i> Create & Post News Article</h3>
        </div>
        <form id="dashNewsForm">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="dashNewsTitle">Article Title</label>
            <input type="text" id="dashNewsTitle" placeholder="Headline / Article Title" required>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="dashNewsContent">Article Content</label>
            <textarea id="dashNewsContent" rows="4" placeholder="Write article content..." required></textarea>
          </div>
          <button type="submit" class="btn"><i class="ri-send-plane-line"></i> Publish News</button>
        </form>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3><i class="ri-history-line"></i> Recent Published Posts</h3>
          <button class="btn btn-secondary btn-sm" onclick="document.querySelector('.menu-btn[data-tab=\\'news\\']').click()">Manage News</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${news.length === 0 ? `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No news published yet</td></tr>` : ''}
              ${news.slice(0, 10).map(p => `
                <tr>
                  <td><strong>${p.title}</strong></td>
                  <td>${p.author ? p.author.username : 'Media Team'}</td>
                  <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-icon btn-danger btn-sm" onclick="deleteNews(${p.id})">
                      <i class="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("dashNewsForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("dashNewsTitle").value;
      const content = document.getElementById("dashNewsContent").value;
      try {
        await apiCall("/api/news", { method: "POST", body: JSON.stringify({ title, content }) });
        alert("News published successfully.");
        renderDashboard();
      } catch (err) { alert(err.message); }
    });

  } else {
    // 🏆 ORGANISER OR SUPER ADMIN DASHBOARD
    if (roleBannerTitle) roleBannerTitle.innerHTML = user.role === "SUPER_ADMIN"
      ? `<i class="ri-shield-flash-line" style="color: var(--accent);"></i> Super Admin Master Control`
      : `<i class="ri-trophy-line" style="color: var(--accent);"></i> Tournament Operations`;
    if (roleBannerSubtitle) roleBannerSubtitle.textContent = user.role === "SUPER_ADMIN"
      ? "Full system administrative control across all operations."
      : "Manage live match scores, schedules, and team fixtures.";
    if (roleBadge) {
      roleBadge.textContent = user.role.replace("_", " ");
      roleBadge.className = user.role === "SUPER_ADMIN" ? "badge badge-live" : "badge badge-scheduled";
    }

    const liveCount = allMatches.filter(m => m.status === "live").length;
    const scheduledCount = allMatches.filter(m => m.status === "scheduled").length;
    const completedCount = allMatches.filter(m => m.status === "completed").length;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Live Matches</h3>
          <div class="stat-number">${liveCount}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(239, 68, 68, 0.1); color: var(--danger)">
          <i class="ri-broadcast-line"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Total Scheduled</h3>
          <div class="stat-number">${scheduledCount}</div>
        </div>
        <div class="stat-icon">
          <i class="ri-calendar-todo-line"></i>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-left">
          <h3>Completed Games</h3>
          <div class="stat-number">${completedCount}</div>
        </div>
        <div class="stat-icon" style="background-color: rgba(16, 185, 129, 0.1); color: var(--success)">
          <i class="ri-verified-badge-line"></i>
        </div>
      </div>
    `;

    roleContent.innerHTML = `
      <div class="section-card">
        <div class="section-header">
          <h3>Live Scored Matches</h3>
          <span class="badge badge-live">Realtime Sync</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Sport</th>
                <th>Match details</th>
                <th>Venue</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="dashboardLiveMatchesList">
              <!-- Live matches -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = document.getElementById("dashboardLiveMatchesList");
    if (tbody) {
      const liveMatches = allMatches.filter(m => m.status === "live");
      if (liveMatches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No live matches running</td></tr>`;
      } else {
        tbody.innerHTML = "";
        liveMatches.forEach((m) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${m.sportName}</strong></td>
            <td>${m.dalA.name} VS ${m.dalB.name}</td>
            <td>${m.venue}</td>
            <td><span style="font-weight: 700; color: var(--accent); font-size: 16px;">${m.scoreA} : ${m.scoreB}</span></td>
            <td><span class="badge badge-live">Live</span></td>
            <td>
              <button class="btn btn-secondary" onclick="openScorerPanel(${m.id})">Scoring Control</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  }
}

function openScorerPanel(id) {
  const btn = document.querySelector(".menu-btn[data-tab='match-control']");
  if (btn) {
    btn.click();
    setTimeout(() => {
      document.getElementById("scorerMatchSelect").value = id;
      document.getElementById("scorerMatchSelect").dispatchEvent(new Event("change"));
    }, 100);
  }
}

// ── Rendering Scheduling List ────────────────────────────────────────────────

function renderSchedulingList() {
  const tbody = document.getElementById("scheduleMatchesList");
  tbody.innerHTML = "";

  allMatches.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.sportName}</strong></td>
      <td>${m.dalA.name} VS ${m.dalB.name}</td>
      <td>${m.venue}</td>
      <td>${new Date(m.createdAt).toLocaleDateString()}</td>
      <td><span class="badge badge-${m.status}">${m.status}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${m.status !== "live" && m.status !== "completed" ? `
            <button class="btn btn-icon" title="Start Live" onclick="setMatchStatus(${m.id}, 'live')">
              <i class="ri-play-fill" style="color: var(--success)"></i>
            </button>
          ` : ""}
          <button class="btn btn-icon btn-danger" onclick="deleteMatch(${m.id})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTeamsList() {
  const tbody = document.getElementById("teamsList");
  tbody.innerHTML = "";

  allDals.forEach((mandal) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${mandal.abbreviation}</strong></td>
      <td>${mandal.name}</td>
      <td><span style="display: inline-block; width: 15px; height: 15px; border-radius: 50%; background-color: ${mandal.color}"></span></td>
      <td>${mandal.logoUrl}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Scorer Panel Logic ────────────────────────────────────────────────────────

const scorerMatchSelect = document.getElementById("scorerMatchSelect");
const scorerPanel = document.getElementById("scorerPanel");

function populateScorerSelect() {
  scorerMatchSelect.innerHTML = `<option value="">-- No Active Match Selected --</option>`;
  
  // Show active or scheduled matches
  allMatches.filter(m => m.status !== "completed").forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = `${m.sportName}: ${m.dalA.name} vs ${m.dalB.name} (${m.status})`;
    scorerMatchSelect.appendChild(option);
  });

  if (activeMatch) {
    scorerMatchSelect.value = activeMatch.id;
  }
}

scorerMatchSelect.addEventListener("change", async (e) => {
  const val = e.target.value;
  if (!val) {
    scorerPanel.style.display = "none";
    activeMatch = null;
    stopTimerDisplay();
    return;
  }

  try {
    activeMatch = await apiCall(`/api/matches/${val}`);
    renderScorerPanel();
    scorerPanel.style.display = "block";
  } catch (error) {
    console.error("Match fetch failed:", error);
  }
});

function renderScorerPanel() {
  if (!activeMatch) return;
  
  document.getElementById("scorerTeamAName").textContent = activeMatch.dalA.name;
  document.getElementById("scorerTeamBName").textContent = activeMatch.dalB.name;
  document.getElementById("scorerTeamAScore").textContent = activeMatch.scoreA;
  document.getElementById("scorerTeamBScore").textContent = activeMatch.scoreB;

  // Cricket fields
  document.getElementById("cricketOvers").value = activeMatch.overs ?? 0.0;
  document.getElementById("cricketWickets").value = activeMatch.wickets ?? 0;
  document.getElementById("cricketBatsman").value = activeMatch.currentBatsman ?? "";
  document.getElementById("cricketBowler").value = activeMatch.currentBowler ?? "";
  document.getElementById("cricketRunRate").value = activeMatch.runRate ?? 0.0;
  document.getElementById("matchTournament").value = activeMatch.tournamentName ?? "DSSPL 2026";
  document.getElementById("matchResult").value = activeMatch.result ?? "";
  document.getElementById("matchBanner").value = activeMatch.matchBanner ?? "";

  // Show banner preview if exists
  const bannerPreview = document.getElementById("matchBannerPreview");
  const bannerFileInput = document.getElementById("matchBannerFile");
  bannerFileInput.value = ""; // Reset file input
  if (activeMatch.matchBanner) {
    bannerPreview.innerHTML = `<img src="${activeMatch.matchBanner}" style="height: 50px; border-radius: 6px; border: 1px solid var(--border-color);">`;
  } else {
    bannerPreview.innerHTML = '';
  }

  // Timer Setup
  startTimerDisplay();
}

function startTimerDisplay() {
  stopTimerDisplay();
  
  const timerLabel = document.getElementById("scorerTimer");
  
  const updateTimer = () => {
    if (!activeMatch) return;
    
    let seconds = activeMatch.elapsedSeconds;
    if (activeMatch.timerRunning && activeMatch.timerStartedAt) {
      const now = Date.now();
      seconds += Math.max(0, Math.floor((now - activeMatch.timerStartedAt) / 1000));
    }
    
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerLabel.textContent = `${m}:${s}`;
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimerDisplay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Global Adjust Score Trigger with 0ms Instant Optimistic UI Updates
window.adjustScore = async function(side, delta) {
  if (!activeMatch) return;

  // ⚡ Optimistic UI Update: Instantly update screen score in 0ms!
  if (side === "A") {
    activeMatch.scoreA = Math.max(0, (activeMatch.scoreA || 0) + delta);
  } else if (side === "B") {
    activeMatch.scoreB = Math.max(0, (activeMatch.scoreB || 0) + delta);
  }
  document.getElementById("scorerTeamAScore").textContent = activeMatch.scoreA;
  document.getElementById("scorerTeamBScore").textContent = activeMatch.scoreB;

  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/score`, {
      method: "POST",
      body: JSON.stringify({ side, delta })
    });
    activeMatch = updated;
    renderScorerPanel();
  } catch (error) {
    alert(error.message);
  }
};

// Timer Trigger Controls with instant state reflection
document.getElementById("scorerStartBtn").addEventListener("click", () => setTimerStatus("live"));
document.getElementById("scorerPauseBtn").addEventListener("click", () => setTimerStatus("paused"));
document.getElementById("scorerResetTimerBtn").addEventListener("click", () => setTimerStatus("reset_timer"));
document.getElementById("scorerCompleteBtn").addEventListener("click", () => setTimerStatus("completed"));

async function setTimerStatus(status) {
  if (!activeMatch) return;

  // Optimistically reflect status locally
  if (status === "live") {
    activeMatch.status = "live";
    activeMatch.timerRunning = true;
  } else if (status === "paused") {
    activeMatch.status = "paused";
    activeMatch.timerRunning = false;
  } else if (status === "reset_timer") {
    activeMatch.elapsedSeconds = 0;
  }
  startTimerDisplay();

  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    activeMatch = updated;
    renderScorerPanel();
    
    if (status === "completed") {
      activeMatch = null;
      scorerMatchSelect.value = "";
      scorerPanel.style.display = "none";
      stopTimerDisplay();
      await loadMatches();
      populateScorerSelect();
    }
  } catch (error) {
    alert(error.message);
  }
}

// Save detailed scoring data with non-blocking feedback
document.getElementById("cricketDetailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeMatch) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
  submitBtn.disabled = true;

  const data = {
    overs: document.getElementById("cricketOvers").value,
    wickets: document.getElementById("cricketWickets").value,
    currentBatsman: document.getElementById("cricketBatsman").value,
    currentBowler: document.getElementById("cricketBowler").value,
    runRate: document.getElementById("cricketRunRate").value,
    tournamentName: document.getElementById("matchTournament").value,
    result: document.getElementById("matchResult").value,
    matchBanner: document.getElementById("matchBanner").value,
  };

  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/cricket`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    activeMatch = updated;
    submitBtn.innerHTML = '<i class="ri-check-line"></i> Saved!';
    submitBtn.style.backgroundColor = 'var(--success)';
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.style.backgroundColor = '';
      submitBtn.disabled = false;
    }, 1500);
  } catch (error) {
    alert(error.message);
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// Auto-upload match banner when file is selected — saves to uploads/ folder + PostgreSQL
document.getElementById("matchBannerFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById("matchBannerPreview");
  preview.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">Uploading...</span>';

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", "Match Banner - " + (activeMatch ? activeMatch.sportName : "Unknown"));

  try {
    const media = await apiCall("/api/upload", {
      method: "POST",
      body: formData
    });
    document.getElementById("matchBanner").value = media.url;
    preview.innerHTML = `<img src="${media.url}" style="height: 50px; border-radius: 6px; border: 1px solid var(--border-color);">`;
  } catch (error) {
    preview.innerHTML = `<span style="color: #ef4444; font-size: 12px;">Upload failed: ${error.message}</span>`;
  }
});

// Delete match function
window.deleteMatch = async function(id) {
  if (!confirm("Are you sure you want to delete this match?")) return;
  try {
    await apiCall(`/api/matches/${id}`, { method: "DELETE" });
    await loadMatches();
    if (activeMatch && activeMatch.id == id) {
      activeMatch = null;
      scorerPanel.style.display = "none";
      stopTimerDisplay();
    }
    loadTabData(document.querySelector(".menu-btn.active").getAttribute("data-tab"));
  } catch (error) {
    alert(error.message);
  }
};

// Start Match Schedule function
window.setMatchStatus = async function(id, status) {
  try {
    await apiCall(`/api/matches/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    await loadMatches();
    loadTabData(document.querySelector(".menu-btn.active").getAttribute("data-tab"));
  } catch (error) {
    alert(error.message);
  }
};

// ── Modals Logic ──────────────────────────────────────────────────────────────
const newMatchModal = document.getElementById("newMatchModal");
const openNewMatchModalBtn = document.getElementById("openNewMatchModalBtn");
const closeNewMatchModalBtn = document.getElementById("closeNewMatchModalBtn");
const cancelNewMatchBtn = document.getElementById("cancelNewMatchBtn");

if (openNewMatchModalBtn) {
  openNewMatchModalBtn.addEventListener("click", async () => {
    // Fill select selectors
    const sportSelect = document.getElementById("matchSport");
    sportSelect.innerHTML = SPORTS.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join("");

    const dalASelect = document.getElementById("matchDalA");
    const dalBSelect = document.getElementById("matchDalB");
    dalASelect.innerHTML = allDals.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    dalBSelect.innerHTML = allDals.map(d => `<option value="${d.id}">${d.name}</option>`).join("");

    newMatchModal.style.display = "flex";
  });
}

const closeModal = () => { newMatchModal.style.display = "none"; };
if (closeNewMatchModalBtn) closeNewMatchModalBtn.addEventListener("click", closeModal);
if (cancelNewMatchBtn) cancelNewMatchBtn.addEventListener("click", closeModal);

document.getElementById("newMatchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const sportId = document.getElementById("matchSport").value;
  const sport = SPORTS.find(s => s.id == sportId);
  const venue = document.getElementById("matchVenue").value;
  const dalAId = document.getElementById("matchDalA").value;
  const dalBId = document.getElementById("matchDalB").value;
  const duration = document.getElementById("matchDuration").value;
  const isLive = document.getElementById("matchIsLive").value === "true";

  if (dalAId === dalBId) {
    alert("Mandals must be unique teams!");
    return;
  }

  try {
    await apiCall("/api/matches", {
      method: "POST",
      body: JSON.stringify({
        sportId,
        sportName: sport.name,
        venue,
        dalAId,
        dalBId,
        durationMinutes: duration,
        isLive
      })
    });
    closeModal();
    await loadMatches();
    loadTabData("scheduling");
  } catch (error) {
    alert(error.message);
  }
});

// ── News and Content management ───────────────────────────────────────────────

document.getElementById("newsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("newsTitle").value;
  const content = document.getElementById("newsContent").value;

  try {
    await apiCall("/api/news", {
      method: "POST",
      body: JSON.stringify({ title, content })
    });
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsContent").value = "";
    await loadNews();
    alert("Article published successfully.");
  } catch (error) {
    alert(error.message);
  }
});

window.deleteNews = async function(id) {
  if (!confirm("Are you sure you want to delete this news post?")) return;
  try {
    await apiCall(`/api/news/${id}`, { method: "DELETE" });
    await loadNews();
  } catch (error) {
    alert(error.message);
  }
};

// ── Media Upload Actions ───────────────────────────────────────────────────────

document.getElementById("mediaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("mediaFile");
  const titleInput = document.getElementById("mediaTitle");

  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("title", titleInput.value);

  try {
    await apiCall("/api/media/upload", {
      method: "POST",
      body: formData
    });
    fileInput.value = "";
    titleInput.value = "";
    await loadMedia();
    alert("Media asset uploaded successfully.");
  } catch (error) {
    alert(error.message);
  }
});

// ── Realtime Socket Sync ──────────────────────────────────────────────────────

socket.on("matchUpdate", (data) => {
  console.log("Realtime matchUpdate event received:", data);
  
  // Update in global match cache
  const idx = allMatches.findIndex(m => m.id.toString() == data.id.toString());
  if (idx !== -1) {
    allMatches[idx] = data;
  } else {
    allMatches.unshift(data);
  }

  // Update Scorer Panel if currently viewing this match
  if (activeMatch && activeMatch.id.toString() == data.id.toString()) {
    activeMatch = data;
    renderScorerPanel();
  }

  // Update active views
  const activeTab = document.querySelector(".menu-btn.active").getAttribute("data-tab");
  if (activeTab === "dashboard") {
    renderDashboard();
  } else if (activeTab === "scheduling") {
    renderSchedulingList();
  } else if (activeTab === "match-control") {
    populateScorerSelect();
  }
});

socket.on("matchDelete", (matchId) => {
  console.log("Realtime matchDelete event received:", matchId);
  allMatches = allMatches.filter(m => m.id.toString() != matchId.toString());
  if (activeMatch && activeMatch.id.toString() == matchId.toString()) {
    activeMatch = null;
    scorerPanel.style.display = "none";
    stopTimerDisplay();
  }
  const activeTab = document.querySelector(".menu-btn.active").getAttribute("data-tab");
  loadTabData(activeTab);
});

socket.on("newsUpdate", () => {
  if (document.querySelector(".menu-btn.active").getAttribute("data-tab") === "news") {
    loadNews();
  }
});

socket.on("mediaUpdate", () => {
  if (document.querySelector(".menu-btn.active").getAttribute("data-tab") === "media") {
    loadMedia();
  }
});

// Load Initial tab
loadTabData("dashboard");

// ── FIXTURES MODULE IMPLEMENTATION ─────────────────────────────────────────────

// Module State
let activeFixtureFormat = "single-elimination";
let generatedFixtures = [];
let fixtureTeams = [];
let bracketZoomScale = 1.0;
let bracketTranslate = { x: 0, y: 0 };
let isBracketDragging = false;
let bracketDragStart = { x: 0, y: 0 };

// Helper to switch tab programmatically (used by breadcrumb)
function switchAdminTab(tabName) {
  const btn = document.querySelector(`.menu-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
}

function getBaseFixtureTeams() {
  if (allDals && allDals.length > 0) {
    return allDals.map(d => ({
      id: d.id,
      name: d.name,
      abbr: (d.abbr || d.name.substring(0, 2)).toUpperCase(),
      logo: (d.abbr || d.name.substring(0, 2)).toUpperCase()
    }));
  }
  return [
    { id: 1, name: "Chanakya Mandal",   abbr: "CK", logo: "CK" },
    { id: 2, name: "Atrey Mandal",       abbr: "AT", logo: "AT" },
    { id: 3, name: "Bharadwaj Mandal",   abbr: "BH", logo: "BH" },
    { id: 4, name: "Gautam Mandal",      abbr: "GA", logo: "GA" },
    { id: 5, name: "Jamdagni Mandal",    abbr: "JM", logo: "JM" },
    { id: 6, name: "Kashyap Mandal",     abbr: "KS", logo: "KS" },
    { id: 7, name: "Vishwamitra Mandal", abbr: "VM", logo: "VM" }
  ];
}

function updateTeamsForCount(count) {
  const base = getBaseFixtureTeams();
  let num = parseInt(count, 10);
  if (isNaN(num) || num < 2) num = 2;
  if (num > 64) num = 64;

  let teams = [];
  for (let i = 0; i < num; i++) {
    if (i < base.length) {
      teams.push({ ...base[i] });
    } else {
      teams.push({
        id: i + 1,
        name: `Team ${i + 1}`,
        abbr: `T${i + 1}`,
        logo: `T${i + 1}`
      });
    }
  }
  fixtureTeams = teams;
}

// ── Initialize Fixtures Module ────────────────────────────────────────────────
function initFixturesModule() {
  const countEl = document.getElementById("fixtureFilterTeamCount");
  const base = getBaseFixtureTeams();
  if (countEl && (!countEl.value || parseInt(countEl.value, 10) <= 0)) {
    countEl.value = base.length;
  }
  setupBracketDragEvents();
  onFixtureFilterChange();
}

// ── Filter Change Handler ─────────────────────────────────────────────────────
function onFixtureFilterChange() {
  const formatEl = document.getElementById("fixtureFilterFormat");
  const countEl  = document.getElementById("fixtureFilterTeamCount");
  if (!formatEl) return;

  if (countEl && countEl.value) {
    updateTeamsForCount(countEl.value);
  } else {
    fixtureTeams = getBaseFixtureTeams();
  }

  const format = formatEl.value;
  activeFixtureFormat = format;
  renderBracketForFormat(format);
}

function onFixtureFormatSelect(val) {
  onFixtureFilterChange();
}

// ── Route to correct bracket renderer ────────────────────────────────────────
function renderBracketForFormat(format) {
  const teams = [...fixtureTeams];
  let nextPow2 = 1;
  while (nextPow2 < teams.length) nextPow2 *= 2;
  if (nextPow2 < 2) nextPow2 = 2;
  const byes = nextPow2 - teams.length;

  // Update BYE badge
  const byeBadge = document.getElementById("fixtureByeBadge");
  if (byeBadge) {
    if (format === "league") {
      byeBadge.textContent = `⚡ Round Robin`;
    } else if (format === "group-knockout") {
      byeBadge.textContent = `⚡ Group + KO`;
    } else {
      byeBadge.textContent = `⚡ ${byes} BYE${byes === 1 ? '' : 's'}`;
    }
  }
  const printByes = document.getElementById("printByes");
  if (printByes) printByes.textContent = format === "league" || format === "group-knockout" ? "—" : byes;
  const printTeams = document.getElementById("printTotalTeams");
  if (printTeams) printTeams.textContent = teams.length;

  if (format === "single-elimination" || format === "double-elimination") {
    generatedFixtures = buildKnockoutMatches(teams, byes, format === "double-elimination");
    renderKnockoutBracket(generatedFixtures, format);
  } else if (format === "league") {
    generatedFixtures = buildLeagueRoundMatches(teams);
    renderLeagueBlankBracket(generatedFixtures, teams);
  } else if (format === "group-knockout") {
    generatedFixtures = buildGroupKnockoutMatches(teams);
    renderGroupKnockoutBlankBracket(generatedFixtures, teams);
  }

  setTimeout(drawBracketConnectors, 50);
}

// ── Match Builders ────────────────────────────────────────────────────────────

function buildKnockoutMatches(teams, byes, isDouble) {
  const numTeams = teams.length;
  let nextPow2 = 1;
  while (nextPow2 < numTeams) nextPow2 *= 2;
  if (nextPow2 < 2) nextPow2 = 2;

  const totalByes = nextPow2 - numTeams;
  const numRounds = Math.round(Math.log2(nextPow2));

  // Determine round titles
  let roundNames = [];
  if (numRounds === 1) {
    roundNames = ["Final"];
  } else if (numRounds === 2) {
    roundNames = ["Semi Finals", "Final"];
  } else if (numRounds === 3) {
    roundNames = ["Round 1", "Semi Finals", "Final"];
  } else if (numRounds === 4) {
    roundNames = ["Round 1", "Quarter Finals", "Semi Finals", "Final"];
  } else if (numRounds === 5) {
    roundNames = ["Round 1", "Round 2", "Quarter Finals", "Semi Finals", "Final"];
  } else {
    roundNames = ["Round 1", "Round 2", "Round 3", "Quarter Finals", "Semi Finals", "Final"];
  }

  const matches = [];
  let mid = 1;

  for (let r = 0; r < numRounds; r++) {
    const rName = roundNames[r] || `Round ${r + 1}`;
    const slots = Math.pow(2, numRounds - 1 - r);

    for (let s = 0; s < slots; s++) {
      const isR1 = (r === 0);
      const isByeMatch = isR1 && (s < totalByes);

      matches.push({
        id: mid,
        matchNum: `M${String(mid).padStart(2, "0")}`,
        round: rName,
        label: rName,
        isBye: isByeMatch,
        status: isByeMatch ? "BYE" : "SCHEDULED"
      });
      mid++;
    }
  }

  if (isDouble) {
    matches.push(
      { id: 101, matchNum: "L01", round: "Losers R1", label: "Losers Bracket", isBye: false, status: "SCHEDULED" },
      { id: 102, matchNum: "L02", round: "Losers Final", label: "Losers Bracket", isBye: false, status: "SCHEDULED" }
    );
  }

  return matches;
}

function buildLeagueMatches(teams) {
  const venues = ["Main Ground", "Ground A", "Shriram Ground", "Gym Hall", "Vidyapeeth"];
  const matches = [];
  let mid = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: mid, matchNum: `L${String(mid).padStart(2,"0")}`,
        round: "League", label: "League Round Robin",
        teamA: teams[i], teamB: teams[j],
        winner: (mid % 2 === 0) ? teams[i] : teams[j],
        status: mid === 1 ? "COMPLETED" : (mid === 2 ? "LIVE" : "SCHEDULED"),
        date: `Aug ${10 + (mid % 6)}`, time: `${9 + (mid % 5)}:00 AM`, venue: venues[mid % venues.length]
      });
      mid++;
    }
  }
  return matches;
}

function buildGroupMatches(teams) {
  const venues = ["Main Ground", "Ground A", "Shriram Ground", "Gym Hall"];
  return [
    { id: 201, matchNum: "G01", round: "Group A", label: "Group A", teamA: teams[0], teamB: teams[1], winner: teams[0], status: "COMPLETED", date: "Aug 10", time: "10:00 AM", venue: venues[0] },
    { id: 202, matchNum: "G02", round: "Group B", label: "Group B", teamA: teams[2], teamB: teams[3], winner: teams[2], status: "LIVE",      date: "Aug 10", time: "12:00 PM", venue: venues[1] },
    { id: 203, matchNum: "G03", round: "Group C", label: "Group C", teamA: teams[4], teamB: teams[5] || teams[0], winner: teams[4], status: "SCHEDULED", date: "Aug 11", time: "09:00 AM", venue: venues[2] },
    { id: 204, matchNum: "G04", round: "Group D", label: "Group D", teamA: teams[6] || teams[1], teamB: teams[2], winner: teams[6] || teams[1], status: "SCHEDULED", date: "Aug 11", time: "11:00 AM", venue: venues[3] },
    { id: 205, matchNum: "SF1", round: "Semi Final 1", label: "Playoffs", teamA: teams[0], teamB: teams[2], winner: teams[0], status: "SCHEDULED", date: "Aug 14", time: "03:00 PM", venue: venues[0] },
    { id: 206, matchNum: "SF2", round: "Semi Final 2", label: "Playoffs", teamA: teams[4], teamB: teams[6] || teams[1], winner: teams[4], status: "SCHEDULED", date: "Aug 14", time: "05:00 PM", venue: venues[1] },
    { id: 207, matchNum: "GF",  round: "Grand Final", label: "Final",    teamA: teams[0], teamB: teams[4], winner: teams[0], status: "SCHEDULED", date: "Aug 16", time: "04:00 PM", venue: venues[0] }
  ];
}

// ── Bracket Renderers ─────────────────────────────────────────────────────────

function renderKnockoutBracket(matches, format) {
  const canvas = document.getElementById("bracketCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";

  const isDouble = format === "double-elimination";

  // Group rounds
  const roundMap = {};
  matches.filter(m => !m.round.includes("Loser")).forEach(m => {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  });

  const roundOrder = Object.keys(roundMap);

  // Render winner bracket columns
  roundOrder.forEach(rName => {
    const rMatches = roundMap[rName];
    if (!rMatches || rMatches.length === 0) return;

    const col = document.createElement("div");
    col.className = "round-column";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = rName;
    col.appendChild(title);

    rMatches.forEach(m => col.appendChild(createMatchCard(m)));
    canvas.appendChild(col);
  });

  // Champion column — always last
  const champCol = document.createElement("div");
  champCol.className = "round-column";
  const champTitle = document.createElement("div");
  champTitle.className = "round-title";
  champTitle.textContent = "🏆 Champion";
  champCol.appendChild(champTitle);

  const champCard = document.createElement("div");
  champCard.className = "match-card-node blank-style champion-card";
  champCard.innerHTML = `
    <div class="match-card-header">
      <span>Champion</span>
    </div>
    <div class="match-team-row blank-slot" style="margin-top: 14px;">
      <input type="text" class="blank-team-input" placeholder="" spellcheck="false">
    </div>
  `;
  champCol.appendChild(champCard);
  canvas.appendChild(champCol);

  // If Double Elimination — add loser bracket section below
  if (isDouble) {
    const sep = document.createElement("div");
    sep.style.cssText = "width:100%;display:flex;align-items:center;gap:12px;padding:24px 0 8px 0;min-width:max-content;";
    sep.innerHTML = `<div style="flex:1;height:1px;background:var(--border-color);"></div><span style="font-size:13px;font-weight:700;color:var(--primary);white-space:nowrap;"><i class='ri-history-line'></i> Losers Bracket</span><div style="flex:1;height:1px;background:var(--border-color);"></div>`;
    canvas.appendChild(sep);

    const lbMatches = matches.filter(m => m.round.includes("Loser"));
    const lbCol = document.createElement("div");
    lbCol.className = "round-column";
    const lbTitle = document.createElement("div");
    lbTitle.className = "round-title";
    lbTitle.textContent = "Losers Bracket";
    lbCol.appendChild(lbTitle);
    lbMatches.forEach(m => lbCol.appendChild(createMatchCard(m)));
    canvas.appendChild(lbCol);
  }

  applyBracketTransform();
  setTimeout(drawBracketConnectors, 50);
}

// ── Draw SVG Bracket Connectors ──────────────────────────────────────────────
function drawBracketConnectors(targetCanvas = null, scaleOverride = null) {
  // Only draw connectors for bracket-tree formats (knockout variants)
  if (activeFixtureFormat === "league" || activeFixtureFormat === "group-knockout") return;

  const canvas = targetCanvas || document.getElementById("bracketCanvas");
  if (!canvas) return;

  // Remove existing connector SVG
  let existingSvg = canvas.querySelector(".svg-connector-layer");
  if (existingSvg) existingSvg.remove();

  // Find winner bracket columns
  const allColumns = Array.from(canvas.querySelectorAll(".round-column"));
  if (allColumns.length < 2) return;

  const winnerCols = [];
  for (let col of allColumns) {
    if (col.previousElementSibling && col.previousElementSibling.innerHTML && col.previousElementSibling.innerHTML.includes("Losers Bracket")) {
      break;
    }
    winnerCols.push(col);
  }

  if (winnerCols.length < 2) return;

  const canvasRect = canvas.getBoundingClientRect();
  const scale = scaleOverride !== null ? scaleOverride : (bracketZoomScale || 1.0);

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "svg-connector-layer");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "1";
  svg.style.overflow = "visible";

  for (let c = 0; c < winnerCols.length - 1; c++) {
    const colA = winnerCols[c];
    const colB = winnerCols[c + 1];

    const cardsA = Array.from(colA.querySelectorAll(".match-card-node"));
    const cardsB = Array.from(colB.querySelectorAll(".match-card-node, .champion-card"));

    if (cardsA.length === 0 || cardsB.length === 0) continue;

    cardsA.forEach((cardA, idxA) => {
      const rowsA = Array.from(cardA.querySelectorAll(".match-team-row"));
      const rCardA = cardA.getBoundingClientRect();

      const x1 = (rCardA.right - canvasRect.left) / scale;

      let y1Top, y1Bot, y1Mid;

      if (rowsA.length >= 2) {
        const rTop = rowsA[0].getBoundingClientRect();
        const rBot = rowsA[1].getBoundingClientRect();

        y1Top = (rTop.top + rTop.height / 2 - canvasRect.top) / scale;
        y1Bot = (rBot.top + rBot.height / 2 - canvasRect.top) / scale;
        y1Mid = (y1Top + y1Bot) / 2;
      } else {
        y1Mid = (rCardA.top + rCardA.height / 2 - canvasRect.top) / scale;
        y1Top = y1Mid - 10;
        y1Bot = y1Mid + 10;
      }

      // Determine target card & row in colB
      let targetCard, targetRow;
      const targetCardIdx = Math.min(Math.floor(idxA / 2), cardsB.length - 1);
      targetCard = cardsB[targetCardIdx];

      if (targetCard) {
        const targetRows = Array.from(targetCard.querySelectorAll(".match-team-row"));
        if (targetRows.length >= 2) {
          targetRow = targetRows[idxA % 2];
        } else {
          targetRow = targetCard;
        }
      }

      if (!targetCard) return;

      const rTarget = (targetRow || targetCard).getBoundingClientRect();
      const x2 = (rTarget.left - canvasRect.left) / scale;
      const y2 = (rTarget.top + rTarget.height / 2 - canvasRect.top) / scale;

      const midX = x1 + (x2 - x1) * 0.45;
      const turnX = x2 - 14;

      let stemPath = `M ${midX} ${y1Mid} H ${x2}`;
      if (Math.abs(y1Mid - y2) > 4) {
        const dir = y2 > y1Mid ? 1 : -1;
        stemPath = `
          M ${midX} ${y1Mid} 
          H ${turnX - 4} 
          Q ${turnX} ${y1Mid} ${turnX} ${y1Mid + dir * 4} 
          V ${y2 - dir * 4} 
          Q ${turnX} ${y2} ${turnX + 4} ${y2} 
          H ${x2}
        `;
      }

      const pathStr = `
        M ${x1} ${y1Top} 
        H ${midX - 4} 
        Q ${midX} ${y1Top} ${midX} ${y1Top + 4} 
        V ${y1Mid - 4} 
        Q ${midX} ${y1Mid} ${midX + 4} ${y1Mid}
        
        M ${x1} ${y1Bot} 
        H ${midX - 4} 
        Q ${midX} ${y1Bot} ${midX} ${y1Bot - 4} 
        V ${y1Mid + 4} 
        Q ${midX} ${y1Mid} ${midX + 4} ${y1Mid}
        
        ${stemPath}
      `;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathStr.replace(/\s+/g, " ").trim());
      path.setAttribute("stroke", "#1e293b");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", "1");

      svg.appendChild(path);
    });
  }

  canvas.appendChild(svg);
}

// ── Draw SVG connectors for PRINT clone (scale = 1, no zoom) ─────────────────
// Called after clone is in #printBodyContent so getBoundingClientRect is accurate
function drawPrintConnectors(canvas) {
  if (!canvas) return;
  if (activeFixtureFormat === "league" || activeFixtureFormat === "group-knockout") return;

  // Remove any stale SVG
  const old = canvas.querySelector(".svg-connector-layer");
  if (old) old.remove();

  const allColumns = Array.from(canvas.querySelectorAll(".round-column"));
  if (allColumns.length < 2) return;

  // Only connect winner-bracket columns (stop before Losers Bracket title)
  const winnerCols = [];
  for (let col of allColumns) {
    const title = col.querySelector(".round-title");
    if (title && title.textContent.includes("Losers Bracket")) break;
    winnerCols.push(col);
  }
  if (winnerCols.length < 2) return;

  const canvasRect = canvas.getBoundingClientRect();

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "svg-connector-layer");
  svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible;";

  for (let c = 0; c < winnerCols.length - 1; c++) {
    const colA = winnerCols[c];
    const colB = winnerCols[c + 1];

    const cardsA = Array.from(colA.querySelectorAll(".match-card-node"));
    const cardsB = Array.from(colB.querySelectorAll(".match-card-node, .champion-card"));
    if (cardsA.length === 0 || cardsB.length === 0) continue;

    cardsA.forEach((cardA, idxA) => {
      const rowsA = Array.from(cardA.querySelectorAll(".match-team-row"));
      const rCardA = cardA.getBoundingClientRect();

      // x1 = right edge of cardA (relative to canvas)
      const x1 = rCardA.right - canvasRect.left;

      let y1Top, y1Bot, y1Mid;
      if (rowsA.length >= 2) {
        const rTop = rowsA[0].getBoundingClientRect();
        const rBot = rowsA[1].getBoundingClientRect();
        y1Top = rTop.top  + rTop.height  / 2 - canvasRect.top;
        y1Bot = rBot.top  + rBot.height  / 2 - canvasRect.top;
        y1Mid = (y1Top + y1Bot) / 2;
      } else {
        y1Mid = rCardA.top + rCardA.height / 2 - canvasRect.top;
        y1Top = y1Mid - 10;
        y1Bot = y1Mid + 10;
      }

      // Map to target card in next column
      const targetCardIdx = Math.min(Math.floor(idxA / 2), cardsB.length - 1);
      const targetCard    = cardsB[targetCardIdx];
      if (!targetCard) return;

      const targetRows = Array.from(targetCard.querySelectorAll(".match-team-row"));
      const targetRow  = targetRows.length >= 2 ? targetRows[idxA % 2] : targetCard;
      const rTarget    = (targetRow || targetCard).getBoundingClientRect();

      // x2 = left edge of target row
      const x2 = rTarget.left   - canvasRect.left;
      const y2 = rTarget.top    + rTarget.height / 2 - canvasRect.top;

      const midX  = x1 + (x2 - x1) * 0.45;
      const turnX = x2 - 12;

      let stemPath = `M ${midX} ${y1Mid} H ${x2}`;
      if (Math.abs(y1Mid - y2) > 3) {
        const dir = y2 > y1Mid ? 1 : -1;
        stemPath = `
          M ${midX} ${y1Mid}
          H ${turnX - 4}
          Q ${turnX} ${y1Mid} ${turnX} ${y1Mid + dir * 4}
          V ${y2 - dir * 4}
          Q ${turnX} ${y2} ${turnX + 4} ${y2}
          H ${x2}
        `;
      }

      const pathStr = `
        M ${x1} ${y1Top}
        H ${midX - 4}
        Q ${midX} ${y1Top} ${midX} ${y1Top + 4}
        V ${y1Mid - 4}
        Q ${midX} ${y1Mid} ${midX + 4} ${y1Mid}

        M ${x1} ${y1Bot}
        H ${midX - 4}
        Q ${midX} ${y1Bot} ${midX} ${y1Bot - 4}
        V ${y1Mid + 4}
        Q ${midX} ${y1Mid} ${midX + 4} ${y1Mid}

        ${stemPath}
      `;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathStr.replace(/\s+/g, " ").trim());
      path.setAttribute("stroke", "#000");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
    });
  }

  canvas.appendChild(svg);
}


function buildLeagueRoundMatches(teams) {
  const n = teams.length;
  const matches = [];
  let mid = 1;
  // Generate round-robin rounds: each round is a set of simultaneous matchups
  // For n teams, there are n-1 rounds (if n is even) or n rounds (if n is odd)
  const numTeams = n % 2 === 0 ? n : n + 1; // pad to even
  const numRounds = numTeams - 1;
  const teamList = [...teams];
  if (n % 2 === 1) teamList.push({ id: 99, name: "BYE", abbr: "BYE", isBye: true });

  for (let r = 0; r < numRounds; r++) {
    const roundName = `Round ${r + 1}`;
    const fixed = teamList[0];
    const rotating = teamList.slice(1);
    const rotated = r === 0 ? rotating : [...rotating.slice(numRounds - r), ...rotating.slice(0, numRounds - r)];
    const half = numTeams / 2;
    for (let i = 0; i < half; i++) {
      const tA = i === 0 ? fixed : rotated[i - 1];
      const tB = rotated[numTeams - 2 - i];
      const isByeMatch = tA.isBye || tB.isBye;
      matches.push({ id: mid, matchNum: `L${String(mid).padStart(2, "0")}`, round: roundName, isBye: isByeMatch, status: "SCHEDULED" });
      mid++;
    }
  }
  return matches;
}

function renderLeagueBlankBracket(matches, teams) {
  const canvas = document.getElementById("bracketCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";

  // Group matches by round
  const roundMap = {};
  matches.forEach(m => {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  });

  Object.keys(roundMap).forEach(rName => {
    const col = document.createElement("div");
    col.className = "round-column";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = rName;
    col.appendChild(title);

    roundMap[rName].forEach(m => col.appendChild(createMatchCard(m)));
    canvas.appendChild(col);
  });

  applyBracketTransform();
}

// ── Group Stage + Knockout renderer (blank pill style) ────────────────────────
function buildGroupKnockoutMatches(teams) {
  const matches = [];
  let mid = 1;
  const numGroups = Math.min(4, Math.ceil(teams.length / 2));
  const teamsPerGroup = Math.ceil(teams.length / numGroups);

  for (let g = 0; g < numGroups; g++) {
    const groupName = `Group ${String.fromCharCode(65 + g)}`;
    const groupTeams = teams.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matches.push({ id: mid, matchNum: `G${String(mid).padStart(2, "0")}`, round: groupName, isBye: false, status: "SCHEDULED" });
        mid++;
      }
    }
  }

  // Semi finals
  for (let i = 0; i < Math.min(numGroups, 4); i += 2) {
    matches.push({ id: mid, matchNum: `SF${i / 2 + 1}`, round: "Semi Finals", isBye: false, status: "SCHEDULED" });
    mid++;
  }

  // Final
  matches.push({ id: mid, matchNum: "GF", round: "Final", isBye: false, status: "SCHEDULED" });
  mid++;

  // Champion
  matches.push({ id: mid, matchNum: "CH", round: "Champion", isBye: false, status: "SCHEDULED" });

  return matches;
}

function renderGroupKnockoutBlankBracket(matches, teams) {
  const canvas = document.getElementById("bracketCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";

  const roundMap = {};
  matches.forEach(m => {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  });

  const roundOrder = Object.keys(roundMap);

  roundOrder.forEach(rName => {
    const isChamp = rName === "Champion";
    const col = document.createElement("div");
    col.className = "round-column";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = isChamp ? "🏆 Champion" : rName;
    col.appendChild(title);

    if (isChamp) {
      const champCard = document.createElement("div");
      champCard.className = "match-card-node blank-style champion-card";
      champCard.innerHTML = `
        <div class="match-card-header"><span>Champion</span></div>
        <div class="match-team-row blank-slot">
          <input type="text" class="blank-team-input" placeholder="" spellcheck="false">
        </div>
      `;
      col.appendChild(champCard);
    } else {
      roundMap[rName].forEach(m => col.appendChild(createMatchCard(m)));
    }

    canvas.appendChild(col);
  });

  applyBracketTransform();
}

// ── Match Card Node ───────────────────────────────────────────────────────────
function createMatchCard(match) {
  const card = document.createElement("div");
  card.className = "match-card-node blank-style";

  const gameNum = match.id || (match.matchNum ? match.matchNum.replace(/\D/g, '') : '');
  const titleText = gameNum ? `Game ${gameNum}` : (match.round || "Game");
  const isBye = match && match.isBye;

  card.innerHTML = `
    <div class="match-card-header">
      <span>${titleText} ${isBye ? '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;font-weight:800;margin-left:4px;">BYE</span>' : ''}</span>
    </div>
    <div class="match-team-row blank-slot">
      <input type="text" class="blank-team-input" placeholder="${isBye ? 'BYE (Automatic)' : ''}" spellcheck="false">
    </div>
    <div class="match-team-row blank-slot">
      <input type="text" class="blank-team-input" placeholder="" spellcheck="false">
    </div>
  `;
  return card;
}

// ── Bracket Viewport Controls ─────────────────────────────────────────────────
function applyBracketTransform() {
  const canvas = document.getElementById("bracketCanvas");
  if (canvas) {
    canvas.style.transform = `translate(${bracketTranslate.x}px,${bracketTranslate.y}px) scale(${bracketZoomScale})`;
  }
}

function zoomBracket(delta) {
  bracketZoomScale = Math.min(Math.max(0.3, bracketZoomScale + delta), 2.5);
  applyBracketTransform();
}

function resetBracketZoom() {
  bracketZoomScale = 1.0;
  bracketTranslate = { x: 0, y: 0 };
  applyBracketTransform();
}

function fitBracketScreen() {
  const viewport = document.getElementById("bracketViewport");
  const canvas   = document.getElementById("bracketCanvas");
  if (!viewport || !canvas) return;
  const vW = viewport.clientWidth;
  const cW = canvas.scrollWidth || 900;
  bracketZoomScale = Math.min(1.0, (vW - 60) / cW);
  bracketTranslate = { x: 10, y: 10 };
  applyBracketTransform();
}

function toggleBracketFullscreen() {
  const card = document.querySelector(".bracket-card");
  if (!card) return;
  if (!document.fullscreenElement) {
    card.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

function setupBracketDragEvents() {
  const viewport = document.getElementById("bracketViewport");
  if (!viewport || viewport.dataset.dragInit) return;
  viewport.dataset.dragInit = "true";

  viewport.addEventListener("mousedown", e => {
    isBracketDragging = true;
    bracketDragStart = { x: e.clientX - bracketTranslate.x, y: e.clientY - bracketTranslate.y };
    viewport.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", e => {
    if (!isBracketDragging) return;
    bracketTranslate.x = e.clientX - bracketDragStart.x;
    bracketTranslate.y = e.clientY - bracketDragStart.y;
    applyBracketTransform();
  });
  window.addEventListener("mouseup", () => {
    isBracketDragging = false;
    if (viewport) viewport.style.cursor = "grab";
  });
  viewport.addEventListener("wheel", e => {
    e.preventDefault();
    zoomBracket(e.deltaY < 0 ? 0.06 : -0.06);
  }, { passive: false });
}

// ── Print Action ──────────────────────────────────────────────────────────────
function printBracketAction() {
  const sEl = document.getElementById("fixtureFilterSport");
  const fEl = document.getElementById("fixtureFilterFormat");

  const pTitle  = document.getElementById("printTournamentTitle");
  const pSport  = document.getElementById("printSportCat");
  const pFmt    = document.getElementById("printFormat");
  const pTeams  = document.getElementById("printTotalTeams");
  const pMatch  = document.getElementById("printTotalMatches");
  const pDate   = document.getElementById("printDate");

  if (pTitle)  pTitle.textContent  = "DEV SANSKRITI SPORTS PREMIER LEAGUE";
  if (pSport)  pSport.textContent  = `${sEl ? sEl.value : "Cricket"}`;
  if (pFmt)    pFmt.textContent    = fEl ? fEl.options[fEl.selectedIndex].text : "Single Elimination";
  if (pTeams)  pTeams.textContent  = fixtureTeams.length;
  if (pMatch)  pMatch.textContent  = generatedFixtures.length;
  if (pDate)   pDate.textContent   = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const printContainer = document.getElementById("printContainer");
  const printBody = document.getElementById("printBodyContent");
  const bracketCanvas = document.getElementById("bracketCanvas");

  if (printBody && bracketCanvas) {
    printBody.innerHTML = "";

    // Clone the bracket, copy input values
    const clone = bracketCanvas.cloneNode(true);
    const origInputs = bracketCanvas.querySelectorAll("input");
    const cloneInputs = clone.querySelectorAll("input");
    origInputs.forEach((inp, idx) => {
      if (cloneInputs[idx]) {
        cloneInputs[idx].setAttribute("value", inp.value);
        cloneInputs[idx].value = inp.value;
      }
    });

    // Remove old SVG connector layer from clone — it has wrong screen coordinates
    const oldSvg = clone.querySelector(".svg-connector-layer");
    if (oldSvg) oldSvg.remove();

    clone.style.transform = "none";
    clone.style.position = "relative";
    printBody.appendChild(clone);

    // Show print container so elements have real layout
    if (printContainer) printContainer.style.display = "flex";

    // Redraw connectors ON the clone, after its layout has settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawPrintConnectors(clone);
        window.print();
        setTimeout(() => {
          if (printContainer) printContainer.style.display = "none";
        }, 500);
      });
    });
  } else {
    window.print();
  }
}


window.addEventListener("resize", () => {
  if (document.getElementById("tab-fixtures")?.classList.contains("active") || document.querySelector('[data-tab="fixtures"]')?.classList.contains("active")) {
    drawBracketConnectors();
  }
});

// ── REGISTRATION CONTROL MODULE ──────────────────────────────────────────────
let registrationSettingsData = {
  masterEnabled: true,
  sportsConfig: {}
};

const REGISTRATION_SPORTS_LIST = [
  { id: "basketball", name: "Basketball (5 Players)", icon: "🏀" },
  { id: "football", name: "Football (11 Players)", icon: "⚽" },
  { id: "cricket", name: "Cricket (11 Players)", icon: "🏏" },
  { id: "volleyball", name: "Volleyball (6 Players)", icon: "🏐" },
  { id: "badminton_doubles", name: "Badminton (Doubles)", icon: "🏸" },
  { id: "table_tennis", name: "Table Tennis (Singles)", icon: "🏓" },
  { id: "chess", name: "Chess (Singles)", icon: "♟️" },
  { id: "kho_kho", name: "Kho-Kho (10 Players)", icon: "🤸" },
  { id: "tug_of_war", name: "Tug Of War (8 Players)", icon: "💪" },
  { id: "relay_race", name: "Relay Race (4 Players)", icon: "🏃" },
  { id: "seven_stones", name: "7 Stones (7 Players)", icon: "🪨" },
  { id: "kabaddi", name: "Kabaddi (7 Players)", icon: "🤼" },
  { id: "athletics_100m", name: "Athletics (100m Sprint)", icon: "🏃" },
  { id: "athletics_200m", name: "Athletics (200m Sprint)", icon: "🏃" },
  { id: "athletics_400m", name: "Athletics (400m)", icon: "🏃" },
  { id: "long_jump", name: "Long Jump", icon: "🦘" },
  { id: "high_jump", name: "High Jump", icon: "🏋️" },
  { id: "shot_put", name: "Shot Put", icon: "⚫" },
  { id: "discus_throw", name: "Discus Throw", icon: "🥏" },
  { id: "javelin_throw", name: "Javelin Throw", icon: "🎯" }
];

async function loadRegistrationSettings() {
  try {
    const data = await apiCall("/api/settings/registration");
    if (data) {
      registrationSettingsData = data;
    }
    renderRegistrationControl();
  } catch (error) {
    console.error("Failed to load registration settings:", error);
    renderRegistrationControl();
  }
}

function renderRegistrationControl() {
  const badge = document.getElementById("masterStatusBadge");
  const toggleBtn = document.getElementById("toggleMasterRegistrationBtn");
  
  const isOpen = registrationSettingsData.masterEnabled !== false;
  if (badge) {
    badge.textContent = isOpen ? "OPEN" : "CLOSED";
    badge.className = isOpen ? "badge badge-success" : "badge badge-danger";
    badge.style.fontSize = "13px";
    badge.style.padding = "6px 14px";
  }
  if (toggleBtn) {
    toggleBtn.innerHTML = isOpen 
      ? `<i class="ri-close-circle-line"></i> Close Master Registration`
      : `<i class="ri-checkbox-circle-line"></i> Open Master Registration`;
    toggleBtn.style.backgroundColor = isOpen ? "var(--danger, #ef4444)" : "var(--success, #22c55e)";
    toggleBtn.style.color = "#fff";
  }

  const tbody = document.getElementById("regSportsTableBody");
  if (!tbody) return;

  const sportsConfig = registrationSettingsData.sportsConfig || {};

  tbody.innerHTML = REGISTRATION_SPORTS_LIST.map(sport => {
    const config = sportsConfig[sport.id] || {};
    const enabled = config.enabled !== false;
    const startDate = config.startDate || "";
    const endDate = config.endDate || "";

    // Status check
    const now = new Date();
    let statusText = "Active";
    let statusClass = "badge-success";

    if (!enabled) {
      statusText = "Disabled";
      statusClass = "badge-danger";
    } else if (startDate && new Date(startDate) > now) {
      statusText = "Scheduled";
      statusClass = "badge-warning";
    } else if (endDate && new Date(endDate) < now) {
      statusText = "Closed";
      statusClass = "badge-secondary";
    }

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 600;">
            <span style="font-size: 20px;">${sport.icon}</span>
            <span>${sport.name}</span>
          </div>
        </td>
        <td>
          <span class="badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 11px; color: var(--text-muted);">Start Time:</label>
              <input type="datetime-local" class="input" id="regStart_${sport.id}" value="${startDate}" style="padding: 6px 10px; font-size: 13px;">
            </div>
            <span style="color: var(--text-muted); font-size: 14px;">&rarr;</span>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 11px; color: var(--text-muted);">End Time:</label>
              <input type="datetime-local" class="input" id="regEnd_${sport.id}" value="${endDate}" style="padding: 6px 10px; font-size: 13px;">
            </div>
          </div>
        </td>
        <td>
          <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">
            <input type="checkbox" id="regEnabled_${sport.id}" ${enabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            Enable Sport
          </label>
        </td>
      </tr>
    `;
  }).join("");
}

async function toggleMasterRegistration() {
  const current = registrationSettingsData.masterEnabled !== false;
  const nextState = !current;
  
  try {
    const updated = await apiCall("/api/settings/registration", {
      method: "POST",
      body: JSON.stringify({
        masterEnabled: nextState,
        sportsConfig: registrationSettingsData.sportsConfig || {}
      })
    });
    registrationSettingsData = updated;
    renderRegistrationControl();
    alert(`Master Registration is now ${nextState ? "OPEN" : "CLOSED"}`);
  } catch (error) {
    alert("Error updating master registration status: " + error.message);
  }
}

async function saveAllRegistrationSettings() {
  const newSportsConfig = {};

  REGISTRATION_SPORTS_LIST.forEach(sport => {
    const enabledInput = document.getElementById(`regEnabled_${sport.id}`);
    const startInput = document.getElementById(`regStart_${sport.id}`);
    const endInput = document.getElementById(`regEnd_${sport.id}`);

    newSportsConfig[sport.id] = {
      enabled: enabledInput ? enabledInput.checked : true,
      startDate: startInput ? startInput.value : "",
      endDate: endInput ? endInput.value : ""
    };
  });

  try {
    const updated = await apiCall("/api/settings/registration", {
      method: "POST",
      body: JSON.stringify({
        masterEnabled: registrationSettingsData.masterEnabled !== false,
        sportsConfig: newSportsConfig
      })
    });
    registrationSettingsData = updated;
    renderRegistrationControl();
    alert("Registration schedules and settings saved successfully!");
  } catch (error) {
    alert("Error saving registration settings: " + error.message);
  }
}

// Socket listener for real-time registration settings updates
socket.on("registrationSettingsUpdate", (data) => {
  if (data) {
    registrationSettingsData = data;
    if (document.getElementById("tab-registration-settings")?.classList.contains("active")) {
      renderRegistrationControl();
    }
  }
});

// Bind functions globally for HTML inline onclick handlers
window.toggleMasterRegistration = toggleMasterRegistration;
window.saveAllRegistrationSettings = saveAllRegistrationSettings;
window.renderRegistrationControl = renderRegistrationControl;
window.loadRegistrationSettings = loadRegistrationSettings;

// Auto-render table on script load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderRegistrationControl);
} else {
  renderRegistrationControl();
}


