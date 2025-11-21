// usermanagement.js - FRONTEND ONLY
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

  // Add User elements
  const addUserBtn = document.getElementById("addUserBtn");
  const addModal = document.getElementById("addModal");
  const addForm = document.getElementById("addForm");
  const addEmail = document.getElementById("addEmail");
  const addName = document.getElementById("addName");
  const addRole = document.getElementById("addRole");
  const cancelAdd = document.getElementById("cancelAdd");

  // Modals
  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editEmail = document.getElementById('editEmail');
  const editName = document.getElementById('editName');
  const editRole = document.getElementById('editRole');
  const editRoleDisplay = document.getElementById('editRoleDisplay');
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

  // Role display helper
  function getDisplayRole(role) {
    if (role === 'User') return 'Student';
    return role;
  }

  function getRolePill(role) {
    const displayRole = getDisplayRole(role);
    const roleClass = role === 'User' ? 'student' : 'admin';
    return `<span class="role-pill ${roleClass}">${displayRole}</span>`;
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

        return {
          _id: user._id,
          name: user.fullName || "Unknown User",
          email: user.email,
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
            <td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">
              <div>Error loading users</div>
              <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
            </td>
          </tr>
        `;
      }
      return [];
    }
  }

  async function createUser(userData) {
    try {
      console.log("Sending user data:", userData);

      const response = await fetch(USERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
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
          <td colspan="5" style="text-align: center; padding: 20px;">
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
            <div class="user-avatar" aria-hidden="true">${u.name.split(",")[0]?.slice(0, 1) || 'U'}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${u.name}</div>
              <div style="font-size:13px; color: #6b7780;">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${getRolePill(u.role)}</td>
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
  // Search Filter
  // -------------------------
  function applySearchFilter(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";

    if (q === "") return list;

    return list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  function renderView(list) {
    filtered = applySearchFilter(list);
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
  // Add User Functionality
  // -------------------------
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      // Reset form
      if (addForm) addForm.reset();
      if (addRole) addRole.value = 'User'; // Default to Student
      openModal(addModal);
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        const email = addEmail.value.trim();
        const name = addName.value.trim();
        const role = addRole.value;

        if (!email || !name) {
          alert("Please fill in all required fields.");
          return;
        }

        // Map role from frontend to backend values
        const backendRole = role === 'User' ? 'student' : 'admin';

        const userData = {
          email: email,
          fullName: name,
          role: backendRole
        };

        const newUser = await createUser(userData);
        console.log("User created successfully:", newUser);

        // Add the new user to our local state
        const transformedUser = {
          _id: newUser._id,
          name: newUser.fullName,
          email: newUser.email,
          role: newUser.role === 'student' ? 'User' : 'Admin', // Map back for frontend display
          lastActive: newUser.lastLogin ? new Date(newUser.lastLogin).toISOString().split('T')[0] : "Never",
          tokenBalance: newUser.tokenBalance || 0,
          printStats: {
            total: 0,
            pending: 0,
            accepted: 0,
            completed: 0,
            rejected: 0
          }
        };

        users.unshift(transformedUser);
        currentPage = 1;
        renderView(users);
        closeModal(addModal);
        alert("User added successfully!");

      } catch (error) {
        console.error("Full error details:", error);
        
        // Handle specific error cases
        if (error.message.includes("409") || error.message.includes("already exists")) {
          alert("A user with this email already exists.");
        } else if (error.message.includes("400")) {
          alert("Please check the form data and try again.");
        } else {
          alert(`Failed to add user: ${error.message}`);
        }
      }
    });
  }

  if (cancelAdd) {
    cancelAdd.addEventListener('click', () => {
      closeModal(addModal);
    });
  }

  // -------------------------
  // Logout functionality
  // -------------------------
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(logoutModal);
    });
  }

  if (cancelLogout) {
    cancelLogout.addEventListener('click', function () {
      closeModal(logoutModal);
    });
  }

  if (confirmLogout) {
    confirmLogout.addEventListener('click', function () {
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

    // Set role display (non-editable)
    if (editRoleDisplay) {
      editRoleDisplay.textContent = getDisplayRole(user.role);
    }
    if (editRole) {
      editRole.value = user.role; // Keep the actual value in hidden field
    }

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
        };

        await updateUser(user._id, updates);

        user.name = updates.fullName;
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
        if (modal === addModal) closeModal(addModal);
        if (modal === editModal) editingEmail = null;
        if (modal === deleteModal) deletingEmail = null;
        closeModal(modal);
      }
    });
  });

  // Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (addModal && addModal.classList.contains('open')) closeModal(addModal);
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
            <td colspan="5" style="text-align: center; padding: 20px;">
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
            <td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">
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