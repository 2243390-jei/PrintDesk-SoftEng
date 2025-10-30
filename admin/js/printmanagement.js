// printrecordhistory.js
// Place in admin/js/ and load with defer from your HTML.

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample records (for demo)
  // -------------------------

  // Clear all filters button
  function clearAllFilters() {
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
    { 
      no: 1, 
      name: "Piamonte, Malech", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "15 tokens",
        requestId: "RQRF2D7B",
        fileName: "Automobile_Anatomy.pdf",
        pageCount: "1",
        copies: "1",
        paperSize: "A4",
        printType: "Colored",
        printingSide: "Single-Sided",
        pickupDate: "October 20, 2025",
        previewImage: "../../images/SLU_Logo.png"
      }
    },
    { 
      no: 2, 
      name: "Argao, Jeiloyd", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "25 tokens",
        requestId: "RQRF3E8C",
        fileName: "Programming_Assignment.pdf",
        pageCount: "5",
        copies: "2",
        paperSize: "Letter",
        printType: "Black & White",
        printingSide: "Double-Sided",
        pickupDate: "October 21, 2025",
        previewImage: "../../images/SLU_printdesk_logo.png"
      }
    },
    { 
      no: 3, 
      name: "Aguilan, Jecquar", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "10 tokens",
        requestId: "RQRF4D9A",
        fileName: "Research_Paper.pdf",
        pageCount: "8",
        copies: "1",
        paperSize: "A4",
        printType: "Black & White",
        printingSide: "Double-Sided",
        pickupDate: "October 19, 2025",
        previewImage: "../../images/Icon.png"
      }
    },
    { 
      no: 4, 
      name: "Doe, John", 
      course: "BSIT 3", 
      date: "10/11/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 11, 2025",
        totalCost: "30 tokens",
        requestId: "RQRF5B2E",
        fileName: "Project_Presentation.pdf",
        pageCount: "15",
        copies: "3",
        paperSize: "A4",
        printType: "Colored",
        printingSide: "Single-Sided",
        pickupDate: "October 22, 2025",
        previewImage: "../../images/lock.png"
      }
    },
    { 
      no: 5, 
      name: "Smith, Jane", 
      course: "BSIT 3", 
      date: "10/11/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 11, 2025",
        totalCost: "20 tokens",
        requestId: "RQRF6C1F",
        fileName: "Lab_Report.pdf",
        pageCount: "12",
        copies: "2",
        paperSize: "Legal",
        printType: "Black & White",
        printingSide: "Single-Sided",
        pickupDate: "October 23, 2025",
        previewImage: "../../images/admin_img/Screenshot 2025-10-20 110300.png"
      }
    }
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

  // modals
  const detailsModal = document.getElementById("detailsModal");
  const detailsBody = document.getElementById("detailsBody");
  const closeDetails = document.getElementById("closeDetails");
  const printerModal = document.getElementById("printerModal");
  const printerDetailsModal = document.getElementById("printerDetailsModal");
  // Printer Details Modal logic
  function attachPrinterDetailHandlers() {
    const printerData = {
      printer1: {
        name: 'Printer 1',
        brand: 'EPSON',
        model: 'L3210',
        status: 'Available',
        statusColor: '#22c55e',
        image: '../../images/printer.png',
        ink: {
          Black: '80%',
          Red: '80%',
          Blue: '80%',
          Yellow: '80%'
        }
      },
      printer2: {
        name: 'Laser Printer',
        brand: 'HP',
        model: 'LaserJet Pro',
        status: 'Unavailable',
        statusColor: '#ef4444',
        image: '../../images/printer.png',
        ink: {
          Black: '60%',
          Red: '55%',
          Blue: '70%',
          Yellow: '65%'
        }
      }
    };
    document.querySelectorAll('.details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const printerId = btn.getAttribute('data-printer');
        const data = printerData[printerId];
        if (data) {
          // Update modal content using IDs
          const img = document.getElementById('printerDetailsImg');
          if (img) img.src = data.image;
          const nameDiv = document.getElementById('printerDetailsName');
          if (nameDiv) nameDiv.textContent = data.name;
          const brandDiv = document.getElementById('printerDetailsBrand');
          if (brandDiv) brandDiv.innerHTML = `<b>Brand</b> : ${data.brand}`;
          const modelDiv = document.getElementById('printerDetailsModel');
          if (modelDiv) modelDiv.innerHTML = `<b>Model</b> : ${data.model}`;
          const statusDiv = document.getElementById('printerDetailsStatus');
          if (statusDiv) statusDiv.innerHTML = `<b>Status</b> : <span style='color:${data.statusColor};font-weight:600;'>${data.status}</span>`;
          // Ink
          const inkBlack = document.getElementById('printerDetailsInkBlack');
          if (inkBlack) inkBlack.innerHTML = `<span style='color:#222;font-weight:500;'>Black</span> : ${data.ink.Black}`;
          const inkRed = document.getElementById('printerDetailsInkRed');
          if (inkRed) inkRed.innerHTML = `<span style='color:#b91c1c;font-weight:500;'>Red</span> : ${data.ink.Red}`;
          const inkBlue = document.getElementById('printerDetailsInkBlue');
          if (inkBlue) inkBlue.innerHTML = `<span style='color:#2563eb;font-weight:500;'>Blue</span> : ${data.ink.Blue}`;
          const inkYellow = document.getElementById('printerDetailsInkYellow');
          if (inkYellow) inkYellow.innerHTML = `<span style='color:#eab308;font-weight:500;'>Yellow</span> : ${data.ink.Yellow}`;
        }
        printerModal.classList.remove('open');
        printerModal.setAttribute('aria-hidden', 'true');
        printerDetailsModal.classList.add('open');
        printerDetailsModal.setAttribute('aria-hidden', 'false');
      });
    });
    const printerDetailsBackBtn = document.getElementById('printerDetailsBackBtn');
    if (printerDetailsBackBtn) {
      printerDetailsBackBtn.addEventListener('click', () => {
        printerDetailsModal.classList.remove('open');
        printerDetailsModal.setAttribute('aria-hidden', 'true');
        printerModal.classList.add('open');
        printerModal.setAttribute('aria-hidden', 'false');
      });
    }
  }

  // -------------------------
  // state
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let filtered = [...records];
  let view = "table"; // for future: 'board' or 'list'
  let activeFilters = { course: null, dateFrom: null, dateTo: null };

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
        <td class="col-actions"><button class="action-btn view-details" data-id="${rec.name}">View Details</button></td>
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
      const matchesCourse = activeFilters.course ? r.course === activeFilters.course : true;
      let matchesDate = true;
      if (activeFilters.dateFrom) matchesDate = matchesDate && (new Date(r.date) >= new Date(activeFilters.dateFrom));
      if (activeFilters.dateTo) matchesDate = matchesDate && (new Date(r.date) <= new Date(activeFilters.dateTo));

      return matchesSearch && matchesCourse && matchesDate;
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
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const record = records.find(r => r.name === id);
        showDetails(record);
      });
    });
  }

  function showDetails(rec) {
    if (!detailsModal || !rec || !rec.details) return;

    // Set preview image
    const previewImage = detailsModal.querySelector('#previewImage');
    if (previewImage) {
      previewImage.src = rec.details.previewImage;
      previewImage.alt = `Preview of ${rec.details.fileName}`;
    }

    // Update the detail fields
    const fields = {
      '#submittedDate': rec.details.submittedOn,
      '#totalCost': rec.details.totalCost,
      '#statusBadge': rec.status,
      '#requestId': rec.details.requestId,
      '#fileName': rec.details.fileName,
      '#pageCount': rec.details.pageCount,
      '#copiesCount': rec.details.copies,
      '#paperSize': rec.details.paperSize,
      '#printType': rec.details.printType,
      '#printingSide': rec.details.printingSide,
      '#pickupDate': rec.details.pickupDate
    };

    Object.entries(fields).forEach(([selector, value]) => {
      const element = detailsModal.querySelector(selector);
      if (element) element.textContent = value;
    });

    // Update status badge style
    const statusBadge = detailsModal.querySelector('#statusBadge');
    if (statusBadge) {
      statusBadge.className = 'status-badge';
      statusBadge.classList.add(rec.status.toLowerCase());
      switch (rec.status.toLowerCase()) {
        case 'accepted':
          statusBadge.style.background = '#e8f6ea';
          statusBadge.style.color = '#1f7a2f';
          break;
        case 'pending':
          statusBadge.style.background = '#fff3cd';
          statusBadge.style.color = '#856404';
          break;
        case 'rejected':
          statusBadge.style.background = '#f8d7da';
          statusBadge.style.color = '#721c24';
          break;
      }
    }

    // Show the modal
    detailsModal.classList.add("open");
    detailsModal.setAttribute("aria-hidden", "false");

    // Setup print button
    const acceptBtn = detailsModal.querySelector('#acceptBtn');
    
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        detailsModal.classList.remove('open');
        detailsModal.setAttribute('aria-hidden', 'true');
        // Show printer selection modal
        if (printerModal) {
          printerModal.classList.add('open');
          printerModal.setAttribute('aria-hidden', 'false');
          
          // Setup printer modal buttons
          const printerPrintBtns = printerModal.querySelectorAll('.print-btn:not(:disabled)');
          printerPrintBtns.forEach(btn => {
            btn.onclick = () => {
              // Handle print action here
              printerModal.classList.remove('open');
              printerModal.setAttribute('aria-hidden', 'true');
              renderView(records);
            };
          });
        }
      };
    }
  }

  // Back button and close handlers
  const backButton = detailsModal.querySelector('#backBtn');
  const printerBackButton = document.querySelector('#printerBackBtn');

  if (backButton) {
    backButton.addEventListener('click', () => {
      detailsModal.classList.remove("open");
      detailsModal.setAttribute("aria-hidden", "true");
    });
  }

  if (printerBackButton) {
    printerBackButton.addEventListener('click', () => {
      // Hide printer modal
      printerModal.classList.remove('open');
      printerModal.setAttribute('aria-hidden', 'true');
      // Show details modal
      detailsModal.classList.add('open');
      detailsModal.setAttribute('aria-hidden', 'false');
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

  // escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailsModal && detailsModal.classList.contains('open')) {
        detailsModal.classList.remove('open');
        detailsModal.setAttribute('aria-hidden', 'true');
      }
      if (printerModal && printerModal.classList.contains('open')) {
        printerModal.classList.remove('open');
        printerModal.setAttribute('aria-hidden', 'true');
      }
    }
  });

  // ------------------------- 
  // init
  // -------------------------
  renderView(records);
  attachPrinterDetailHandlers();

  // expose for debugging
  window.__printRecordDemo = { records, renderView, openFilterPanel: (t) => openFilterPanel(t) };
});
