// =========================
// 📄 main.js — Real-time user data + session persistence + Logout functionality
// =========================

let currentUserEmail = sessionStorage.getItem("userEmail") || null;

// --- Modal Utility Functions ---
function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

// --- Initialize Logout Functionality ---
function initializeLogout() {
  // Get elements
  const logoutBtn = document.getElementById('profileLogoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const confirmLogout = document.getElementById('confirmLogout');

  if (!logoutBtn || !logoutModal || !cancelLogout || !confirmLogout) {
    console.warn('Logout elements not found');
    return;
  }

  // Open logout modal when clicking logout in profile modal
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    closeModal(document.getElementById('profileModal'));
    setTimeout(() => {
      openModal(logoutModal);
    }, 200);
  });

  // Cancel logout
  cancelLogout.addEventListener('click', function () {
    closeModal(logoutModal);
  });

  // Confirm logout
  confirmLogout.addEventListener('click', function () {
    // Perform logout actions
    console.log('User logging out...');

    // Clear all user session data
    sessionStorage.removeItem('userEmail');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');

    // Clear current user email
    currentUserEmail = null;

    // Close modals
    closeModal(logoutModal);
    closeModal(document.getElementById('profileModal'));

    // Redirect to login page
    setTimeout(() => {
      window.location.href = '../../index.html';
    }, 300);
  });

  // Backdrop click to close modal
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal.open');
      if (openModals.length > 0) {
        openModals.forEach(modal => closeModal(modal));
      }
    }
  });
}

// --- Handle manual login ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      try {
        const res = await fetch("http://localhost:3000/login", {
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
  const profileModal = document.getElementById("profileModal");
  const closeProfileBtn = document.querySelector(".close-modal");

  if (navbarProfilePic) {
    // Load user details if session exists
    if (currentUserEmail) {
      fetchAndDisplayUser(currentUserEmail);
    }

    navbarProfilePic.addEventListener("click", async () => {
      if (!currentUserEmail) {
        alert("⚠️ Please log in first.");
        return;
      }
      openModal(profileModal);
      await fetchAndDisplayUser(currentUserEmail);
    });

    if (closeProfileBtn) {
      closeProfileBtn.addEventListener("click", () => {
        closeModal(profileModal);
      });
    }

    // Initialize logout functionality
    initializeLogout();
  }
});

// =========================
// 🧠 Fetch user data from MongoDB in real time
// =========================
async function fetchAndDisplayUser(email) {
  try {
    const res = await fetch(`http://localhost:3000/users/${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error("User not found");
    const user = await res.json();

    // Update both modal and navbar
    updateProfileModal(user.fullName, user.email, user.tokenBalance, user.role, user.picture);
    updateNavbarProfilePic(user.picture);
    updateTokenProgress(user.tokenBalance);
  } catch (err) {
    console.error("⚠️ Failed to fetch user:", err);
  }
}

// =========================
// 🧩 Profile Modal Functions
// =========================
function updateProfileModal(name, email, tokens, role, picture) {
  const studentName = document.getElementById("studentName");
  const studentId = document.getElementById("studentId");
  const tokenCount = document.getElementById("tokenCount");
  const profilePic = document.getElementById("profileModalPic");

  if (studentName) studentName.textContent = name || "Unknown User";
  if (studentId) studentId.textContent = email || "N/A";
  if (tokenCount) tokenCount.textContent = tokens ?? 0;
  if (profilePic && picture) {
    profilePic.src = picture;
    profilePic.style.borderRadius = "50%";
  }
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
    const res = await fetch("http://localhost:3000/google-login", {
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