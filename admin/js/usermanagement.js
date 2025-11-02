// usermanagement.js (complete file - Database Connected Version)
// Note: save as usermanagement.js and ensure it's loaded with `defer` in your HTML.

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const usersBody = document.getElementById("usersBody");
  const cardsContainer = document.getElementById("cardsContainer");
  const listContainer = document.getElementById("listContainer");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const pageNumbers = document.getElementById("pageNumbers");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const selectAll = document.getElementById("selectAll");

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // Modals (ensure your HTML contains these)
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

  // -------------------------
  // State
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let users = []; // Will be populated from backend
  let filtered = [];
  let view = "table"; // 'table' | 'board' | 'list'
  let activeFilters = { role: null, status: null, dateFrom: null, dateTo: null };

  // track which user is being edited / deleted (use email identifier)
  let editingEmail = null;
  let deletingEmail = null;

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const USERS_ENDPOINT = `${API_BASE}/users`;
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  // set footer year if element exists
  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Utility helpers
  // -------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // focus first focusable element
    const focusable = modal.querySelector('input,button,select,textarea');
    if (focusable) focusable.focus();
  }
  
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function statusPill(text) {
    if (!text) return '';
    if (text.toLowerCase() === "accepted") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }
  
  function statusPillText(text) {
    if (!text) return '';
    if (text.toLowerCase() === "accepted") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }

  // -------------------------
  // API Functions
  // -------------------------
  async function fetchUsersWithPrintStats() {
    try {
      console.log("Fetching users and print requests...");
      
      // Fetch all users
      const usersResponse = await fetch(USERS_ENDPOINT);
      if (!usersResponse.ok) {
        throw new Error(`HTTP error! status: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      
      // Fetch all print requests to calculate user stats
      const requestsResponse = await fetch(REQUESTS_ENDPOINT);
      if (!requestsResponse.ok) {
        throw new Error(`HTTP error! status: ${requestsResponse.status}`);
      }
      const requestsData = await requestsResponse.json();
      
      console.log(`Found ${usersData.length} users and ${requestsData.length} print requests`);
      
      // Transform users data with print statistics
      const transformedUsers = usersData.map(user => {
        // Find user's print requests
        const userRequests = requestsData.filter(request => 
          request.email === user.email || request.userId === user._id
        );
        
        // Calculate statistics
        const pendingRequests = userRequests.filter(req => req.status === "Pending").length;
        const acceptedRequests = userRequests.filter(req => req.status === "Accepted").length;
        const completedRequests = userRequests.filter(req => req.status === "Completed").length;
        const rejectedRequests = userRequests.filter(req => req.status === "Rejected").length;
        
        // Determine user status based on registration and requests
        const userStatus = user.lastLogin ? "Accepted" : "Pending";
        
        // Extract course from email or use default
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
      
      console.log("User data transformation complete");
      return transformedUsers;
      
    } catch (error) {
      console.error("Error fetching users:", error);
      // Show user-friendly error message
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
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
    // This is a simple example - adjust based on your email patterns
    if (email.includes('@slu.edu.ph')) {
      return "SLU Student";
    }
    return "Student";
  }

  async function updateUser(userId, updates) {
    try {
      console.log(`Updating user ${userId}:`, updates);
      
      const response = await fetch(`${USERS_ENDPOINT}/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("User update successful:", result);
      return result;
      
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async function deleteUser(userId) {
    try {
      console.log(`Deleting user ${userId}`);
      
      const response = await fetch(`${USERS_ENDPOINT}/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("User deletion successful:", result);
      return result;
      
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // -------------------------
  // Renderers
  // -------------------------
  function renderTable(list) {
    if (!usersBody) return;
    
    console.log(`Rendering table view with ${list.length} users`);

    // show table, hide others
    const tableEl = usersBody.closest("table");
    if (tableEl) tableEl.style.display = "";
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

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

  function renderBoard(list) {
    console.log(`Rendering board view with ${list.length} users`);
    
    // hide table, show cards
    const tableEl = usersBody ? usersBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (cardsContainer) { cardsContainer.classList.remove("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "false"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    if (!cardsContainer) return;
    
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    if (pageItems.length === 0) {
      cardsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
          No users found
        </div>
      `;
      renderPagination(list.length);
      return;
    }

    cardsContainer.innerHTML = "";

    pageItems.forEach(u => {
      const div = document.createElement("div");
      div.className = "card-item";
      div.innerHTML = `
        <div class="avatar">${u.name.split(",")[0]?.slice(0,1) || 'U'}</div>
        <div class="meta">
          <div class="name">${u.name}</div>
          <div class="email">${u.email}</div>
          <div style="font-size:13px;color:#6b7780;">${u.course} • ${u.role}</div>
          <div style="margin-top:8px;">${statusPillText(u.status)}</div>
          <div style="font-size:12px;color:#888;margin-top:4px;">
            Tokens: ${u.tokenBalance} | Prints: ${u.printStats?.total || 0}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;gap:8px;">
          <img src="../images/admin_img/write.png" class="action-icon edit" data-email="${u.email}" data-id="${u._id}" title="Edit" style="cursor:pointer;" />
          <img src="../images/admin_img/delete.png" class="action-icon del" data-email="${u.email}" data-id="${u._id}" title="Delete" style="cursor:pointer;" />
        </div>
      `;
      cardsContainer.appendChild(div);
    });

    renderPagination(list.length);
    attachModalRowActions();
  }

  function renderList(list) {
    console.log(`Rendering list view with ${list.length} users`);
    
    // hide table, show list
    const tableEl = usersBody ? usersBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (listContainer) { listContainer.classList.remove("visually-hidden"); listContainer.setAttribute("aria-hidden", "false"); }
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }

    if (!listContainer) return;
    
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    if (pageItems.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          No users found
        </div>
      `;
      renderPagination(list.length);
      return;
    }

    listContainer.innerHTML = "";

    pageItems.forEach(u => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <div class="avatar">${u.name.split(",")[0]?.slice(0,1) || 'U'}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${u.name}</div>
          <div style="font-size:13px;color:#6b7780;">${u.email}</div>
        </div>
        <div style="width:160px;text-align:right;">${u.course}</div>
        <div style="width:110px;text-align:right;">${statusPillText(u.status)}</div>
        <div style="width:80px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">
          <img src="../images/admin_img/write.png" class="action-icon edit" data-email="${u.email}" data-id="${u._id}" title="Edit" style="cursor:pointer;" />
          <img src="../images/admin_img/delete.png" class="action-icon del" data-email="${u.email}" data-id="${u._id}" title="Delete" style="cursor:pointer;" />
        </div>
      `;
      listContainer.appendChild(row);
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
    console.log(`Pagination: ${totalItems} items, ${totalPages} pages, current: ${currentPage}`);
    
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
      if (currentPage > 1) { 
        currentPage--; 
        renderView(users); 
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filtered.length / perPage);
      if (currentPage < totalPages) { 
        currentPage++; 
        renderView(users); 
      }
    });
  }

  // -------------------------
  // Filters (search + role/status/date)
  // -------------------------
  function applyFiltersToList(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    
    const filteredList = list.filter(u => {
      // search
      const matchesSearch = q === "" || 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        u.course.toLowerCase().includes(q) || 
        u.status.toLowerCase().includes(q);

      // role
      const matchesRole = activeFilters.role ? u.role === activeFilters.role : true;
      // status
      const matchesStatus = activeFilters.status ? u.status === activeFilters.status : true;
      // date range
      let matchesDate = true;
      if (activeFilters.dateFrom) {
        matchesDate = matchesDate && (new Date(u.lastActive) >= new Date(activeFilters.dateFrom));
      }
      if (activeFilters.dateTo) {
        matchesDate = matchesDate && (new Date(u.lastActive) <= new Date(activeFilters.dateTo));
      }

      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
    
    console.log(`Filters applied: ${list.length} -> ${filteredList.length} users`);
    return filteredList;
  }

  function renderView(list) {
    console.log(`Rendering ${view} view with ${list.length} total users`);
    
    // apply filters
    filtered = applyFiltersToList(list);
    
    // if current page is out-of-bounds after filtering, reset to 1
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) {
      console.log(`Resetting current page from ${currentPage} to 1`);
      currentPage = 1;
    }

    if (view === "table") renderTable(filtered);
    else if (view === "board") renderBoard(filtered);
    else if (view === "list") renderList(filtered);
  }

  // -------------------------
  // Search & select all
  // -------------------------
  if (searchInput) {
    searchInput.addEventListener("input", () => { 
      console.log("Search input changed:", searchInput.value);
      currentPage = 1; 
      renderView(users); 
    });
  }
  
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll("#usersBody input[type='checkbox']").forEach(cb => cb.checked = checked);
    });
  }

  // -------------------------
  // Filter menu toggle & interactions
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

    // clicks inside menu shouldn't close
    filterMenu.addEventListener("click", (e) => e.stopPropagation());

    // outside click closes
    document.addEventListener("click", () => {
      if (filterMenu.classList.contains("open")) {
        filterMenu.classList.remove("open");
        filterMenu.setAttribute("aria-hidden", "true");
        filterBtn.setAttribute("aria-expanded", "false");
        if (filterPanel) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
      }
    });

    // esc closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (filterMenu.classList.contains("open")) {
          filterMenu.classList.remove("open");
          filterMenu.setAttribute("aria-hidden", "true");
          filterBtn.setAttribute("aria-expanded", "false");
          if (filterPanel) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
        }
      }
    });

    // handle clicks on menu items
    filterMenu.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const action = btn.dataset.action;
        if (action === "view") {
          view = btn.dataset.view || "table";
          perPage = (view === "board") ? 6 : 5;
          currentPage = 1;
          renderView(users);
          filterMenu.classList.remove("open");
          filterMenu.setAttribute("aria-hidden", "true");
          filterBtn.setAttribute("aria-expanded", "false");
        } else if (action === "open-filter") {
          const f = btn.dataset.filter;
          openFilterPanel(f);
        } else if (action === "apply") {
          // placeholder; filters apply immediately in panel
          filterMenu.classList.remove("open");
          if (filterPanel) filterPanel.classList.add("visually-hidden");
        }
      });
    });
  }

  // -------------------------
  // Filter panel rendering
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
  // Modals: Edit & Delete
  // -------------------------
  function openEditForEmail(email, userId) {
    const user = users.find(u => u.email === email && u._id === userId);
    if (!user) {
      console.error("User not found for editing:", email);
      return;
    }

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
    if (!user) {
      console.error("User not found for deletion:", email);
      return;
    }
    
    deletingEmail = email;
    if (deleteMessage) deleteMessage.textContent = `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
    openModal(deleteModal);
  }

  // edit form submit
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editingEmail) { 
        closeModal(editModal); 
        return; 
      }
      
      const user = users.find(u => u.email === editingEmail);
      if (!user) { 
        closeModal(editModal); 
        return; 
      }

      try {
        // Prepare updates for backend
        const updates = {
          fullName: (editName && editName.value) ? editName.value.trim() : user.name,
          courseYear: (editCourse && editCourse.value) ? editCourse.value.trim() : user.course,
          role: (editRole && editRole.value) ? editRole.value : user.role,
        };

        // Update in backend
        await updateUser(user._id, updates);

        // Update locally
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

  // cancel edit
  if (cancelEdit) {
    cancelEdit.addEventListener('click', () => {
      editingEmail = null;
      closeModal(editModal);
    });
  }

  // delete handlers
  if (cancelDelete) {
    cancelDelete.addEventListener('click', () => {
      deletingEmail = null;
      closeModal(deleteModal);
    });
  }
  
  if (confirmDelete) {
    confirmDelete.addEventListener('click', async () => {
      if (!deletingEmail) { 
        closeModal(deleteModal); 
        return; 
      }
      
      const user = users.find(u => u.email === deletingEmail);
      if (!user) { 
        closeModal(deleteModal); 
        return; 
      }

      try {
        // Delete from backend
        await deleteUser(user._id);

        // Remove locally
        const userIndex = users.findIndex(u => u.email === deletingEmail);
        if (userIndex > -1) {
          users.splice(userIndex, 1);
          // reapply filters and reset page
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
    }
  });

  // -------------------------
  // Attach click handlers to action icons (edit/delete)
  // -------------------------
  function attachModalRowActions() {
    // Remove previous listeners by replacing nodes with clones, then reattach
    document.querySelectorAll('.action-icon.edit').forEach(original => {
      const clone = original.cloneNode(true);
      original.parentNode.replaceChild(clone, original);
    });
    document.querySelectorAll('.action-icon.del').forEach(original => {
      const clone = original.cloneNode(true);
      original.parentNode.replaceChild(clone, original);
    });

    // Now add listeners
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
  // Initialize (fetch data and render first view)
  // -------------------------
  async function initialize() {
    try {
      console.log("Initializing user management...");
      
      // Show loading state
      if (usersBody) {
        usersBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px;">
              <div>Loading users...</div>
              <div style="font-size: 12px; margin-top: 8px;">Connecting to ${API_BASE}</div>
            </td>
          </tr>
        `;
      }
      
      // Fetch data from backend
      console.log("Fetching data from API...");
      users = await fetchUsersWithPrintStats();
      console.log(`Retrieved ${users.length} users`);
      
      if (users.length === 0) {
        console.log("No users found in database");
        if (usersBody) {
          usersBody.innerHTML = `
            <tr>
              <td colspan="7" style="text-align: center; padding: 20px;">
                No users found in the system
              </td>
            </tr>
          `;
        }
        return;
      }
      
      // Render the view
      console.log("Rendering initial view...");
      renderView(users);
      console.log("User management initialized successfully");
      
    } catch (error) {
      console.error("Error initializing user management:", error);
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
    }
  }

  // Start the application
  initialize();

  // Expose some helpers to console for quick testing
  window.__adminDemo = {
    users: () => users,
    renderView: () => renderView(users),
    openEditForEmail,
    openDeleteForEmail,
    refreshData: async () => {
      console.log("Manually refreshing data...");
      users = await fetchUsersWithPrintStats();
      renderView(users);
    }
  };
  
  console.log("User management loaded. Use window.__adminDemo for debugging.");
});