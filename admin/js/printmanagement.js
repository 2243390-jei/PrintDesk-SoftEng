document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample data (for testing) - Updated to match queue data structure
  // -------------------------
  const printData = [
    { 
      no: 1, 
      name: "Piamonte, Malech", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "15 tokens",
        status: "Accepted",
        requestId: "ROBF2D7B",
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
      name: "Argao, Jelloyd", 
      course: "BSIT 3", 
      date: "10/10/25", 
      status: "Accepted",
      details: {
        submittedOn: "October 10, 2025",
        totalCost: "18 tokens",
        status: "Accepted",
        requestId: "RABF207B",
        fileName: "Data_Structures_Assignment.pdf",
        pageCount: "3",
        copies: "2",
        paperSize: "Letter",
        printType: "Black & White",
        printingSide: "Double-Sided",
        pickupDate: "October 18, 2025",
        previewImage: "../../images/SLU_printdesk_logo.png"
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
  const printerModal = document.getElementById("printerModal");
  const printerDetailsModal = document.getElementById("printerDetailsModal");

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
  const previewImage = document.getElementById('previewImage');

  // -------------------------
  // state
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let filtered = [...printData];
  let view = "table";
  let activeFilters = { course: null, dateFrom: null, dateTo: null };
  let currentRequestId = null;

  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Check for redirect from queue
  // -------------------------
  function checkForQueueRedirect() {
    const storedRequest = sessionStorage.getItem('selectedRequest');
    if (storedRequest) {
      const requestData = JSON.parse(storedRequest);
      
      // Check if this request already exists in printData
      const existingIndex = printData.findIndex(r => r.details.requestId === requestData.details.requestId);
      
      if (existingIndex === -1) {
        // Add the new request to printData
        const newRequest = {
          no: printData.length + 1,
          name: requestData.name,
          course: requestData.course,
          date: requestData.date,
          status: "Accepted",
          details: {
            ...requestData.details,
            status: "Accepted",
            previewImage: "../../images/SLU_Logo.png" // Default image
          }
        };
        
        printData.unshift(newRequest);
      }
      
      // Clear the stored request
      sessionStorage.removeItem('selectedRequest');
      
      // Refresh the view
      renderView(printData);
      
      // Find and open the details for this request
      const record = printData.find(r => r.details.requestId === requestData.details.requestId);
      if (record) {
        showDetails(record);
      }
    }
  }

  // -------------------------
  // Utility functions
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
        <td class="col-actions"><button class="action-btn view-details" data-requestid="${rec.details.requestId}">View Details</button></td>
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
      btn.addEventListener("click", () => { currentPage = i; renderView(printData); });
      pageNumbers.appendChild(btn);
    }
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  if (prevPageBtn) prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderView(printData); }
  });
  if (nextPageBtn) nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filtered.length / perPage);
    if (currentPage < totalPages) { currentPage++; renderView(printData); }
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
    renderTable(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => { currentPage = 1; renderView(printData); });
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
          currentPage = 1; renderView(printData); hideFilterPanel();
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
      const courses = Array.from(new Set(printData.map(r => r.course)));
      filterPanel.appendChild(label);
      courses.forEach(c => {
        const b = document.createElement("button"); b.textContent = c; b.className = "small";
        if (activeFilters.course === c) b.classList.add("active");
        b.addEventListener("click", () => { 
          activeFilters.course = c; 
          currentPage = 1; 
          renderView(printData); 
          hideFilterPanel(); 
        });
        filterPanel.appendChild(b);
      });
      const clear = document.createElement("button"); clear.textContent = "Clear"; clear.className = "small";
      clear.addEventListener("click", () => { activeFilters.course = null; currentPage = 1; renderView(printData); hideFilterPanel(); });
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
        currentPage = 1; renderView(printData); hideFilterPanel();
      });
      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null; activeFilters.dateTo = null;
        currentPage = 1; renderView(printData); hideFilterPanel();
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
        const requestId = btn.getAttribute("data-requestid");
        const record = printData.find(r => r.details.requestId === requestId);
        showDetails(record);
      });
    });
  }

  function showDetails(rec) {
    if (!detailsModal || !rec || !rec.details) return;

    currentRequestId = rec.details.requestId;

    // Update all detail elements
    if (submittedDate) submittedDate.textContent = rec.details.submittedOn;
    if (totalCost) totalCost.textContent = rec.details.totalCost;
    if (statusBadge) {
      statusBadge.textContent = rec.details.status;
      statusBadge.className = `status-badge status-${rec.details.status.toLowerCase()}`;
    }
    if (requestId) requestId.textContent = rec.details.requestId;
    if (fileName) fileName.textContent = rec.details.fileName;
    if (pageCount) pageCount.textContent = rec.details.pageCount;
    if (copiesCount) copiesCount.textContent = rec.details.copies;
    if (paperSize) paperSize.textContent = rec.details.paperSize;
    if (printType) printType.textContent = rec.details.printType;
    if (printingSide) printingSide.textContent = rec.details.printingSide;
    if (pickupDate) pickupDate.textContent = rec.details.pickupDate;

    // Set preview image
    if (previewImage) {
      previewImage.src = rec.details.previewImage;
      previewImage.alt = `Preview of ${rec.details.fileName}`;
    }

    // Show the modal
    openModal(detailsModal);
  }

  // -------------------------
  // Printer Details Modal logic
  // -------------------------
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
        closeModal(printerModal);
        openModal(printerDetailsModal);
      });
    });

    const printerDetailsBackBtn = document.getElementById('printerDetailsBackBtn');
    if (printerDetailsBackBtn) {
      printerDetailsBackBtn.addEventListener('click', () => {
        closeModal(printerDetailsModal);
        openModal(printerModal);
      });
    }
  }

  // -------------------------
  // Event listeners for modals
  // -------------------------
  const backButton = document.getElementById('backBtn');
  const printerBackButton = document.getElementById('printerBackBtn');
  const acceptBtn = document.getElementById('acceptBtn');

  if (backButton) {
    backButton.addEventListener('click', () => {
      closeModal(detailsModal);
    });
  }

  if (printerBackButton) {
    printerBackButton.addEventListener('click', () => {
      closeModal(printerModal);
      openModal(detailsModal);
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      closeModal(detailsModal);
      openModal(printerModal);
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

  // escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailsModal && detailsModal.classList.contains('open')) {
        closeModal(detailsModal);
      }
      if (printerModal && printerModal.classList.contains('open')) {
        closeModal(printerModal);
      }
      if (printerDetailsModal && printerDetailsModal.classList.contains('open')) {
        closeModal(printerDetailsModal);
      }
    }
  });

  // ------------------------- 
  // init
  // -------------------------
  renderView(printData);
  attachPrinterDetailHandlers();
  checkForQueueRedirect();

  // expose for debugging
  window.__printRecordDemo = { 
    printData, 
    renderView, 
    openFilterPanel: (t) => openFilterPanel(t),
    showDetails 
  };
});