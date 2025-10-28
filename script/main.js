// --- Dummy users (for manual login) ---
const users = [
  { role: "student", email: "student@slu.edu.ph", password: "student123" },
  { role: "admin", email: "admin@slu.edu.ph", password: "admin123" }
];

// --- Handle manual login ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        alert(`Login successful! Welcome, ${user.role.toUpperCase()}.`);

        // Store role for session handling
        localStorage.setItem("manualUser", JSON.stringify(user));

        switch (user.role) {
          case "student":
            window.location.href = "student/home.html";
            break;
          case "admin":
            window.location.href = "admin/dashboard.html";
            break;
        }
      } else {
        alert("Invalid email or password. Please try again.");
      }
    });
  }

  // --- Navbar profile update and modal functionality ---
  const navbarProfilePic = document.getElementById("nav-profile-pic");
  const modal = document.getElementById("profileModal");
  const closeModal = document.querySelector(".close-modal");

  if (navbarProfilePic) {
    const googleUser = JSON.parse(localStorage.getItem("googleUser"));
    const manualUser = JSON.parse(localStorage.getItem("manualUser"));

    if (googleUser && googleUser.picture) {
      navbarProfilePic.src = googleUser.picture;
      navbarProfilePic.style.borderRadius = "50%";
      // Update modal info
      updateProfileModal(googleUser.name, "ID: " + googleUser.email.split('@')[0]);
    } else if (manualUser) {
      // Default avatar for manual user
      navbarProfilePic.src = "../images/student_img/profile.png";
      navbarProfilePic.style.borderRadius = "50%";
      // Update modal info with dummy data
      updateProfileModal("Student User", "ID: 2020-00000");
    }

    // Add click event for profile picture
    navbarProfilePic.addEventListener("click", () => {
      modal.style.display = "block";
      updateTokenProgress();
    });

    // Close modal when clicking the close button
    if (closeModal) {
      closeModal.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  // Function to update profile modal information
  function updateProfileModal(name, id) {
    const studentName = document.getElementById("studentName");
    const studentId = document.getElementById("studentId");
    if (studentName && studentId) {
      studentName.textContent = name;
      studentId.textContent = id;
    }
  }

  // Function to update token progress bar
  function updateTokenProgress() {
    const tokenCount = document.getElementById("tokenCount");
    const progressBar = document.getElementById("tokenProgressBar");
    const maxTokens = 500; // Maximum tokens per semester
    const currentTokens = 350; // Example value - replace with actual token count

    if (tokenCount && progressBar) {
      tokenCount.textContent = currentTokens;
      const progress = (currentTokens / maxTokens) * 100;
      progressBar.style.width = progress + "%";
    }

    // Add some example notifications
    const notificationsList = document.getElementById("notificationsList");
    if (notificationsList) {
      notificationsList.innerHTML = `
        <div class="notification-item">
          <div class="notification-content">
            <div class="notification-title">Print Job Complete</div>
            <div class="notification-message">Your document "Assignment1.pdf" has been printed successfully</div>
            <div class="notification-time">2 hours ago</div>
          </div>
        </div>
        <div class="notification-item">
          <div class="notification-content">
            <div class="notification-title">Low Token Balance</div>
            <div class="notification-message">You have less than 100 tokens remaining</div>
            <div class="notification-time">1 day ago</div>
          </div>
        </div>
      `;
    }
  }
});

// --- Google Identity Services (SSO) ---
window.onload = function () {
  const googleSignInBtn = document.getElementById("g_id_signin");
  if (googleSignInBtn) {
    google.accounts.id.initialize({
      client_id: "45090330265-mntibu3tlf84kfpsctq1dtuta79cskiq.apps.googleusercontent.com",
      callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
      googleSignInBtn,
      { theme: "outline", size: "large", text: "signin_with" }
    );
  }
};

// --- Handle Google credential response ---
function handleCredentialResponse(response) {
  const data = JSON.parse(atob(response.credential.split('.')[1]));
  console.log("Google User Data:", data);

  localStorage.setItem("googleUser", JSON.stringify(data));

  const email = data.email.toLowerCase();
  alert(`Logged in as ${email}`);

  // --- Role detection logic ---
  if (email.includes("@slu.edu.ph")) {
    if (/^\d+@slu\.edu\.ph$/.test(email)) {
      window.location.href = "student/home.html";
    } else if (email.startsWith("admin@")) {
      window.location.href = "admin/dashboard.html";
    } else {
      alert("Unrecognized SLU account type.");
    }
  } else {
    alert("Access denied: Please use your SLU email account.");
  }
}

// --- Navbar profile + organization table ---
document.addEventListener("DOMContentLoaded", () => {
  // --- Navbar profile update (if user is logged in) ---
  const navbarProfilePic = document.getElementById("nav-profile-pic");

  if (navbarProfilePic) {
    const user = JSON.parse(localStorage.getItem("googleUser"));
    if (user && user.picture) {
      navbarProfilePic.src = user.picture;
      navbarProfilePic.style.borderRadius = "50%"; // make it round
    } else {
      // If not logged in, redirect back to login page
      // window.location.href = "../index.html";
    }
  }


});
