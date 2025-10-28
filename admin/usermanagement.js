document.addEventListener("DOMContentLoaded", () => {
  // sample users with lastActive so date filter works
  const users = [
    { name: "Piamonte, Malech", email: "2243905@slu.edu.ph", course: "BSCS 3", status: "Accepted", role: "User", lastActive: "2025-10-10" },
    { name: "Argao, Jeiloyd", email: "2250923@slu.edu.ph", course: "BSCS 3", status: "Pending", role: "User", lastActive: "2025-10-05" },
    { name: "Jecquar, Aguilan", email: "2257025@slu.edu.ph", course: "BSCS 3", status: "Pending", role: "User", lastActive: "2025-10-12" },
    // extra sample items to demonstrate pagination
    { name: "Lopez, Maria", email: "2249999@slu.edu.ph", course: "BSCS 3", status: "Accepted", role: "User", lastActive: "2025-10-14" },
    { name: "Ramos, Juan", email: "2241001@slu.edu.ph", course: "BSIT 2", status: "Accepted", role: "User", lastActive: "2025-09-20" },
    { name: "Delos, Pedro", email: "2242002@slu.edu.ph", course: "BSCS 1", status: "Pending", role: "Organization", lastActive: "2025-08-01" }
  ];

  // DOM refs
  const usersBody = document.getElementById("usersBody");
  const cardsContainer = document.getElementById("cardsContainer");
  const listContainer = document.getElementById("listContainer");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const pageNumbers = document.getElementById("pageNumbers");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const selectAll = document.getElementById("selectAll");

  // filter menu + panel
  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // state
  let perPage = 5;
  let currentPage = 1;
  let filtered = [...users];
  let view = "table"; // 'table' | 'board' | 'list'
  let activeFilters = { role: null, status: null, dateFrom: null, dateTo: null };

  curYear.textContent = new Date().getFullYear();

  /* ---------- rendering functions ---------- */
  function renderTable(list) {
    usersBody.innerHTML = "";
    // show table, hide others
    usersBody.closest("table").style.display = "";
    cardsContainer.classList.add("visually-hidden");
    cardsContainer.setAttribute("aria-hidden", "true");
    listContainer.classList.add("visually-hidden");
    listContainer.setAttribute("aria-hidden", "true");

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
          <img src="../images/admin_img/write.png" alt="edit" title="Edit" class="action-icon edit" />
          <img src="../images/admin_img/delete.png" alt="delete" title="Delete" class="action-icon del" />
        </td>
      `;
      usersBody.appendChild(tr);
    });

    renderPagination(list.length);
    attachRowActions();
  }

  function renderBoard(list) {
    // hide table, show cards
    usersBody.closest("table").style.display = "none";
    cardsContainer.classList.remove("visually-hidden");
    cardsContainer.setAttribute("aria-hidden", "false");
    listContainer.classList.add("visually-hidden");
    listContainer.setAttribute("aria-hidden", "true");

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
      `;
      cardsContainer.appendChild(div);
    });

    renderPagination(list.length);
  }

  function renderList(list) {
    // hide table, show list
    usersBody.closest("table").style.display = "none";
    listContainer.classList.remove("visually-hidden");
    listContainer.setAttribute("aria-hidden", "false");
    cardsContainer.classList.add("visually-hidden");
    cardsContainer.setAttribute("aria-hidden", "true");

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
      `;
      listContainer.appendChild(row);
    });

    renderPagination(list.length);
  }

  function statusPill(text) {
    if (text.toLowerCase() === "accepted") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }
  function statusPillText(text) {
    if (text.toLowerCase() === "accepted") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }

  function renderPagination(totalItems) {
    pageNumbers.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "" : "inactive";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderView(filtered);
      });
      pageNumbers.appendChild(btn);
    }
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderView(filtered); }
  });
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filtered.length / perPage);
    if (currentPage < totalPages) { currentPage++; renderView(filtered); }
  });

  function attachRowActions() {
    document.querySelectorAll(".action-icon.edit").forEach((el, idx) => {
      el.addEventListener("click", () => {
        const name = filtered[(currentPage - 1) * perPage + idx].name;
        alert("Edit user: " + name + " (wireframe)");
      });
    });
    document.querySelectorAll(".action-icon.del").forEach((el, idx) => {
      el.addEventListener("click", () => {
        const index = (currentPage - 1) * perPage + idx;
        const name = filtered[index].name;
        if (confirm(`Delete ${name}?`)) {
          const globalIndex = users.findIndex(u => u.email === filtered[index].email);
          if (globalIndex > -1) { users.splice(globalIndex, 1); filtered = [...users]; currentPage = 1; renderView(filtered); }
        }
      });
    });
  }

  /* ---------- filtering logic ---------- */
  function applyFiltersToList(list) {
    const q = searchInput.value.trim().toLowerCase();
    return list.filter(u => {
      // search
      const matchesSearch = q === "" || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.course.toLowerCase().includes(q) || u.status.toLowerCase().includes(q);

      // role
      const matchesRole = activeFilters.role ? u.role === activeFilters.role : true;
      // status
      const matchesStatus = activeFilters.status ? u.status === activeFilters.status : true;
      // date range (lastActive in YYYY-MM-DD)
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
    // if current page is out of bounds after filtering, reset to 1
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = 1;

    if (view === "table") renderTable(filtered);
    else if (view === "board") renderBoard(filtered);
    else if (view === "list") renderList(filtered);
  }

  /* ---------- search & select all ---------- */
  if (searchInput) {
    searchInput.addEventListener("input", () => { currentPage = 1; renderView(users); });
  }
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll("#usersBody input[type='checkbox']").forEach(cb => cb.checked = checked);
    });
  }

  /* ---------- filter menu toggle & interactions ---------- */
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
        filterPanel.classList.add("visually-hidden");
        filterPanel.setAttribute("aria-hidden", "true");
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
        filterPanel.classList.add("visually-hidden");
        filterPanel.setAttribute("aria-hidden", "true");
      }
    });

    // esc closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (filterMenu.classList.contains("open")) {
          filterMenu.classList.remove("open");
          filterMenu.setAttribute("aria-hidden", "true");
          filterBtn.setAttribute("aria-expanded", "false");
          filterPanel.classList.add("visually-hidden");
          filterPanel.setAttribute("aria-hidden", "true");
        }
      }
    });

    // handle clicks on menu items (view switches and opening small filter panel)
    filterMenu.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const action = btn.dataset.action;
        if (action === "view") {
          // change view and re-render
          view = btn.dataset.view || "table";
          // per view we can adjust perPage (optional)
          perPage = (view === "board") ? 6 : 5;
          currentPage = 1;
          renderView(users);
          // close menu
          filterMenu.classList.remove("open");
          filterMenu.setAttribute("aria-hidden", "true");
          filterBtn.setAttribute("aria-expanded", "false");
        } else if (action === "open-filter") {
          const f = btn.dataset.filter;
          openFilterPanel(f);
        } else if (action === "apply") {
          // apply does nothing special here since we apply immediately on selection in panel,
          // but keep it in case you want to open an advanced modal
          alert("Apply filters (already applied).");
          filterMenu.classList.remove("open");
          filterPanel.classList.add("visually-hidden");
        }
      });
    });
  }

  /* ---------- filter panel rendering / behavior ---------- */
  function openFilterPanel(type) {
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
    filterPanel.classList.add("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "true");
  }

  /* ---------- initialization ---------- */
  renderView(users);
});
