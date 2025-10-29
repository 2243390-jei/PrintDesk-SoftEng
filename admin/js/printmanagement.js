// printrecordhistory.js
// Place in admin/js/ and load with defer from your HTML.

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample records (for demo)
  // -------------------------

  // Clear all filters button
  function clearAllFilters() {
    activeFilters.status = null;
    activeFilters.course = null;
    activeFilters.dateFrom = null;
    activeFilters.dateTo = null;
    currentPage = 1;
    renderView(records);
    hideFilterPanel();
    if (filterMenu) {
      filterMenu.classList.remove("open");
      filterMenu.setAttribute("aria-hidden", "true");
      filterBtn.setAttribute("aria-expanded", "false");
    }
  }
  const records = [
    { no: 1, name: "Piamonte, Malech", course: "BSIT 3", date: "10/10/25", status: "Accepted", details: "View assignment details" },
    { no: 2, name: "Argao, Jeiloyd", course: "BSIT 3", date: "10/10/25", status: "Pending", details: "View assignment details" },
    { no: 3, name: "Aguilan, Jecquar", course: "BSIT 3", date: "10/10/25", status: "Rejected", details: "View assignment details" },
    { no: 4, name: "Doe, John", course: "BSIT 3", date: "10/10/25", status: "Accepted", details: "View assignment details" },
    { no: 5, name: "Smith, Jane", course: "BSIT 3", date: "10/10/25", status: "Pending", details: "View assignment details" }
  ];

  // -------------------------
  // DOM refs
  // -------------------------
  const recordsBody = document.getElementById("recordsBody");
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

  // details modal
  const detailsModal = document.getElementById("detailsModal");
  const detailsBody = document.getElementById("detailsBody");
  const closeDetails = document.getElementById("closeDetails");

  // -------------------------
  // state
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let filtered = [...records];
  let view = "table"; // for future: 'board' or 'list'
  let activeFilters = { status: null, course: null, dateFrom: null, dateTo: null };

  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // render table
  // -------------------------
  function renderTable(list) {
    if (!recordsBody) return;
    recordsBody.innerHTML = "";

    // ensure table visible, hide cards & list
    const tableEl = recordsBody.closest("table");
    if (tableEl) tableEl.style.display = "";
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(rec => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-check"><input type="checkbox" /></td>
        <td>${rec.no}</td>
        <td style="font-weight:600">${rec.name}</td>
        <td>${rec.course}</td>
        <td>${rec.date}</td>
        <td><span class="pill ${rec.status.toLowerCase()}">${rec.status}</span></td>
        <td class="col-actions"><button class="action-btn view-details" data-id="${rec.name}">${rec.details}</button></td>
      `;
      recordsBody.appendChild(tr);
    });

    renderPagination(list.length);
    attachDetailHandlers();
  }

  // -------------------------
  // pagination
  // -------------------------
  function renderPagination(totalItems) {
    if (!pageNumbers) return;
    pageNumbers.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "" : "inactive";
      btn.addEventListener("click", () => { currentPage = i; renderView(records); });
      pageNumbers.appendChild(btn);
    }
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  if (prevPageBtn) prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderView(records); }
  });
  if (nextPageBtn) nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filtered.length / perPage);
    if (currentPage < totalPages) { currentPage++; renderView(records); }
  });

  // -------------------------
  // search & filters
  // -------------------------
  function applyFiltersToList(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    return list.filter(r => {
      const matchesSearch = q === "" || r.name.toLowerCase().includes(q) || r.course.toLowerCase().includes(q);

      const matchesStatus = activeFilters.status ? r.status === activeFilters.status : true;
      const matchesCourse = activeFilters.course ? r.course === activeFilters.course : true;

      let matchesDate = true;
      if (activeFilters.dateFrom) matchesDate = matchesDate && (new Date(r.date) >= new Date(activeFilters.dateFrom));
      if (activeFilters.dateTo) matchesDate = matchesDate && (new Date(r.date) <= new Date(activeFilters.dateTo));

      return matchesSearch && matchesStatus && matchesCourse && matchesDate;
    });
  }

  function renderView(list) {
    filtered = applyFiltersToList(list);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = 1;
    // only table for now
    renderTable(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => { currentPage = 1; renderView(records); });
  }

  // select all
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll("#recordsBody input[type='checkbox']").forEach(cb => cb.checked = checked);
    });
  }

  // -------------------------
  // filter menu behavior
  // -------------------------
  if (filterBtn && filterMenu) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = filterMenu.classList.toggle("open");
      filterMenu.setAttribute("aria-hidden", String(!open));
      filterBtn.setAttribute("aria-expanded", String(open));
      if (!open) { filterPanel.classList.add("visually-hidden"); filterPanel.setAttribute("aria-hidden", "true"); }
      else {
        const first = filterMenu.querySelector("button");
        if (first) first.focus();
      }
    });

    filterMenu.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", () => {
      if (filterMenu.classList.contains("open")) {
        filterMenu.classList.remove("open");
        filterMenu.setAttribute("aria-hidden", "true");
        filterBtn.setAttribute("aria-expanded", "false");
        filterPanel.classList.add("visually-hidden");
        filterPanel.setAttribute("aria-hidden", "true");
      }
    });

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

    // clicks on filter menu items
    filterMenu.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const action = btn.dataset.action;
        if (action === "open-filter") {
          openFilterPanel(btn.dataset.filter);
        } else if (action === "clear") {
          activeFilters = { printer: null, printType: null, dateFrom: null, dateTo: null };
          currentPage = 1; renderView(records); hideFilterPanel();
        }
      });
    });
  }

  // -------------------------
  // filter panel UI
  // -------------------------
  function openFilterPanel(type) {
    if (!filterPanel) return;
    filterPanel.innerHTML = "";
    filterPanel.classList.remove("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "false");

    if (type === "status") {
      const label = document.createElement("div"); label.textContent = "Status"; label.style.fontWeight = "700";
      const statuses = ["Accepted", "Pending", "Rejected"];
      filterPanel.appendChild(label);
      statuses.forEach(s => {
        const b = document.createElement("button"); b.textContent = s; b.className = "small";
        if (activeFilters.status === s) b.classList.add("active");
        b.addEventListener("click", () => { 
          activeFilters.status = s; 
          currentPage = 1; 
          renderView(records); 
          hideFilterPanel(); 
        });
        filterPanel.appendChild(b);
      });
      const clear = document.createElement("button"); clear.textContent = "Clear"; clear.className = "small";
      clear.addEventListener("click", () => { activeFilters.status = null; currentPage = 1; renderView(records); hideFilterPanel(); });
      filterPanel.appendChild(clear);
    }

    if (type === "course") {
      const label = document.createElement("div"); label.textContent = "Course"; label.style.fontWeight = "700";
      const courses = Array.from(new Set(records.map(r => r.course)));
      filterPanel.appendChild(label);
      courses.forEach(c => {
        const b = document.createElement("button"); b.textContent = c; b.className = "small";
        if (activeFilters.course === c) b.classList.add("active");
        b.addEventListener("click", () => { 
          activeFilters.course = c; 
          currentPage = 1; 
          renderView(records); 
          hideFilterPanel(); 
        });
        filterPanel.appendChild(b);
      });
      const clear = document.createElement("button"); clear.textContent = "Clear"; clear.className = "small";
      clear.addEventListener("click", () => { activeFilters.course = null; currentPage = 1; renderView(records); hideFilterPanel(); });
      filterPanel.appendChild(clear);
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
        currentPage = 1; renderView(records); hideFilterPanel();
      });
      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null; activeFilters.dateTo = null;
        currentPage = 1; renderView(records); hideFilterPanel();
      });
      filterPanel.appendChild(label); filterPanel.appendChild(from); filterPanel.appendChild(to); filterPanel.appendChild(apply); filterPanel.appendChild(clear);
    }
  }

  function hideFilterPanel() {
    if (!filterPanel) return;
    filterPanel.classList.add("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "true");
  }

  // -------------------------
  // details modal
  // -------------------------
  function attachDetailHandlers() {
    document.querySelectorAll(".view-details").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = btn.getAttribute("data-id") || "";
        // simple lookup by name+doc+date combination
        const parts = id.split("|");
        const doc = parts[0], nm = parts[1], when = parts[2];
        const rec = records.find(r => r.documents === doc && r.name === nm && r.when === when) || records.find(r => r.documents === doc);
        if (!rec) return;
        showDetails(rec);
      });
    });
  }

  function showDetails(rec) {
    if (!detailsBody || !detailsModal) return;
    detailsBody.innerHTML = `
      <p><strong>Student ID:</strong> 2023-00001</p>
      <p><strong>Name:</strong> ${rec.name}</p>
      <p><strong>Course:</strong> ${rec.course}</p>
      <p><strong>Status:</strong> ${rec.status}</p>
      <p><strong>Date:</strong> ${rec.date}</p>
      <p><strong>Document Name:</strong> Assignment1.pdf</p>
      <p><strong>Pages:</strong> 5</p>
      <p><strong>Print Type:</strong> Black & White</p>
      <p><strong>Paper Size:</strong> A4</p>
    `;
    detailsModal.classList.add("open");
    detailsModal.setAttribute("aria-hidden", "false");
  }

  if (closeDetails) {
    closeDetails.addEventListener("click", () => {
      detailsModal.classList.remove("open");
      detailsModal.setAttribute("aria-hidden", "true");
    });
  }

  // backdrop click to close modal
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailsModal && detailsModal.classList.contains('open')) {
        detailsModal.classList.remove('open');
        detailsModal.setAttribute('aria-hidden', 'true');
      }
    }
  });

  // -------------------------
  // init
  // -------------------------
  renderView(records);

  // expose for debugging
  window.__printRecordDemo = { records, renderView, openFilterPanel: (t) => openFilterPanel(t) };
});
