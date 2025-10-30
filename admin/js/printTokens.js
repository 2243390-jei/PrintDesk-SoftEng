const users = [
  { name: "Faith Bibit-Chee", email: "2211111@slu.edu.ph", courseYear: "BSIT 3rd Year", totalTokens: 350 },
  { name: "Luke Lieflander Viloria", email: "2211112@slu.edu.ph", courseYear: "BSCS 2nd Year", totalTokens: 217 },
  { name: "Eds Oway", email: "2211113@slu.edu.ph", courseYear: "BSIT 4th Year", totalTokens: 554 },
  { name: "Onyok Sabado", email: "2211114@slu.edu.ph", courseYear: "BSCS 1st Year", totalTokens: 500 },
  { name: "Jared Lipawen", email: "2211115@slu.edu.ph", courseYear: "BSIT 2nd Year", totalTokens: 391 }
];

// Get table body element
const tableBody = document.getElementById("usersBody");

// Function to populate table rows
function populateUserTable() {
  tableBody.innerHTML = ""; // Clear previous rows

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.courseYear}</td>
      <td>${user.totalTokens}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", populateUserTable);

// RESET TOKENS FEATURE — Schedules token reset on a date

document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.getElementById("resetTokensBtn");
  const resetDate = document.getElementById("resetDate");

  resetBtn.addEventListener("click", () => {
    const dateValue = resetDate.value;
    if (!dateValue) {
      alert("Please select a date to schedule the token reset.");
      return;
    }

    // Save the chosen reset date (can be replaced with backend logic)
    localStorage.setItem("tokenResetDate", dateValue);
    alert(`Tokens will reset to 500 on ${new Date(dateValue).toDateString()}`);

    // Disable the button after scheduling
    resetBtn.disabled = true;
    resetBtn.textContent = "RESET SCHEDULED";
    resetBtn.style.backgroundColor = "#777";
  });

  // Check daily if today's date matches the scheduled reset
  const savedDate = localStorage.getItem("tokenResetDate");
  if (savedDate && new Date(savedDate).toDateString() === new Date().toDateString()) {
    users.forEach(user => {
      user.totalTokens = 500; // Reset all tokens
    });
    populateUserTable(); // Update UI
    localStorage.removeItem("tokenResetDate");
    alert("Tokens have been reset to 500 for all users!");
  }
});

// Search Bar
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");

  searchInput.addEventListener("input", (e) => {
    const filter = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#usersBody tr");

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? "" : "none";
    });
  });
});
