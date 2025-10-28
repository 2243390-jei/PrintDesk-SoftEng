// usermanagement.js (complete file)
// Note: save as usermanagement.js and ensure it's loaded with `defer` in your HTML.

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample data (for testing)
  // -------------------------
  const users = [
    { name: "Piamonte, Malech", email: "2243905@slu.edu.ph", course: "BSCS 3", status: "Accepted", role: "User", lastActive: "2025-10-10" },
    { name: "Argao, Jeiloyd", email: "2250923@slu.edu.ph", course: "BSCS 3", status: "Pending", role: "User", lastActive: "2025-10-05" },
    { name: "Jecquar, Aguilan", email: "2257025@slu.edu.ph", course: "BSCS 3", status: "Pending", role: "User", lastActive: "2025-10-12" },
    { name: "Lopez, Maria", email: "2249999@slu.edu.ph", course: "BSCS 3", status: "Accepted", role: "User", lastActive: "2025-10-14" },
    { name: "Ramos, Juan", email: "2241001@slu.edu.ph", course: "BSIT 2", status: "Accepted", role: "User", lastActive: "2025-09-20" },
    { name: "Delos, Pedro", email: "2242002@slu.edu.ph", course: "BSCS 1", status: "Pending", role: "Organization", lastActive: "2025-08-01" }
  ];

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
  let filtered = [...users];
  let view = "table"; // 'table' | 'board' | 'list'
  let activeFilters = { role: null, status: null, dateFrom: null, dateTo: null };

  // track which user is being edited / deleted (use email identifier)
  let editingEmail = null;
  let deletingEmail = null;

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
  // Renderers
  // -------------------------
  function renderTable(list) {
    if (!usersBody) return;
    usersBody.innerHTML = "";

    // show table, hide others
    const tableEl = usersBody.closest("table");
    if (tableEl) tableEl.style.display = "";
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-check"><input type="checkbox" /></td>
        <td>
          <div class="user-name">
            <div class="user-avatar" aria-hidden="true">${u.name.split(",")[0].slice(0,1)}</div>
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
          <img src="../../images/admin_img/write.png" alt="edit" title="Edit" class="action-icon edit" data-email="${u.email}" />
          <img src="../../images/admin_img/delete.png" alt="delete" title="Delete" class="action-icon del" data-email="${u.email}" />
        </td>
      `;
      usersBody.appendChild(tr);
    });

    renderPagination(list.length);
    attachModalRowActions();
  }

  function renderBoard(list) {
    // hide table, show cards
    const tableEl = usersBody ? usersBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (cardsContainer) { cardsContainer.classList.remove("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "false"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(u => {
      const div = document.createElement("div");
      div.className = "card-item";
      div.innerHTML = `
        <div class="avatar">${u.name.split(",")[0].slice(0,1)}</div>
        <div class="meta">
          <div class="name">${u.name}</div>
          <div class="email">${u.email}</div>
          <div style="font-size:13px;color:#6b7780;">${u.course} • ${u.role}</div>
          <div style="margin-top:8px;">${statusPillText(u.status)}</div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;gap:8px;">
          <img src="../images/admin_img/write.png" class="action-icon edit" data-email="${u.email}" title="Edit" style="cursor:pointer;" />
          <img src="../images/admin_img/delete.png" class="action-icon del" data-email="${u.email}" title="Delete" style="cursor:pointer;" />
        </div>
      `;
      cardsContainer.appendChild(div);
    });

    renderPagination(list.length);
    attachModalRowActions();
  }

  function renderList(list) {
    // hide table, show list
    const tableEl = usersBody ? usersBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (listContainer) { listContainer.classList.remove("visually-hidden"); listContainer.setAttribute("aria-hidden", "false"); }
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }

    if (!listContainer) return;
    listContainer.innerHTML = "";
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(u => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <div class="avatar">${u.name.split(",")[0].slice(0,1)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${u.name}</div>
          <div style="font-size:13px;color:#6b7780;">${u.email}</div>
        </div>
        <div style="width:160px;text-align:right;">${u.course}</div>
        <div style="width:110px;text-align:right;">${statusPillText(u.status)}</div>
        <div style="width:80px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">
          <img src="../images/admin_img/write.png" class="action-icon edit" data-email="${u.email}" title="Edit" style="cursor:pointer;" />
          <img src="../images/admin_img/delete.png" class="action-icon del" data-email="${u.email}" title="Delete" style="cursor:pointer;" />
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
    pageNumbers.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "" : "inactive";
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
  // Filters (search + role/status/date)
  // -------------------------
  function applyFiltersToList(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    return list.filter(u => {
      // search
      const matchesSearch = q === "" || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.course.toLowerCase().includes(q) || u.status.toLowerCase().includes(q);

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
  }

  function renderView(list) {
    // apply filters
    filtered = applyFiltersToList(list);
    // if current page is out-of-bounds after filtering, reset to 1
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = 1;

    if (view === "table") renderTable(filtered);
    else if (view === "board") renderBoard(filtered);
    else if (view === "list") renderList(filtered);
  }

  // -------------------------
  // Search & select all
  // -------------------------
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
  function openEditForEmail(email) {
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return;
    const u = users[idx];

    editingEmail = u.email;
    if (editEmail) editEmail.value = u.email || '';
    if (editName) editName.value = u.name || '';
    if (editCourse) editCourse.value = u.course || '';
    if (editStatus) editStatus.value = u.status || 'Pending';
    if (editRole) editRole.value = u.role || 'User';

    openModal(editModal);
  }

  function openDeleteForEmail(email) {
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return;
    deletingEmail = email;
    if (deleteMessage) deleteMessage.textContent = `Are you sure you want to delete ${users[idx].name}?`;
    openModal(deleteModal);
  }

  // edit form submit
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editingEmail) { closeModal(editModal); return; }
      const idx = users.findIndex(u => u.email === editingEmail);
      if (idx === -1) { closeModal(editModal); return; }

      // update record
      users[idx].email = (editEmail && editEmail.value) ? editEmail.value.trim() : users[idx].email;
      users[idx].name = (editName && editName.value) ? editName.value.trim() : users[idx].name;
      users[idx].course = (editCourse && editCourse.value) ? editCourse.value.trim() : users[idx].course;
      users[idx].status = (editStatus && editStatus.value) ? editStatus.value : users[idx].status;
      users[idx].role = (editRole && editRole.value) ? editRole.value : users[idx].role;

      editingEmail = null;
      renderView(users);
      closeModal(editModal);
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
    confirmDelete.addEventListener('click', () => {
      if (!deletingEmail) { closeModal(deleteModal); return; }
      const idx = users.findIndex(u => u.email === deletingEmail);
      if (idx > -1) {
        users.splice(idx, 1);
        // reapply filters and reset page
        currentPage = 1;
        renderView(users);
      }
      deletingEmail = null;
      closeModal(deleteModal);
    });
  }

  // backdrop click to close modals (requires modal markup to include .modal-backdrop with data-close-modal attribute)
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
    // For safety, remove previous listeners by replacing nodes with clones, then reattach
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
        if (email) openEditForEmail(email);
      });
    });
    document.querySelectorAll('.action-icon.del').forEach(el => {
      el.addEventListener('click', () => {
        const email = el.getAttribute('data-email');
        if (email) openDeleteForEmail(email);
      });
    });
  }

  // -------------------------
  // Initialize (render first view)
  // -------------------------
  renderView(users);

  // Expose some helpers to console for quick testing (optional)
  window.__adminDemo = {
    users,
    renderView,
    openEditForEmail,
    openDeleteForEmail
  };
});
