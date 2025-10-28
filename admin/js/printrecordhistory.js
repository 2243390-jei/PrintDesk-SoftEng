// printrecordhistory.js
// Place in admin/js/ and load with defer from your HTML.

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample records (for demo)
  // -------------------------
  const records = [
    { time: "09:00", name: "Piamonte, Malech", pages: 1, copies: 1, printer: "Duplex printer", documents: "Assignment.pdf", printType: "Colored", details: "Color: Yes; Paper: A4", when: "2025-10-20" },
    { time: "09:00", name: "Argao, Jeiloyd", pages: 2, copies: 1, printer: "Laser printer", documents: "Notes.docs", printType: "Grayscale", details: "2-sided; Paper: A4", when: "2025-10-19" },
    { time: "10:00", name: "Jecquar, Aguilan", pages: 11, copies: 2, printer: "Laser printer", documents: "Thesis.pdf", printType: "Grayscale", details: "Stapled; Paper: A4", when: "2025-10-18" },
    // extras for pagination demo
    { time: "10:30", name: "Lopez, Maria", pages: 3, copies: 1, printer: "Duplex printer", documents: "Report.pdf", printType: "Colored", details: "A4", when: "2025-10-17" },
    { time: "11:15", name: "Ramos, Juan", pages: 5, copies: 1, printer: "Laser printer", documents: "Poster.png", printType: "Colored", details: "Large format", when: "2025-10-15" },
    { time: "12:05", name: "Delos, Pedro", pages: 2, copies: 1, printer: "Duplex printer", documents: "Form.pdf", printType: "Grayscale", details: "A4", when: "2025-09-30" }
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
  let activeFilters = { printer: null, printType: null, dateFrom: null, dateTo: null };

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
        <td>${rec.time}</td>
        <td style="font-weight:600">${rec.name}</td>
        <td>${rec.pages}</td>
        <td>${rec.copies}</td>
        <td>${rec.printer}</td>
        <td>${rec.documents}</td>
        <td>${rec.printType}</td>
        <td class="col-actions"><button class="action-btn view-details" data-id="${rec.documents}|${rec.name}|${rec.when}">View Details</button></td>
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
      const matchesSearch = q === "" || r.name.toLowerCase().includes(q) || r.documents.toLowerCase().includes(q) || r.printer.toLowerCase().includes(q) || r.printType.toLowerCase().includes(q);

      const matchesPrinter = activeFilters.printer ? r.printer === activeFilters.printer : true;
      const matchesPrintType = activeFilters.printType ? r.printType === activeFilters.printType : true;

      let matchesDate = true;
      if (activeFilters.dateFrom) matchesDate = matchesDate && (new Date(r.when) >= new Date(activeFilters.dateFrom));
      if (activeFilters.dateTo) matchesDate = matchesDate && (new Date(r.when) <= new Date(activeFilters.dateTo));

      return matchesSearch && matchesPrinter && matchesPrintType && matchesDate;
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

    if (type === "printer") {
      const label = document.createElement("div"); label.textContent = "Printer"; label.style.fontWeight = "700";
      const printers = Array.from(new Set(records.map(r => r.printer)));
      filterPanel.appendChild(label);
      printers.forEach(p => {
        const b = document.createElement("button"); b.textContent = p; b.className = "small";
        b.addEventListener("click", () => { activeFilters.printer = p; currentPage = 1; renderView(records); hideFilterPanel(); });
        filterPanel.appendChild(b);
      });
      const clear = document.createElement("button"); clear.textContent = "Clear"; clear.className = "small";
      clear.addEventListener("click", () => { activeFilters.printer = null; currentPage = 1; renderView(records); hideFilterPanel(); });
      filterPanel.appendChild(clear);
    }

    if (type === "printType") {
      const label = document.createElement("div"); label.textContent = "Print Type"; label.style.fontWeight = "700";
      const types = Array.from(new Set(records.map(r => r.printType)));
      filterPanel.appendChild(label);
      types.forEach(t => {
        const b = document.createElement("button"); b.textContent = t; b.className = "small";
        b.addEventListener("click", () => { activeFilters.printType = t; currentPage = 1; renderView(records); hideFilterPanel(); });
        filterPanel.appendChild(b);
      });
      const clear = document.createElement("button"); clear.textContent = "Clear"; clear.className = "small";
      clear.addEventListener("click", () => { activeFilters.printType = null; currentPage = 1; renderView(records); hideFilterPanel(); });
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
      <p><strong>Time:</strong> ${rec.time}</p>
      <p><strong>Name:</strong> ${rec.name}</p>
      <p><strong>Pages:</strong> ${rec.pages}</p>
      <p><strong>Copies:</strong> ${rec.copies}</p>
      <p><strong>Printer:</strong> ${rec.printer}</p>
      <p><strong>Document:</strong> ${rec.documents}</p>
      <p><strong>Print Type:</strong> ${rec.printType}</p>
      <p><strong>Other Details:</strong> ${rec.details}</p>
      <p><strong>Date:</strong> ${rec.when}</p>
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
