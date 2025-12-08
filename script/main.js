// =========================
// 📄 login.js — Real-time user data + session persistence
// =========================

let currentUserEmail = sessionStorage.getItem("userEmail") || null;
let socket = null;
let currentUserId = null;

// Initialize Socket.IO connection with dynamic endpoint
async function initializeSocket() {
  if (typeof io !== 'undefined') {
    const endpoint = await getApiEndpoint()
    socket = io(endpoint, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }
}

// Set up socket listener for user notifications
function setupNotificationListener(userId) {
  if (!socket) return;
  
  currentUserId = userId;
  socket.off(`notification:${userId}`);
  socket.on(`notification:${userId}`, (notification) => {
    console.log('Real-time notification received:', notification);
    // Refresh the notifications display
    if (currentUserEmail) {
      fetchAndDisplayUser(currentUserEmail);
    }
  });
}

// --- Handle manual login ---
document.addEventListener("DOMContentLoaded", async () => {
  // Ensure API endpoint is loaded before running client initialization
  await getApiEndpoint();
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      try {
        const res = await apiFetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid credentials");

        alert(`✅ Login successful! Welcome, ${data.fullName || data.role.toUpperCase()}.`);

        // 🧠 Remember logged-in user
        currentUserEmail = data.email;
        sessionStorage.setItem("userEmail", data.email);

        // Redirect based on role
        if (data.role === "student") window.location.href = "student/home.html";
        else if (data.role === "admin") window.location.href = "../admin/html/queue.html";
      } catch (err) {
        alert("❌ " + err.message);
      }
    });
  }

  // --- Navbar profile + modal setup ---
  const navbarProfilePic = document.getElementById("nav-profile-pic");
  const modal = document.getElementById("profileModal");
  const closeModal = document.querySelector(".profile-modal-close");

  // Mobile sheet controls
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileSheet = document.getElementById('mobileSheet');
  const sheetOverlay = document.getElementById('sheetOverlay');
  const sheetHandle = document.getElementById('sheetHandle');

  if (navbarProfilePic) {
    // Add badge for unread notifications
    let notifBadge = document.createElement('span');
    notifBadge.id = 'notifBadge';
    notifBadge.style.position = 'absolute';
    notifBadge.style.top = '2px';
    notifBadge.style.right = '2px';
    notifBadge.style.background = '#e53935';
    notifBadge.style.color = '#fff';
    notifBadge.style.fontSize = '12px';
    notifBadge.style.fontWeight = 'bold';
    notifBadge.style.borderRadius = '50%';
    notifBadge.style.padding = '2px 6px';
    notifBadge.style.zIndex = '10';
    notifBadge.style.display = 'none';
    notifBadge.style.pointerEvents = 'none';
    notifBadge.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
    navbarProfilePic.style.position = 'relative';
    navbarProfilePic.parentElement.style.position = 'relative';
    navbarProfilePic.parentElement.appendChild(notifBadge);

    // Load user details if session exists
    if (currentUserEmail) {
      fetchAndDisplayUser(currentUserEmail);
    }

    navbarProfilePic.addEventListener("click", async () => {
      if (!currentUserEmail) {
        alert("⚠️ Please log in first.");
        return;
      }
      modal.style.display = "block";
      await fetchAndDisplayUser(currentUserEmail);
    });

    // Hamburger toggles mobile bottom sheet (mobile view)
    if (hamburgerBtn && mobileSheet) {
      hamburgerBtn.addEventListener('click', async () => {
        // If sheet is already open, close it
        if (mobileSheet.classList.contains('open')) {
          closeMobileSheet();
          hamburgerBtn.classList.remove('is-open');
          return;
        }

        // Open sheet path
        if (!currentUserEmail) {
          // allow nav-only open even when not logged in
          mobileSheet.classList.add('open');
          mobileSheet.setAttribute('aria-hidden', 'false');
          hamburgerBtn.classList.add('is-open');
          return;
        }

        await fetchAndDisplayUser(currentUserEmail);
        mobileSheet.classList.add('open');
        mobileSheet.setAttribute('aria-hidden', 'false');
        hamburgerBtn.classList.add('is-open');
      });

      if (sheetOverlay) sheetOverlay.addEventListener('click', () => { closeMobileSheet(); hamburgerBtn.classList.remove('is-open'); });
      if (sheetHandle) sheetHandle.addEventListener('click', () => { closeMobileSheet(); hamburgerBtn.classList.remove('is-open'); });

      // close on Escape
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeMobileSheet(); if (hamburgerBtn) hamburgerBtn.classList.remove('is-open'); }
      });
    }

    if (closeModal) {
      closeModal.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    window.addEventListener("click", (event) => {
      if (event.target === modal) modal.style.display = "none";
    });
  }

  // --- Handle logout ---
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      // Clear session storage
      sessionStorage.clear();

      // Redirect to login page
      window.location.href = "../index.html";
    });
  }

  // Mobile sheet logout button (if present)
  const mobileLogout = document.getElementById('mobileLogoutButton');
  if (mobileLogout) {
    mobileLogout.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = "../index.html";
    });
  }

  // Initialize Socket.IO
  initializeSocket();
});

// =========================
// 🧠 Fetch user data from MongoDB in real time
// =========================
async function fetchAndDisplayUser(email) {
  try {
    const res = await apiFetch(`/users/${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error("User not found");
    const user = await res.json();

    // Update both modal and navbar
    updateProfileModal(user.fullName, user.email, user.tokenBalance, user.role, user.picture);
    updateNavbarProfilePic(user.picture);
    updateTokenProgress(user.tokenBalance);
    updateNotifications(user.notifications || [], user._id);
    
    // Set up real-time notification listener for this user
    setupNotificationListener(user._id);
  } catch (err) {
    console.error("⚠️ Failed to fetch user:", err);
  }
}

// Render notifications into the profile modal and update badge
function updateNotifications(notifications = [], userId) {
  const list = document.getElementById('notificationsList');
  const mobileList = document.getElementById('mobileNotificationsList');
  const notifBadge = document.getElementById('notifBadge');
  if (!list) return;
  if (!Array.isArray(notifications) || notifications.length === 0) {
    list.innerHTML = '<div style="color:#666;padding:8px;">No notifications</div>';
    if (mobileList) mobileList.innerHTML = '<div style="color:#666;padding:8px;">No notifications</div>';
    if (notifBadge) notifBadge.style.display = 'none';
    return;
  }

  // Sort by newest first
  const sorted = notifications.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.innerHTML = '';
  let unreadCount = 0;
  sorted.forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notification-item';
    if (!n.read) {
      item.style.background = '#f0f6ff';
      unreadCount++;
    }
    item.style.cursor = 'pointer';
    item.style.padding = '10px';
    item.style.borderBottom = '1px solid #eee';

    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = n.message || 'Notification';
    title.style.fontWeight = n.read ? '500' : '700';

    const time = document.createElement('div');
    time.className = 'notification-time';
    time.textContent = new Date(n.createdAt).toLocaleString();
    time.style.fontSize = '11px';
    time.style.color = '#888';

    item.appendChild(title);
    item.appendChild(time);

    item.addEventListener('click', async () => {
      // Remove notification from UI immediately
      item.remove();
      // If notification has id and userId, try to delete on server
      if (n._id && userId) {
        try {
          await apiFetch(`/users/${userId}/notifications/${n._id}/read`, { method: 'PATCH' });
        } catch (err) {
          console.error('Failed to delete notification:', err);
        }
      }
      // Update badge count
      if (notifBadge) {
        unreadCount--;
        notifBadge.textContent = unreadCount > 0 ? unreadCount : '';
        notifBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }
    });

    list.appendChild(item);
    if (mobileList) mobileList.appendChild(item.cloneNode(true));
  });
  if (notifBadge) {
    notifBadge.textContent = unreadCount > 0 ? unreadCount : '';
    notifBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
}

// =========================
// 🧩 Profile Modal Functions
// =========================
function updateProfileModal(name, email, tokens, role, picture) {
  const studentName = document.getElementById("studentName");
  const studentId = document.getElementById("studentId");
  const tokenCount = document.getElementById("tokenCount");
  const profilePic = document.querySelector(".profile-modal-pic");

  if (studentName) studentName.textContent = name || "Unknown User";
  if (studentId) studentId.textContent = email || "N/A";
  if (tokenCount) tokenCount.textContent = tokens ?? 0;
  if (profilePic && picture) {
    profilePic.src = picture;
    profilePic.style.borderRadius = "50%";
  }

  // Also update mobile sheet if present
  const mName = document.getElementById('mobileStudentName');
  const mId = document.getElementById('mobileStudentId');
  if (mName) mName.textContent = name || 'Unknown User';
  if (mId) mId.textContent = email || 'N/A';
}

function updateNavbarProfilePic(picture) {
  const navbarProfilePic = document.getElementById("nav-profile-pic");
  if (!navbarProfilePic) return;

  if (picture) {
    navbarProfilePic.src = picture;
  } else {
    // fallback avatar for manual logins or missing Google picture
    navbarProfilePic.src = "../images/student_img/profile.png";
  }
  navbarProfilePic.style.borderRadius = "50%";

  // mobile sheet profile pic
  const mPic = document.getElementById('mobile-profile-pic');
  if (mPic) mPic.src = navbarProfilePic.src;
}

function closeMobileSheet() {
  const mobileSheet = document.getElementById('mobileSheet');
  if (!mobileSheet) return;
  mobileSheet.classList.remove('open');
  mobileSheet.setAttribute('aria-hidden', 'true');
}

function updateTokenProgress(currentTokens = 0) {
  const tokenCount = document.getElementById("tokenCount");
  const progressBar = document.getElementById("tokenProgressBar");
  const maxTokens = 500;

  if (tokenCount && progressBar) {
    tokenCount.textContent = currentTokens;
    const progress = (currentTokens / maxTokens) * 100;
    progressBar.style.width = progress + "%";
  }

  // update mobile sheet token display if present
  const mTokenCount = document.getElementById('mobileTokenCount');
  const mProgressBar = document.getElementById('mobileTokenProgressBar');
  if (mTokenCount) mTokenCount.textContent = currentTokens;
  if (mProgressBar) {
    const progress = (currentTokens / maxTokens) * 100;
    mProgressBar.style.width = progress + "%";
  }

  const notificationsList = document.getElementById("notificationsList");
  if (notificationsList) {
    notificationsList.innerHTML = `
      <div class="notification-item">
        <div class="notification-content">
          <div class="notification-title">Token Update</div>
          <div class="notification-message">You currently have ${currentTokens} tokens.</div>
          <div class="notification-time">Just now</div>
        </div>
      </div>
    `;
  }
}

// =========================
// 🧠 Google Login Integration
// =========================
window.onload = function () {
  const googleSignInBtn = document.getElementById("g_id_signin");

  if (googleSignInBtn) {
    google.accounts.id.initialize({
      client_id: "45090330265-mntibu3tlf84kfpsctq1dtuta79cskiq.apps.googleusercontent.com",
      callback: handleGoogleLogin,
    });

    google.accounts.id.renderButton(googleSignInBtn, {
      theme: "outline",
      size: "large",
      text: "signin_with",
    });
  }

  // Restore session on reload
  const savedEmail = sessionStorage.getItem("userEmail");
  if (savedEmail) {
    currentUserEmail = savedEmail;
    fetchAndDisplayUser(savedEmail);
  }
};

async function handleGoogleLogin(response) {
  const data = JSON.parse(atob(response.credential.split(".")[1]));

  try {
    const res = await apiFetch("/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        fullName: data.name,
        googleId: data.sub,
        picture: data.picture,
      }),
    });

    const user = await res.json();
    if (!res.ok) throw new Error(user.error || "Google login failed");

    alert(`Welcome ${user.fullName}!`);
    currentUserEmail = user.email;
    sessionStorage.setItem("userEmail", user.email);

    if (user.role === "admin") window.location.href = "../admin/html/queue.html";
    else window.location.href = "student/home.html";
  } catch (err) {
    alert("⚠️ " + err.message);
  }
}
