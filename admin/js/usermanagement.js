// usermanagement.js (cleaned - table view only)
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const usersBody = document.getElementById("usersBody");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const pageNumbers = document.getElementById("pageNumbers");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const selectAll = document.getElementById("selectAll");
  const sidebarQueueCount = document.getElementById("sidebarQueueCount");  

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // Modals
  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editEmail = document.getElementById('editEmail');
  const editName = document.getElementById('editName');
  const editCourse = document.getElementById('editCourse');
  const editStatus = document.getElementById('editStatus');
  const editRole = document.getElementById('editRole');
  const cancelEdit = document.getElementById('cancelEdit');

  const deleteModal = document.getElementById('deleteModal');
  const deleteMessage = document.getElementById('deleteMessage');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');

  // Logout elements
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  const cancelLogout = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");

  // -------------------------
  // State
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let users = [];
  let filtered = [];
  let activeFilters = { role: null, status: null, dateFrom: null, dateTo: null };

  let editingEmail = null;
  let deletingEmail = null;

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const USERS_ENDPOINT = `${API_BASE}/users`;
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Utility helpers
  // -------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusable = modal.querySelector('input,button,select,textarea');
    if (focusable) focusable.focus();
  }
  
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function statusPill(text) {
    if (!text) return '';
    if (text.toLowerCase() === "accepted") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }

  // -------------------------
  // API Functions
  // -------------------------
  async function fetchUsersWithPrintStats() {
    try {
      const usersResponse = await fetch(USERS_ENDPOINT);
      if (!usersResponse.ok) throw new Error(`HTTP error! status: ${usersResponse.status}`);
      const usersData = await usersResponse.json();
      
      const requestsResponse = await fetch(REQUESTS_ENDPOINT);
      if (!requestsResponse.ok) throw new Error(`HTTP error! status: ${requestsResponse.status}`);
      const requestsData = await requestsResponse.json();
      
      const transformedUsers = usersData.map(user => {
        const userRequests = requestsData.filter(request => 
          request.email === user.email || request.userId === user._id
        );
        
        const pendingRequests = userRequests.filter(req => req.status === "Pending").length;
        const acceptedRequests = userRequests.filter(req => req.status === "Accepted").length;
        const completedRequests = userRequests.filter(req => req.status === "Completed").length;
        const rejectedRequests = userRequests.filter(req => req.status === "Rejected").length;
        
        const userStatus = user.lastLogin ? "Accepted" : "Pending";
        const course = user.courseYear || extractCourseFromEmail(user.email) || "Unknown Course";
        
        return {
          _id: user._id,
          name: user.fullName || "Unknown User",
          email: user.email,
          course: course,
          status: userStatus,
          role: user.role || "User",
          lastActive: user.lastLogin ? new Date(user.lastLogin).toISOString().split('T')[0] : "Never",
          tokenBalance: user.tokenBalance || 0,
          printStats: {
            total: userRequests.length,
            pending: pendingRequests,
            accepted: acceptedRequests,
            completed: completedRequests,
            rejected: rejectedRequests
          }
        };
      });
      
      return transformedUsers;
      
    } catch (error) {
      console.error("Error fetching users:", error);
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
              <div>Error loading users</div>
              <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
            </td>
          </tr>
        `;
      }
      return [];
    }
  }

  function extractCourseFromEmail(email) {
    if (email.includes('@slu.edu.ph')) return "SLU Student";
    return "Student";
  }

  async function updateUser(userId, updates) {
    try {
      const response = await fetch(`${USERS_ENDPOINT}/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
      
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async function deleteUser(userId) {
    try {
      const response = await fetch(`${USERS_ENDPOINT}/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
      
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
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
      
      // Count pending requests
      const pendingCount = data.filter(request => request.status === "Pending").length;
      
      // Update sidebar queue count
      if (sidebarQueueCount) {
        sidebarQueueCount.textContent = pendingCount;
        if (pendingCount === 0) {
          sidebarQueueCount.style.display = 'none';
        } else {
          sidebarQueueCount.style.display = 'flex';
        }
      }
    } catch (error) {
      console.error("Error updating queue count:", error);
    }
  }

  // -------------------------
  // Renderers
  // -------------------------
  function renderTable(list) {
    if (!usersBody) return;
    
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    if (pageItems.length === 0) {
      usersBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px;">
            No users found
          </td>
        </tr>
      `;
      renderPagination(list.length);
      return;
    }

    usersBody.innerHTML = "";

    pageItems.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-check"><input type="checkbox" /></td>
        <td>
          <div class="user-name">
            <div class="user-avatar" aria-hidden="true">${u.name.split(",")[0]?.slice(0,1) || 'U'}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${u.name}</div>
              <div style="font-size:13px; color: #6b7780;">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${u.course}</td>
        <td>${statusPill(u.status)}</td>
        <td>${u.role}</td>
        <td class="col-actions">
          <img src="../../images/admin_img/write.png" alt="edit" title="Edit" class="action-icon edit" data-email="${u.email}" data-id="${u._id}" />
          <img src="../../images/admin_img/delete.png" alt="delete" title="Delete" class="action-icon del" data-email="${u.email}" data-id="${u._id}" />
        </td>
      `;
      usersBody.appendChild(tr);
    });

    renderPagination(list.length);
    attachModalRowActions();
  }

  // -------------------------
  // Pagination
  // -------------------------
  function renderPagination(totalItems) {
    if (!pageNumbers) return;
    
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    pageNumbers.innerHTML = "";
    
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "inactive";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderView(users);
      });
      pageNumbers.appendChild(btn);
    }
    
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) { currentPage--; renderView(users); }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filtered.length / perPage);
      if (currentPage < totalPages) { currentPage++; renderView(users); }
    });
  }

  // -------------------------
  // Filters
  // -------------------------
  function applyFiltersToList(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    
    return list.filter(u => {
      const matchesSearch = q === "" || 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        u.course.toLowerCase().includes(q) || 
        u.status.toLowerCase().includes(q);

      const matchesRole = activeFilters.role ? u.role === activeFilters.role : true;
      const matchesStatus = activeFilters.status ? u.status === activeFilters.status : true;
      
      let matchesDate = true;
      if (activeFilters.dateFrom) matchesDate = matchesDate && (new Date(u.lastActive) >= new Date(activeFilters.dateFrom));
      if (activeFilters.dateTo) matchesDate = matchesDate && (new Date(u.lastActive) <= new Date(activeFilters.dateTo));

      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
  }

  function renderView(list) {
    filtered = applyFiltersToList(list);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = 1;
    renderTable(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => { currentPage = 1; renderView(users); });
  }
  
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll("#usersBody input[type='checkbox']").forEach(cb => cb.checked = checked);
    });
  }

  // -------------------------
  // Filter menu
  // -------------------------
  if (filterBtn && filterMenu) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = filterMenu.classList.toggle("open");
      filterMenu.setAttribute("aria-hidden", String(!open));
      filterBtn.setAttribute("aria-expanded", String(open));
      if (open) {
        const first = filterMenu.querySelector("button");
        if (first) first.focus();
      } else {
        if (filterPanel) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
      }
    });

    filterMenu.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", () => {
      if (filterMenu.classList.contains("open")) {
        filterMenu.classList.remove("open");
        filterMenu.setAttribute("aria-hidden", "true");
        filterBtn.setAttribute("aria-expanded", "false");
        if (filterPanel) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filterMenu.classList.contains("open")) {
        filterMenu.classList.remove("open");
        filterMenu.setAttribute("aria-hidden", "true");
        filterBtn.setAttribute("aria-expanded", "false");
        if (filterPanel) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
      }
    });

    // handle clicks on menu items
    filterMenu.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const action = btn.dataset.action;
        if (action === "open-filter") {
          const f = btn.dataset.filter;
          openFilterPanel(f);
        } else if (action === "apply") {
          filterMenu.classList.remove("open");
          if (filterPanel) filterPanel.classList.add("visually-hidden");
        }
      });
    });
  }

  // -------------------------
  // Filter panel
  // -------------------------
  function openFilterPanel(type) {
    if (!filterPanel) return;
    filterPanel.innerHTML = "";
    filterPanel.classList.remove("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "false");

    if (type === "role") {
      const label = document.createElement("div"); label.textContent = "Role"; label.style.fontWeight = "700";
      const userBtn = document.createElement("button"); userBtn.textContent = "User"; userBtn.className = "small";
      const orgBtn = document.createElement("button"); orgBtn.textContent = "Organization"; orgBtn.className = "small";
      const clearBtn = document.createElement("button"); clearBtn.textContent = "Clear"; clearBtn.className = "small";

      userBtn.addEventListener("click", () => { activeFilters.role = "User"; currentPage = 1; renderView(users); hideFilterPanel(); });
      orgBtn.addEventListener("click", () => { activeFilters.role = "Organization"; currentPage = 1; renderView(users); hideFilterPanel(); });
      clearBtn.addEventListener("click", () => { activeFilters.role = null; currentPage = 1; renderView(users); hideFilterPanel(); });

      filterPanel.appendChild(label);
      filterPanel.appendChild(userBtn);
      filterPanel.appendChild(orgBtn);
      filterPanel.appendChild(clearBtn);
    }

    if (type === "status") {
      const label = document.createElement("div"); label.textContent = "Status"; label.style.fontWeight = "700";
      const accBtn = document.createElement("button"); accBtn.textContent = "Accepted";
      const pendBtn = document.createElement("button"); pendBtn.textContent = "Pending";
      const clearBtn = document.createElement("button"); clearBtn.textContent = "Clear";

      accBtn.addEventListener("click", () => { activeFilters.status = "Accepted"; currentPage = 1; renderView(users); hideFilterPanel(); });
      pendBtn.addEventListener("click", () => { activeFilters.status = "Pending"; currentPage = 1; renderView(users); hideFilterPanel(); });
      clearBtn.addEventListener("click", () => { activeFilters.status = null; currentPage = 1; renderView(users); hideFilterPanel(); });

      filterPanel.appendChild(label);
      filterPanel.appendChild(accBtn);
      filterPanel.appendChild(pendBtn);
      filterPanel.appendChild(clearBtn);
    }

    if (type === "date") {
      const label = document.createElement("div"); label.textContent = "Date range"; label.style.fontWeight = "700";
      const from = document.createElement("input"); from.type = "date"; from.value = activeFilters.dateFrom || "";
      const to = document.createElement("input"); to.type = "date"; to.value = activeFilters.dateTo || "";
      const apply = document.createElement("button"); apply.textContent = "Apply";
      const clear = document.createElement("button"); clear.textContent = "Clear";

      apply.addEventListener("click", () => {
        activeFilters.dateFrom = from.value || null;
        activeFilters.dateTo = to.value || null;
        currentPage = 1; renderView(users); hideFilterPanel();
      });
      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null; activeFilters.dateTo = null;
        currentPage = 1; renderView(users); hideFilterPanel();
      });

      filterPanel.appendChild(label);
      filterPanel.appendChild(from);
      filterPanel.appendChild(to);
      filterPanel.appendChild(apply);
      filterPanel.appendChild(clear);
    }
  }

  function hideFilterPanel() {
    if (!filterPanel) return;
    filterPanel.classList.add("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "true");
  }

  // -------------------------
  // Logout functionality
  // -------------------------
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
      window.location.href = '/index.html';
    });
  }

  // -------------------------
  // Edit & Delete Modals
  // -------------------------
  function openEditForEmail(email, userId) {
    const user = users.find(u => u.email === email && u._id === userId);
    if (!user) return;

    editingEmail = user.email;
    if (editEmail) editEmail.value = user.email || '';
    if (editName) editName.value = user.name || '';
    if (editCourse) editCourse.value = user.course || '';
    if (editStatus) editStatus.value = user.status || 'Pending';
    if (editRole) editRole.value = user.role || 'User';

    openModal(editModal);
  }

  function openDeleteForEmail(email, userId) {
    const user = users.find(u => u.email === email && u._id === userId);
    if (!user) return;
    
    deletingEmail = email;
    if (deleteMessage) deleteMessage.textContent = `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
    openModal(deleteModal);
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editingEmail) { closeModal(editModal); return; }
      
      const user = users.find(u => u.email === editingEmail);
      if (!user) { closeModal(editModal); return; }

      try {
        const updates = {
          fullName: (editName && editName.value) ? editName.value.trim() : user.name,
          courseYear: (editCourse && editCourse.value) ? editCourse.value.trim() : user.course,
          role: (editRole && editRole.value) ? editRole.value : user.role,
        };

        await updateUser(user._id, updates);

        user.name = updates.fullName;
        user.course = updates.courseYear;
        user.role = updates.role;

        editingEmail = null;
        renderView(users);
        closeModal(editModal);
        alert("User updated successfully!");
        
      } catch (error) {
        alert("Failed to update user. Please try again.");
        console.error("Error updating user:", error);
      }
    });
  }

  if (cancelEdit) cancelEdit.addEventListener('click', () => { editingEmail = null; closeModal(editModal); });
  if (cancelDelete) cancelDelete.addEventListener('click', () => { deletingEmail = null; closeModal(deleteModal); });
  
  if (confirmDelete) {
    confirmDelete.addEventListener('click', async () => {
      if (!deletingEmail) { closeModal(deleteModal); return; }
      
      const user = users.find(u => u.email === deletingEmail);
      if (!user) { closeModal(deleteModal); return; }

      try {
        await deleteUser(user._id);

        const userIndex = users.findIndex(u => u.email === deletingEmail);
        if (userIndex > -1) {
          users.splice(userIndex, 1);
          currentPage = 1;
          renderView(users);
        }
        
        deletingEmail = null;
        closeModal(deleteModal);
        alert("User deleted successfully!");
        
      } catch (error) {
        alert("Failed to delete user. Please try again.");
        console.error("Error deleting user:", error);
      }
    });
  }

  // backdrop click to close modals
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        if (modal === editModal) editingEmail = null;
        if (modal === deleteModal) deletingEmail = null;
        closeModal(modal);
      }
    });
  });

  // Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal && editModal.classList.contains('open')) { editingEmail = null; closeModal(editModal); }
      if (deleteModal && deleteModal.classList.contains('open')) { deletingEmail = null; closeModal(deleteModal); }
      if (logoutModal && logoutModal.classList.contains('open')) { closeModal(logoutModal); }
    }
  });

  // -------------------------
  // Action icons handlers
  // -------------------------
  function attachModalRowActions() {
    document.querySelectorAll('.action-icon.edit').forEach(original => {
      const clone = original.cloneNode(true);
      original.parentNode.replaceChild(clone, original);
    });
    document.querySelectorAll('.action-icon.del').forEach(original => {
      const clone = original.cloneNode(true);
      original.parentNode.replaceChild(clone, original);
    });

    document.querySelectorAll('.action-icon.edit').forEach(el => {
      el.addEventListener('click', () => {
        const email = el.getAttribute('data-email');
        const userId = el.getAttribute('data-id');
        if (email && userId) openEditForEmail(email, userId);
      });
    });
    
    document.querySelectorAll('.action-icon.del').forEach(el => {
      el.addEventListener('click', () => {
        const email = el.getAttribute('data-email');
        const userId = el.getAttribute('data-id');
        if (email && userId) openDeleteForEmail(email, userId);
      });
    });
  }

  // -------------------------
  // Initialize
  // -------------------------
  async function initialize() {
    try {
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px;">
              <div>Loading users...</div>
            </td>
          </tr>
        `;
      }
      
      users = await fetchUsersWithPrintStats();
      
      // Update queue count
      await updateQueueCount();
      
      renderView(users);
      
    } catch (error) {
      console.error("Error initializing user management:", error);
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
              <div>Error loading users</div>
            </td>
          </tr>
        `;
      }
    }
  }

  // Start the application
  initialize();

  // Set up periodic queue count updates (every 30 seconds)
  setInterval(updateQueueCount, 30000);
});