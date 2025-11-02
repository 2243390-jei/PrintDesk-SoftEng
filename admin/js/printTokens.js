// printTokens.js - User Tokens Management with Reset Scheduling
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const usersBody = document.getElementById("usersBody");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  
  // Token reset elements
  const resetBtn = document.getElementById("resetTokensBtn");
  const cancelResetBtn = document.getElementById("cancelResetBtn");
  const rescheduleResetBtn = document.getElementById("rescheduleResetBtn");
  const resetDate = document.getElementById("resetDate");
  const resetStatus = document.getElementById("resetStatus");

  // -------------------------
  // State
  // -------------------------
  let users = []; // Will be populated from backend
  let filteredUsers = [];
  let currentScheduledReset = null;

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const USERS_ENDPOINT = `${API_BASE}/users`;
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;
  const RESET_TOKENS_ENDPOINT = `${API_BASE}/reset-tokens`;
  const RESET_TOKENS_CANCEL_ENDPOINT = `${API_BASE}/cancel-reset`;

  // set footer year if element exists
  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Utility helpers
  // -------------------------
  // Format date for display
  function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // -------------------------
  // API Functions
  // -------------------------
  async function fetchUsersWithTokens() {
    try {
      console.log("Fetching users and print requests...");
      
      // Fetch all users
      const usersResponse = await fetch(USERS_ENDPOINT);
      if (!usersResponse.ok) {
        throw new Error(`HTTP error! status: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      
      // Fetch all print requests to get course information
      const requestsResponse = await fetch(REQUESTS_ENDPOINT);
      if (!requestsResponse.ok) {
        throw new Error(`HTTP error! status: ${requestsResponse.status}`);
      }
      const requestsData = await requestsResponse.json();
      
      console.log(`Found ${usersData.length} users and ${requestsData.length} print requests`);
      
      // Transform users data with course information
      const transformedUsers = usersData.map(user => {
        // Find user's print requests
        const userRequests = requestsData.filter(request => 
          request.email === user.email || request.userId === user._id
        );
        
        // Extract course from user's print requests or use default
        let course = "Unknown Course";
        if (user.courseYear) {
          course = user.courseYear;
        } else if (userRequests.length > 0) {
          // Get course from the most recent print request
          const latestRequest = userRequests.reduce((latest, current) => {
            return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
          });
          course = latestRequest.courseYear || "Unknown Course";
        } else {
          // Try to extract from email as fallback
          course = extractCourseFromEmail(user.email) || "Unknown Course";
        }
        
        return {
          _id: user._id,
          name: user.fullName || "Unknown User",
          email: user.email,
          course: course,
          totalTokens: user.tokenBalance || 500,
        };
      });
      
      console.log("User data transformation complete");
      return transformedUsers;
      
    } catch (error) {
      console.error("Error fetching users:", error);
      // Show user-friendly error message
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">
              <div>Error loading users</div>
              <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
              <div style="font-size: 12px;">Please check if the server is running on ${API_BASE}</div>
            </td>
          </tr>
        `;
      }
      return [];
    }
  }

  // Helper function to extract course from email
  function extractCourseFromEmail(email) {
    if (email.includes('@slu.edu.ph')) {
      return "SLU Student";
    }
    return "Student";
  }

  // Token reset functions
  async function scheduleTokenReset(resetDate) {
    try {
      console.log(`Scheduling token reset for: ${resetDate}`);
      
      const response = await fetch(RESET_TOKENS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resetDate })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Token reset scheduled successfully:", result);
      return result;
      
    } catch (error) {
      console.error("Error scheduling token reset:", error);
      throw error;
    }
  }

  async function cancelTokenReset() {
    try {
      console.log("Cancelling token reset");
      
      const response = await fetch(RESET_TOKENS_CANCEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Token reset cancelled successfully:", result);
      return result;
      
    } catch (error) {
      console.error("Error cancelling token reset:", error);
      throw error;
    }
  }

  async function getScheduledReset() {
    try {
      const response = await fetch(`${RESET_TOKENS_ENDPOINT}/scheduled`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No scheduled reset
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Scheduled reset found:", result);
      return result;
      
    } catch (error) {
      console.error("Error getting scheduled reset:", error);
      return null;
    }
  }

  // -------------------------
  // Token Reset Feature
  // -------------------------
  function initializeTokenReset() {
    if (!resetBtn || !resetDate || !cancelResetBtn || !rescheduleResetBtn || !resetStatus) return;

    // Load current scheduled reset
    loadScheduledReset();

    // Schedule new reset
    resetBtn.addEventListener("click", async () => {
      const dateValue = resetDate.value;
      if (!dateValue) {
        alert("Please select a date to schedule the token reset.");
        return;
      }

      // Validate date is in the future
      const selectedDate = new Date(dateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate <= today) {
        alert("Please select a future date for the token reset.");
        return;
      }

      try {
        // Schedule token reset with backend
        const result = await scheduleTokenReset(dateValue);
        currentScheduledReset = result;
        
        updateResetUI(true, dateValue);
        alert(`Tokens will reset to 500 on ${formatDateForDisplay(dateValue)}`);

        // Save to localStorage for frontend checking (backup)
        localStorage.setItem("tokenResetDate", dateValue);
        localStorage.setItem("tokenResetId", result.resetId);
        
      } catch (error) {
        alert("Failed to schedule token reset. Please try again.");
        console.error("Error scheduling token reset:", error);
      }
    });

    // Cancel reset
    cancelResetBtn.addEventListener("click", async () => {
      if (!currentScheduledReset) {
        alert("No token reset is currently scheduled.");
        return;
      }

      if (!confirm("Are you sure you want to cancel the scheduled token reset?")) {
        return;
      }

      try {
        await cancelTokenReset();
        currentScheduledReset = null;
        
        updateResetUI(false);
        alert("Token reset has been cancelled.");
        
        // Clear localStorage
        localStorage.removeItem("tokenResetDate");
        localStorage.removeItem("tokenResetId");
        
      } catch (error) {
        alert("Failed to cancel token reset. Please try again.");
        console.error("Error cancelling token reset:", error);
      }
    });

    // Reschedule reset
    rescheduleResetBtn.addEventListener("click", async () => {
      const dateValue = resetDate.value;
      if (!dateValue) {
        alert("Please select a new date to reschedule the token reset.");
        return;
      }

      // Validate date is in the future
      const selectedDate = new Date(dateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate <= today) {
        alert("Please select a future date for the token reset.");
        return;
      }

      try {
        // Cancel current reset first
        if (currentScheduledReset) {
          await cancelTokenReset();
        }
        
        // Schedule new reset
        const result = await scheduleTokenReset(dateValue);
        currentScheduledReset = result;
        
        updateResetUI(true, dateValue);
        alert(`Token reset rescheduled to ${formatDateForDisplay(dateValue)}`);

        // Update localStorage
        localStorage.setItem("tokenResetDate", dateValue);
        localStorage.setItem("tokenResetId", result.resetId);
        
      } catch (error) {
        alert("Failed to reschedule token reset. Please try again.");
        console.error("Error rescheduling token reset:", error);
      }
    });

    // Check daily if today's date matches the scheduled reset
    checkScheduledTokenReset();
  }

  async function loadScheduledReset() {
    try {
      const scheduledReset = await getScheduledReset();
      if (scheduledReset) {
        currentScheduledReset = scheduledReset;
        updateResetUI(true, scheduledReset.resetDate);
        
        // Update localStorage
        localStorage.setItem("tokenResetDate", scheduledReset.resetDate);
        localStorage.setItem("tokenResetId", scheduledReset._id);
      } else {
        // Check localStorage as backup
        const savedDate = localStorage.getItem("tokenResetDate");
        const savedId = localStorage.getItem("tokenResetId");
        
        if (savedDate && savedId) {
          currentScheduledReset = {
            _id: savedId,
            resetDate: savedDate
          };
          updateResetUI(true, savedDate);
        } else {
          updateResetUI(false);
        }
      }
    } catch (error) {
      console.error("Error loading scheduled reset:", error);
      // Fallback to localStorage
      const savedDate = localStorage.getItem("tokenResetDate");
      const savedId = localStorage.getItem("tokenResetId");
      
      if (savedDate && savedId) {
        currentScheduledReset = {
          _id: savedId,
          resetDate: savedDate
        };
        updateResetUI(true, savedDate);
      } else {
        updateResetUI(false);
      }
    }
  }

  function updateResetUI(isScheduled, resetDateValue = null) {
    if (isScheduled && resetDateValue) {
      // Reset is scheduled
      resetBtn.style.display = "none";
      
      cancelResetBtn.style.display = "inline-block";
      rescheduleResetBtn.style.display = "inline-block";
      
      resetDate.value = resetDateValue.split('T')[0]; // Set the date input
      
      if (resetStatus) {
        resetStatus.textContent = `Token reset scheduled for ${formatDateForDisplay(resetDateValue)}`;
        resetStatus.style.color = "#28a745";
        resetStatus.style.fontWeight = "600";
        resetStatus.style.marginTop = "10px";
      }
    } else {
      // No reset scheduled
      resetBtn.style.display = "inline-block";
      
      cancelResetBtn.style.display = "none";
      rescheduleResetBtn.style.display = "none";
      
      resetDate.value = "";
      
      if (resetStatus) {
        resetStatus.textContent = "No token reset scheduled";
        resetStatus.style.color = "#6c757d";
        resetStatus.style.fontWeight = "400";
        resetStatus.style.marginTop = "10px";
      }
    }
  }

  function checkScheduledTokenReset() {
    const savedDate = localStorage.getItem("tokenResetDate");
    if (savedDate && new Date(savedDate).toDateString() === new Date().toDateString()) {
      // Reset would happen here via backend cron job
      console.log("Token reset scheduled for today - should be handled by backend cron job");
      
      // Clear the scheduled date after today
      localStorage.removeItem("tokenResetDate");
      localStorage.removeItem("tokenResetId");
      currentScheduledReset = null;
      updateResetUI(false);
      
      // Refresh data to show updated tokens
      refreshUserData();
    }
  }

  async function refreshUserData() {
    try {
      users = await fetchUsersWithTokens();
      renderUsersTable(users);
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  }

  // -------------------------
  // Render Users Table
  // -------------------------
  function renderUsersTable(usersList) {
    if (!usersBody) return;
    
    console.log(`Rendering users table with ${usersList.length} users`);

    if (usersList.length === 0) {
      usersBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 20px;">
            No users found
          </td>
        </tr>
      `;
      return;
    }

    usersBody.innerHTML = "";

    usersList.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.course}</td>
        <td>${user.totalTokens}</td>
      `;
      usersBody.appendChild(tr);
    });
  }

  // -------------------------
  // Search Functionality
  // -------------------------
  function initializeSearch() {
    if (!searchInput) return;

    searchInput.addEventListener("input", () => { 
      console.log("Search input changed:", searchInput.value);
      const searchTerm = searchInput.value.toLowerCase().trim();
      
      if (searchTerm === "") {
        filteredUsers = [...users];
      } else {
        filteredUsers = users.filter(user => 
          user.name.toLowerCase().includes(searchTerm) || 
          user.email.toLowerCase().includes(searchTerm) || 
          user.course.toLowerCase().includes(searchTerm) ||
          user.totalTokens.toString().includes(searchTerm)
        );
      }
      
      renderUsersTable(filteredUsers);
    });
  }

  // -------------------------
  // Initialize Application
  // -------------------------
  async function initialize() {
    try {
      console.log("Initializing user tokens management...");
      
      // Show loading state
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 20px;">
              <div>Loading users...</div>
              <div style="font-size: 12px; margin-top: 8px;">Connecting to ${API_BASE}</div>
            </td>
          </tr>
        `;
      }
      
      // Fetch data from backend
      console.log("Fetching data from API...");
      users = await fetchUsersWithTokens();
      filteredUsers = [...users];
      console.log(`Retrieved ${users.length} users`);
      
      if (users.length === 0) {
        console.log("No users found in database");
        if (usersBody) {
          usersBody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 20px;">
                No users found in the system
              </td>
            </tr>
          `;
        }
        return;
      }
      
      // Initialize token reset feature
      initializeTokenReset();
      
      // Initialize search
      initializeSearch();
      
      // Render the table
      console.log("Rendering users table...");
      renderUsersTable(users);
      console.log("User tokens management initialized successfully");
      
    } catch (error) {
      console.error("Error initializing user tokens management:", error);
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">
              <div>Error loading users</div>
              <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
            </td>
          </tr>
        `;
      }
    }
  }

  // Start the application
  initialize();

  // Expose some helpers to console for quick testing
  window.__tokensDemo = {
    users: () => users,
    refreshData: async () => {
      console.log("Manually refreshing data...");
      users = await fetchUsersWithTokens();
      filteredUsers = [...users];
      renderUsersTable(users);
    },
    getScheduledReset: () => currentScheduledReset
  };
  
  console.log("User tokens management loaded. Use window.__tokensDemo for debugging.");
});