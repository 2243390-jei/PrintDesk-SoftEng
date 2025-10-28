document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample data (for testing)
  // -------------------------
  const queueData = [
    { 
      id: 1, 
      name: "Piamonte, Malech", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Pending",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "15 tokens",
        status: "Pending",
        requestId: "ROBF2D7B",
        fileName: "Automobile_Anatomy.pdf",
        pageCount: 1,
        numberOfCopies: 1,
        paperSize: "A4",
        printType: "Colored",
        printingSide: "Single-Sided",
        pickupDate: "October 20, 2025"
      }
    },
    { 
      id: 2, 
      name: "Argao, Jelloyd", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Pending",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "18 tokens",
        status: "Pending",
        requestId: "RABF207B",
        fileName: "Data_Structures_Assignment.pdf",
        pageCount: 3,
        numberOfCopies: 2,
        paperSize: "Letter",
        printType: "Black & White",
        printingSide: "Double-Sided",
        pickupDate: "October 18, 2025"
      }
    },
    { 
      id: 3, 
      name: "Aguilan, Jecquar", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Pending",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "8 tokens",
        status: "Pending",
        requestId: "R45B8D3F",
        fileName: "Web_Development_Project.pdf",
        pageCount: 5,
        numberOfCopies: 1,
        paperSize: "A4",
        printType: "Colored",
        printingSide: "Single-Sided",
        pickupDate: "October 15, 2025"
      }
    },
    { 
      id: 4, 
      name: "Santos, Maria", 
      course: "BSCS 2", 
      date: "10/11/25", 
      status: "Pending",
      details: {
        submittedOn: "October 11, 2025",
        totalCost: "12 tokens",
        status: "Pending",
        requestId: "R76C2E9A",
        fileName: "Lab_Report.pdf",
        pageCount: 3,
        numberOfCopies: 1,
        paperSize: "A4",
        printType: "Black & White",
        printingSide: "Single-Sided",
        pickupDate: "October 12, 2025"
      }
    },
    { 
      id: 5, 
      name: "Reyes, Juan", 
      course: "BSIS 4", 
      date: "10/11/25", 
      status: "Pending",
      details: {
        submittedOn: "October 11, 2025",
        totalCost: "30 tokens",
        status: "Pending",
        requestId: "R34D7F1B",
        fileName: "Project_Proposal.pdf",
        pageCount: 20,
        numberOfCopies: 3,
        paperSize: "Legal",
        printType: "Colored",
        printingSide: "Double-Sided",
        pickupDate: "October 22, 2025"
      }
    }
  ];

  // -------------------------
  // DOM references
  // -------------------------
  const queueBody = document.getElementById("queueBody");
  const cardsContainer = document.getElementById("cardsContainer");
  const listContainer = document.getElementById("listContainer");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const pageNumbers = document.getElementById("pageNumbers");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // Modal elements
  const detailsModal = document.getElementById('detailsModal');
  const backBtn = document.getElementById('backBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const acceptBtn = document.getElementById('acceptBtn');

  // Detail elements
  const submittedDate = document.getElementById('submittedDate');
  const totalCost = document.getElementById('totalCost');
  const statusBadge = document.getElementById('statusBadge');
  const requestId = document.getElementById('requestId');
  const fileName = document.getElementById('fileName');
  const pageCount = document.getElementById('pageCount');
  const copiesCount = document.getElementById('copiesCount');
  const paperSize = document.getElementById('paperSize');
  const printType = document.getElementById('printType');
  const printingSide = document.getElementById('printingSide');
  const pickupDate = document.getElementById('pickupDate');

  // -------------------------
  // State
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let filtered = [...queueData];
  let view = "table"; // 'table' | 'board' | 'list'
  let activeFilters = { status: null, dateFrom: null, dateTo: null };
  let currentRequestId = null;

  // set footer year if element exists
  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Utility helpers
  // -------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function statusPill(text) {
    if (!text) return '';
    if (text.toLowerCase() === "completed") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }
  
  function statusPillText(text) {
    if (!text) return '';
    if (text.toLowerCase() === "completed") return `<span class="pill accepted">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }

  // -------------------------
  // Renderers
  // -------------------------
  function renderTable(list) {
    if (!queueBody) return;
    queueBody.innerHTML = "";

    // show table, hide others
    const tableEl = queueBody.closest("table");
    if (tableEl) tableEl.style.display = "";
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.id}</td>
        <td>
          <div class="user-name">
            <div class="user-avatar" aria-hidden="true">${item.name.split(",")[0].slice(0,1)}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${item.name}</div>
              <div style="font-size:13px; color: #6b7780;">${item.course}</div>
            </div>
          </div>
        </td>
        <td>${item.course}</td>
        <td>${item.date}</td>
        <td class="col-actions">
          <button class="view-details-btn" data-id="${item.id}">View Details</button>
        </td>
      `;
      queueBody.appendChild(tr);
    });

    renderPagination(list.length);
    attachViewDetailsHandlers();
  }

  function renderBoard(list) {
    // hide table, show cards
    const tableEl = queueBody ? queueBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (cardsContainer) { cardsContainer.classList.remove("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "false"); }
    if (listContainer) { listContainer.classList.add("visually-hidden"); listContainer.setAttribute("aria-hidden", "true"); }

    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "card-item";
      div.innerHTML = `
        <div class="avatar">${item.name.split(",")[0].slice(0,1)}</div>
        <div class="meta">
          <div class="name">${item.name}</div>
          <div class="course">${item.course}</div>
          <div style="font-size:13px;color:#6b7780;">${item.date}</div>
          <div style="margin-top:8px;">${statusPillText(item.status)}</div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;gap:8px;">
          <button class="view-details-btn" data-id="${item.id}">View Details</button>
        </div>
      `;
      cardsContainer.appendChild(div);
    });

    renderPagination(list.length);
    attachViewDetailsHandlers();
  }

  function renderList(list) {
    // hide table, show list
    const tableEl = queueBody ? queueBody.closest("table") : null;
    if (tableEl) tableEl.style.display = "none";
    if (listContainer) { listContainer.classList.remove("visually-hidden"); listContainer.setAttribute("aria-hidden", "false"); }
    if (cardsContainer) { cardsContainer.classList.add("visually-hidden"); cardsContainer.setAttribute("aria-hidden", "true"); }

    if (!listContainer) return;
    listContainer.innerHTML = "";
    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(item => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <div class="avatar">${item.name.split(",")[0].slice(0,1)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${item.name}</div>
          <div style="font-size:13px;color:#6b7780;">${item.course}</div>
        </div>
        <div style="width:160px;text-align:right;">${item.date}</div>
        <div style="width:110px;text-align:right;">${statusPillText(item.status)}</div>
        <div style="width:80px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">
          <button class="view-details-btn" data-id="${item.id}">Details</button>
        </div>
      `;
      listContainer.appendChild(row);
    });

    renderPagination(list.length);
    attachViewDetailsHandlers();
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
        renderView(queueData);
      });
      pageNumbers.appendChild(btn);
    }
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) { currentPage--; renderView(queueData); }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filtered.length / perPage);
      if (currentPage < totalPages) { currentPage++; renderView(queueData); }
    });
  }

  // -------------------------
  // Filters (search + status/date)
  // -------------------------
  function applyFiltersToList(list) {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    return list.filter(item => {
      // search
      const matchesSearch = q === "" || 
        item.name.toLowerCase().includes(q) || 
        item.course.toLowerCase().includes(q) || 
        item.date.includes(q);

      // status
      const matchesStatus = activeFilters.status ? item.status === activeFilters.status : true;
      
      // date range
      let matchesDate = true;
      if (activeFilters.dateFrom) {
        matchesDate = matchesDate && (new Date(item.date) >= new Date(activeFilters.dateFrom));
      }
      if (activeFilters.dateTo) {
        matchesDate = matchesDate && (new Date(item.date) <= new Date(activeFilters.dateTo));
      }

      return matchesSearch && matchesStatus && matchesDate;
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
  // Search
  // -------------------------
  if (searchInput) {
    searchInput.addEventListener("input", () => { currentPage = 1; renderView(queueData); });
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
          renderView(queueData);
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

    if (type === "status") {
      const label = document.createElement("div"); label.textContent = "Status"; label.style.fontWeight = "700";
      const pendingBtn = document.createElement("button"); pendingBtn.textContent = "Pending";
      const completedBtn = document.createElement("button"); completedBtn.textContent = "Completed";
      const clearBtn = document.createElement("button"); clearBtn.textContent = "Clear";

      pendingBtn.addEventListener("click", () => { activeFilters.status = "Pending"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      completedBtn.addEventListener("click", () => { activeFilters.status = "Completed"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      clearBtn.addEventListener("click", () => { activeFilters.status = null; currentPage = 1; renderView(queueData); hideFilterPanel(); });

      filterPanel.appendChild(label);
      filterPanel.appendChild(pendingBtn);
      filterPanel.appendChild(completedBtn);
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
        currentPage = 1; renderView(queueData); hideFilterPanel();
      });
      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null; activeFilters.dateTo = null;
        currentPage = 1; renderView(queueData); hideFilterPanel();
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
  // Modal: View Details
  // -------------------------
  function openDetailsForId(id) {
    const item = queueData.find(item => item.id === id);
    if (!item) return;
    
    currentRequestId = id;
    
    // Update all detail elements
    if (submittedDate) submittedDate.textContent = item.details.submittedOn;
    if (totalCost) totalCost.textContent = item.details.totalCost;
    if (statusBadge) {
      statusBadge.textContent = item.details.status;
      statusBadge.className = `status-badge status-${item.details.status.toLowerCase()}`;
    }
    if (requestId) requestId.textContent = item.details.requestId;
    if (fileName) fileName.textContent = item.details.fileName;
    if (pageCount) pageCount.textContent = item.details.pageCount;
    if (copiesCount) copiesCount.textContent = item.details.numberOfCopies;
    if (paperSize) paperSize.textContent = item.details.paperSize;
    if (printType) printType.textContent = item.details.printType;
    if (printingSide) printingSide.textContent = item.details.printingSide;
    if (pickupDate) pickupDate.textContent = item.details.pickupDate;

    openModal(detailsModal);
  }

  // Handle back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentRequestId = null;
      closeModal(detailsModal);
    });
  }

  // Handle accept/reject actions
  function handleRequest(id, action) {
    const item = queueData.find(item => item.id === id);
    
    if (item) {
      // Update the status
      item.details.status = action === 'Accepted' ? 'Completed' : 'Rejected';
      item.status = action === 'Accepted' ? 'Completed' : 'Rejected';
      
      // Show confirmation message
      alert(`Request ${item.details.requestId} has been ${action.toLowerCase()}.`);
      
      // Close the modal
      closeModal(detailsModal);
      
      // Refresh the view to reflect changes
      renderView(queueData);
    }
  }

  // Add event listeners to action buttons
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function() {
      if (currentRequestId) handleRequest(currentRequestId, 'Rejected');
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      if (currentRequestId) handleRequest(currentRequestId, 'Accepted');
    });
  }

  // backdrop click to close modal
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        currentRequestId = null;
        closeModal(modal);
      }
    });
  });

  // Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailsModal && detailsModal.classList.contains('open')) { 
        currentRequestId = null; 
        closeModal(detailsModal); 
      }
    }
  });

  // -------------------------
  // Attach click handlers to view details buttons
  // -------------------------
  function attachViewDetailsHandlers() {
    // Remove previous listeners by replacing nodes with clones
    document.querySelectorAll('.view-details-btn').forEach(original => {
      const clone = original.cloneNode(true);
      original.parentNode.replaceChild(clone, original);
    });

    // Now add listeners
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (id) openDetailsForId(id);
      });
    });
  }

  // -------------------------
  // Initialize (render first view)
  // -------------------------
  renderView(queueData);

  // Expose some helpers to console for quick testing (optional)
  window.__queueDemo = {
    queueData,
    renderView,
    openDetailsForId
  };
});