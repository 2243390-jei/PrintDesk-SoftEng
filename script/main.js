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

  // --- Navbar profile update (if user is logged in) ---
  const navbarProfilePic = document.getElementById("nav-profile-pic");
  if (navbarProfilePic) {
    const googleUser = JSON.parse(localStorage.getItem("googleUser"));
    const manualUser = JSON.parse(localStorage.getItem("manualUser"));

    if (googleUser && googleUser.picture) {
      navbarProfilePic.src = googleUser.picture;
      navbarProfilePic.style.borderRadius = "50%";
    } else if (manualUser) {
      // Default avatar for manual user
      navbarProfilePic.src = "../assets/default-avatar.png";
      navbarProfilePic.style.borderRadius = "50%";
    } else {
      // Not logged in — redirect to login
      window.location.href = "../index.html";
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
