// printTokens.js - User Tokens Management with Reset Scheduling
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const usersBody = document.getElementById("usersBody");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const sidebarQueueCount = document.getElementById("sidebarQueueCount");
  
  // Token reset elements
  const resetBtn = document.getElementById("resetTokensBtn");
  const cancelResetBtn = document.getElementById("cancelResetBtn");
  const rescheduleResetBtn = document.getElementById("rescheduleResetBtn");
  const resetDate = document.getElementById("resetDate");
  const resetStatus = document.getElementById("resetStatus");

  // Logout elements
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const confirmLogout = document.getElementById('confirmLogout');

  // -------------------------
  // State
  // -------------------------
  let users = []
  let filteredUsers = []
  let currentScheduledReset = null
  let currentPage = 1
  const ROWS_PER_PAGE = 10 // Pagination rows per page

  // API endpoints - will be set dynamically
  let API_BASE = "http://localhost:3000"; // fallback
  let USERS_ENDPOINT = `${API_BASE}/users`;
  let REQUESTS_ENDPOINT = `${API_BASE}/requests`;
  let RESET_TOKENS_ENDPOINT = `${API_BASE}/reset-tokens`;
  let RESET_TOKENS_CANCEL_ENDPOINT = `${API_BASE}/cancel-reset`;
  let RESET_TOKENS_EXECUTE_ENDPOINT = `${API_BASE}/execute-token-reset`;
  let RESET_TOKENS_SCHEDULED_ENDPOINT = `${API_BASE}/reset-tokens/scheduled`;

  // Load dynamic API endpoint
  (async () => {
    API_BASE = await getApiEndpoint();
    USERS_ENDPOINT = `${API_BASE}/users`;
    REQUESTS_ENDPOINT = `${API_BASE}/requests`;
    RESET_TOKENS_ENDPOINT = `${API_BASE}/reset-tokens`;
    RESET_TOKENS_CANCEL_ENDPOINT = `${API_BASE}/cancel-reset`;
    RESET_TOKENS_EXECUTE_ENDPOINT = `${API_BASE}/execute-token-reset`;
    RESET_TOKENS_SCHEDULED_ENDPOINT = `${API_BASE}/reset-tokens/scheduled`;
    await initialize();
  })();

  // Set footer year if element exists
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

  // Check if a date is today
  function isToday(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Token reset cancelled successfully:", result);
      return result;
      
    } catch (error) {
      console.error("Error cancelling token reset:", error);
      throw error;
    }
  }

  async function executeTokenReset() {
    try {
      const resp = await fetch(RESET_TOKENS_EXECUTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // no payload required by server
      })

      const body = await resp.json().catch(() => null)
      if (!resp.ok) {
        const msg = (body && (body.error || body.message)) || resp.statusText
        throw new Error(msg)
      }

      return body || { message: 'Token reset executed' }
    } catch (err) {
      console.error('executeTokenReset error:', err)
      throw err
    }
  }

  async function getScheduledReset() {
    try {
      const response = await fetch(RESET_TOKENS_SCHEDULED_ENDPOINT);
      if (!response.ok) {
        if (response.status === 404) {
          console.log("No scheduled reset found");
          return null; // No scheduled reset
        }
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Scheduled reset found:", result);
      return result;
      
    } catch (error) {
      console.error("Error fetching scheduled reset:", error.message);
      return null;
    }
  }

  // -------------------------
  // Token Reset Feature
  // -------------------------
  function initializeTokenReset() {
    if (!resetBtn || !resetDate || !cancelResetBtn || !rescheduleResetBtn || !resetStatus) return;

    // Set minimum date to tomorrow for scheduling
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    resetDate.min = tomorrow.toISOString().split('T')[0];

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
      selectedDate.setHours(0, 0, 0, 0);
      
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

        // Save to localStorage as backup
        localStorage.setItem("tokenResetDate", dateValue);
        localStorage.setItem("tokenResetId", result.resetId);
        
      } catch (error) {
        alert("Failed to schedule token reset: " + error.message);
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
        alert("Failed to cancel token reset: " + error.message);
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
      selectedDate.setHours(0, 0, 0, 0);
      
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
        alert("Failed to reschedule token reset: " + error.message);
        console.error("Error rescheduling token reset:", error);
      }
    });

    // Check if today is reset day
    checkAndExecuteScheduledReset();
  }

  async function loadScheduledReset() {
    try {
      const scheduledReset = await getScheduledReset();
      if (scheduledReset && !scheduledReset.error) {
        currentScheduledReset = scheduledReset;
        updateResetUI(true, scheduledReset.resetDate);
        
        // Update localStorage
        localStorage.setItem("tokenResetDate", scheduledReset.resetDate);
        localStorage.setItem("tokenResetId", scheduledReset._id);
        
        // Check if this reset should happen today
        if (isToday(scheduledReset.resetDate)) {
          await handleTodayReset(scheduledReset);
        }
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
          
          // Check if this reset should happen today
          if (isToday(savedDate)) {
            await handleTodayReset(currentScheduledReset);
          }
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
        
        // Check if this reset should happen today
        if (isToday(savedDate)) {
          await handleTodayReset(currentScheduledReset);
        }
      } else {
        updateResetUI(false);
      }
    }
  }

  async function executeTokenReset() {
    try {
      const resp = await fetch(RESET_TOKENS_EXECUTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // no payload required by server
      })

      const body = await resp.json().catch(() => null)
      if (!resp.ok) {
        const msg = (body && (body.error || body.message)) || resp.statusText
        throw new Error(msg)
      }

      return body || { message: 'Token reset executed' }
    } catch (err) {
      console.error('executeTokenReset error:', err)
      throw err
    }
  }

  // Example: call and handle UI update
  async function handleTodayReset(scheduledReset) {
    try {
      const result = await executeTokenReset()
      alert(result.message || 'All user tokens have been reset to 500.')
      // remove scheduled info & refresh users
      try { await fetch(RESET_TOKENS_CANCEL_ENDPOINT, { method: 'POST' }) } catch (_) {}
      localStorage.removeItem('tokenResetDate')
      localStorage.removeItem('tokenResetId')
      currentScheduledReset = null
      updateResetUI(false)
      await refreshUserData()
    } catch (err) {
      alert('Failed to execute token reset. Please try manually.')
    }
  }

  async function checkAndExecuteScheduledReset() {
    if (!currentScheduledReset) return;
    
    if (isToday(currentScheduledReset.resetDate)) {
      await handleTodayReset(currentScheduledReset);
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
        resetStatus.style.padding = "10px";
        resetStatus.style.borderRadius = "6px";
        resetStatus.style.background = "#e8f5e8";
        resetStatus.style.border = "1px solid #28a745";
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
        resetStatus.style.padding = "10px";
        resetStatus.style.borderRadius = "6px";
        resetStatus.style.background = "#f8f9fa";
        resetStatus.style.border = "1px solid #dee2e6";
      }
    }
  }

  async function refreshUserData() {
    try {
      users = await fetchUsersWithTokens();
      filteredUsers = [...users];
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

    // Sort users by name A-Z
    const sortedUsers = [...usersList].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    // Calculate pagination
    const totalPages = Math.ceil(sortedUsers.length / ROWS_PER_PAGE);
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

    usersBody.innerHTML = "";

    paginatedUsers.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.course}</td>
        <td>${user.totalTokens}</td>
      `;
      usersBody.appendChild(tr);
    });

    // Add pagination controls if needed
    updatePaginationControls(totalPages);
  }

  function updatePaginationControls(totalPages) {
    // Find or create pagination container
    let paginationContainer = document.getElementById("tablePagination");
    
    if (!paginationContainer && totalPages > 1) {
      const tableWrap = document.querySelector(".table-wrap");
      const tableFooter = document.createElement("div");
      tableFooter.className = "table-footer";
      
      const pagination = document.createElement("div");
      pagination.className = "pagination";
      paginationContainer = pagination;
      paginationContainer.id = "tablePagination";
      
      tableFooter.appendChild(pagination);
      tableWrap.parentNode.insertBefore(tableFooter, tableWrap.nextSibling);
    }

    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.parentElement.style.display = "none";
      return;
    }

    // Clamp currentPage
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    paginationContainer.parentElement.style.display = "flex";
    paginationContainer.innerHTML = "";

    // Prev button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "«";
    prevBtn.className = "pagination-btn pagination-prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderUsersTable(filteredUsers);
      }
    };
    paginationContainer.appendChild(prevBtn);

    // Page numbers container
    const pageNumbers = document.createElement("div");
    pageNumbers.className = "page-numbers";

    // Logic: show up to 5 page buttons.
    // - If totalPages <= 5: show 1..totalPages
    // - If currentPage <= 5: show 1..5
    // - If currentPage > 5: show [1] then pages (currentPage-3 .. currentPage)
    let startPage, endPage;
    if (totalPages <= 5) {
      startPage = 1;
      endPage = totalPages;
    } else if (currentPage <= 5) {
      startPage = 1;
      endPage = 5;
    } else {
      // show first page separately, then a block of 4 pages ending at currentPage
      startPage = Math.max(2, currentPage - 3); // starts at least at 2 (since 1 will be shown)
      endPage = currentPage;
      // make sure we still show 4 pages in the block when possible
      if (endPage - startPage + 1 < 4) {
        startPage = Math.max(2, endPage - 3);
      }
    }

    // If startPage > 1 show first page (no ellipsis)
    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.textContent = "1";
      firstBtn.className = `pagination-btn ${currentPage === 1 ? 'active' : 'inactive'}`;
      firstBtn.onclick = () => { currentPage = 1; renderUsersTable(filteredUsers); };
      pageNumbers.appendChild(firstBtn);
    }

    // Add the calculated page buttons
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = `pagination-btn ${i === currentPage ? 'active' : 'inactive'}`;
      btn.onclick = () => { currentPage = i; renderUsersTable(filteredUsers); };
      pageNumbers.appendChild(btn);
    }

    paginationContainer.appendChild(pageNumbers);

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "»";
    nextBtn.className = "pagination-btn pagination-next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderUsersTable(filteredUsers);
      }
    };
    paginationContainer.appendChild(nextBtn);
  }

  // -------------------------
  // Search Functionality
  // -------------------------
  function initializeSearch() {
    if (!searchInput) return;

    searchInput.addEventListener("input", () => { 
      console.log("Search input changed:", searchInput.value);
      const searchTerm = searchInput.value.toLowerCase().trim();
      
      // Reset to first page when searching
      currentPage = 1;
      
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
  // Queue Count Update
  // -------------------------
  async function updateQueueCount() {
    try {
      const response = await fetch(REQUESTS_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count only pending requests scheduled for today or later
      const todayAndFuturePending = Array.isArray(data)
        ? data.filter(r => {
            if (String(r.status).toLowerCase() !== 'pending') return false;

            const requestDate = new Date(r.createdAt);
            requestDate.setHours(0, 0, 0, 0);

            return requestDate >= today;
          }).length
        : 0;

      // Update sidebar queue count
      if (sidebarQueueCount) {
        sidebarQueueCount.textContent = todayAndFuturePending;
        sidebarQueueCount.classList.toggle('has-count', todayAndFuturePending > 0);
      }
    } catch (error) {
      console.error("Error updating queue count:", error);
    }
  }

  // -------------------------
  // Logout functionality
  // -------------------------
  function initializeLogout() {
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(logoutModal);
      });
    }

    if (cancelLogout) {
      cancelLogout.addEventListener('click', function() {
        closeModal(logoutModal);
      });
    }

    if (confirmLogout) {
      confirmLogout.addEventListener('click', function() {
        // Perform logout actions here
        window.location.href = '/index.html';
      });
    }

    // backdrop click to close modal
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          closeModal(modal);
        }
      });
    });

    // Escape closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (logoutModal && logoutModal.classList.contains('open')) { 
          closeModal(logoutModal); 
        }
      }
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
      
      // FIRST: Load scheduled reset BEFORE fetching users
      console.log("Loading scheduled reset...");
      await loadScheduledReset();
      
      // SECOND: Fetch users (tokens might be updated by reset)
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
      
      // Initialize logout functionality
      initializeLogout();
      
      // Update queue count
      await updateQueueCount();
      
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

  // Application initialized in async IIFE above

  // Expose helpers to console for debugging
  window.__tokensDemo = {
    users: () => users,
    refreshData: async () => {
      console.log("Manually refreshing data...");
      users = await fetchUsersWithTokens();
      filteredUsers = [...users];
      renderUsersTable(users);
    },
    getScheduledReset: () => currentScheduledReset,
    executeResetNow: async () => {
      try {
        const result = await executeTokenReset();
        alert(result.message);
        await refreshUserData();
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };
  
  console.log("User tokens management loaded. Use window.__tokensDemo for debugging.");
});