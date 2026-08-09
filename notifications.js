/**
 * DSSL YouTube-Style Notification System
 * Handles bell dropdown UI, local storage persistence, and realtime Socket.IO notifications.
 */

(function () {
  const NOTIF_STORAGE_KEY = "DSSL_notifications_v1";
  let socket = null;

  // Initial State from LocalStorage
  let notifications = loadNotifications();

  document.addEventListener("DOMContentLoaded", () => {
    initNotificationSystem();
    initRealtimeSockets();
  });

  function loadNotifications() {
    try {
      const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.warn("Error reading notifications cache", e); }
    
    // Default initial notifications if empty
    return [
      {
        id: "default-1",
        type: "news",
        source: "Media Team",
        title: "DSSL Sports Tournament 2026 Announced!",
        time: Date.now() - 3600000 * 2,
        read: false,
        icon: "ri-newspaper-line",
        url: "index.html"
      },
      {
        id: "default-2",
        type: "media",
        source: "Creator Team",
        title: "New Gallery Photos & Highlights Uploaded",
        time: Date.now() - 3600000 * 8,
        read: false,
        icon: "ri-image-2-line",
        url: "gallery.html"
      }
    ];
  }

  function saveNotifications() {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) { console.warn("Error saving notifications", e); }
  }

  function initNotificationSystem() {
    // Look for target header right section in website or admin
    const headerRight = document.querySelector("header .header-right") || document.querySelector(".header-right");
    if (!headerRight) return;

    // Check if bell button already exists
    if (document.getElementById("notifBellBtn")) return;

    // Create Notification Wrapper & Bell HTML
    const wrapper = document.createElement("div");
    wrapper.className = "notification-wrapper";
    wrapper.innerHTML = `
      <button class="notification-bell-btn" id="notifBellBtn" title="Notifications" aria-label="Notifications">
        <i class="ri-notification-3-line"></i>
        <span class="notification-badge hidden" id="notifBadge">0</span>
      </button>

      <div class="notifications-dropdown" id="notifDropdown">
        <div class="notif-header">
          <h4>Notifications</h4>
          <div class="notif-header-actions">
            <button class="notif-action-btn" id="notifMarkAllReadBtn" title="Mark all as read">
              <i class="ri-check-double-line"></i>
            </button>
          </div>
        </div>
        <div class="notif-subheader">Recent Updates</div>
        <ul class="notif-list" id="notifList"></ul>
      </div>
    `;

    // Insert bell RIGHT BEFORE the .theme-toggle so they sit side-by-side
    const themeToggle = headerRight.querySelector(".theme-toggle");
    if (themeToggle) {
      headerRight.insertBefore(wrapper, themeToggle);
    } else {
      // Fallback: insert as first child
      headerRight.insertBefore(wrapper, headerRight.firstChild);
    }


    // Event Listeners
    const bellBtn = document.getElementById("notifBellBtn");
    const dropdown = document.getElementById("notifDropdown");
    const markAllBtn = document.getElementById("notifMarkAllReadBtn");

    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
      if (dropdown.classList.contains("active")) {
        markNotificationsAsRead();
      }
    });

    // Prevent closing when clicking inside dropdown
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Close on outside click
    document.addEventListener("click", () => {
      dropdown.classList.remove("active");
    });

    // Mark all read button
    markAllBtn.addEventListener("click", () => {
      markNotificationsAsRead();
    });

    // Render initial UI
    renderNotificationList();
    updateBadgeCount();
  }

  function renderNotificationList() {
    const listContainer = document.getElementById("notifList");
    if (!listContainer) return;

    if (notifications.length === 0) {
      listContainer.innerHTML = `
        <div class="notif-empty">
          <i class="ri-notification-off-line"></i>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = notifications.map(n => `
      <li class="notif-item ${n.read ? 'read' : 'unread'}" onclick="window.handleNotifClick('${n.id}', '${n.url || ''}')">
        <div class="notif-unread-dot"></div>
        <div class="notif-avatar ${n.type}">
          <i class="${n.icon || 'ri-notification-3-line'}"></i>
        </div>
        <div class="notif-content">
          <div class="notif-source">${n.source}</div>
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-time">${getRelativeTime(n.time)}</div>
        </div>
        ${n.thumbnail ? `<img src="${n.thumbnail}" class="notif-thumbnail" alt="thumbnail">` : ''}
        <button class="notif-item-delete" onclick="window.deleteNotif(event, '${n.id}')" title="Remove notification">
          <i class="ri-close-line"></i>
        </button>
      </li>
    `).join("");
  }

  function updateBadgeCount() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  function markNotificationsAsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    renderNotificationList();
    updateBadgeCount();
  }

  window.handleNotifClick = function(id, url) {
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.read = true;
      saveNotifications();
      renderNotificationList();
      updateBadgeCount();
    }
    if (url && url !== "" && url !== "#") {
      window.location.href = url;
    }
  };

  window.deleteNotif = function(e, id) {
    e.stopPropagation();
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications();
    renderNotificationList();
    updateBadgeCount();
  };

  // Realtime Socket Listener
  function initRealtimeSockets() {
    if (typeof io !== "function") return;
    try {
      socket = io();

      // Media Team Published News
      socket.on("newsUpdate", (post) => {
        if (!post) return;
        addNotification({
          id: "news-" + (post.id || Date.now()),
          type: "news",
          source: "Media Team published news",
          title: post.title || "New Announcement Posted",
          time: Date.now(),
          read: false,
          icon: "ri-newspaper-line",
          url: "index.html#news"
        });
      });

      // Creator Team Uploaded Gallery Media
      socket.on("mediaUpdate", (media) => {
        if (!media) return;
        addNotification({
          id: "media-" + (media.id || Date.now()),
          type: "media",
          source: "Creator Team uploaded media",
          title: media.title || "New Photo/Video in Gallery",
          thumbnail: media.type === "IMAGE" ? media.url : null,
          time: Date.now(),
          read: false,
          icon: "ri-image-2-line",
          url: "gallery.html"
        });
      });

      // Match Score/Status Update
      socket.on("matchUpdate", (match) => {
        if (!match || match.status !== "live") return;
        addNotification({
          id: "match-" + (match.id || Date.now()),
          type: "match",
          source: "Organiser Team - Match LIVE",
          title: `${match.sportName || 'Match'}: ${match.dalA?.name || 'Team A'} VS ${match.dalB?.name || 'Team B'}`,
          time: Date.now(),
          read: false,
          icon: "ri-broadcast-line",
          url: "results.html"
        });
      });

    } catch (err) {
      console.warn("Socket initialization skipped in notifications", err);
    }
  }

  function addNotification(item) {
    // Avoid duplicate IDs
    if (notifications.some(n => n.id === item.id)) return;

    notifications.unshift(item);
    saveNotifications();
    renderNotificationList();
    updateBadgeCount();

    // Trigger bell animation
    const bellBtn = document.getElementById("notifBellBtn");
    if (bellBtn) {
      bellBtn.classList.remove("bell-ring");
      void bellBtn.offsetWidth; // trigger reflow
      bellBtn.classList.add("bell-ring");
    }

    // Trigger Floating Toast
    showNotificationToast(item);
  }

  function showNotificationToast(item) {
    let container = document.getElementById("notifToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "notifToastContainer";
      container.className = "notif-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `notif-toast ${item.type}-toast`;
    toast.innerHTML = `
      <div class="notif-avatar ${item.type}">
        <i class="${item.icon}"></i>
      </div>
      <div class="notif-toast-content">
        <div class="notif-toast-title">${item.source}</div>
        <div class="notif-toast-text">${escapeHtml(item.title)}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  function getRelativeTime(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

})();
