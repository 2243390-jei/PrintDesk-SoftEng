document.addEventListener("DOMContentLoaded", () => {
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
  const backBtn = document.getElementById("backBtn");

  // Detail elements
  const submittedDate = document.getElementById('submittedDate');
  const totalCost = document.getElementById('totalCost');
  const statusBadge = document.getElementById('statusBadge');
  const requestId = document.getElementById('requestId');
  const userName = document.getElementById('userName');
  const userCourse = document.getElementById('userCourse');
  const userEmail = document.getElementById('userEmail');
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
  let printData = []; // Will be populated from database
  let filtered = [];
  let view = "table";
  let activeFilters = { course: null, printType: null, dateFrom: null, dateTo: null };

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // API Functions
  // -------------------------
  async function fetchPrintRequests() {
    try {
      const response = await fetch(REQUESTS_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Filter only completed requests for history
      const filteredData = data.filter(request => 
        request.status === "Completed"
      );
      
      // Sort by createdAt (newest first) for records
      const sortedData = filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Transform backend data to frontend format
      return sortedData.map((request, index) => {
        // Use the first document for display purposes
        const primaryDoc = request.documents && request.documents.length > 0 
          ? request.documents[0] 
          : {
              documentTitle: "Unknown",
              pageCount: 0,
              numberOfCopies: 1,
              paperSize: "Unknown",
              printType: "Unknown",
              printingSide: "Unknown"
            };
        
        // Calculate total pages across all documents
        const totalPages = request.documents ? 
          request.documents.reduce((total, doc) => total + (doc.pageCount || 0), 0) : 
          primaryDoc.pageCount;
        
        // Calculate total copies across all documents  
        const totalCopies = request.documents ?
          request.documents.reduce((total, doc) => total + (doc.numberOfCopies || 1), 0) :
          primaryDoc.numberOfCopies;
        
        // Format date for display
        const createdDate = new Date(request.createdAt);
        const formattedDate = `${createdDate.getMonth() + 1}/${createdDate.getDate()}/${createdDate.getFullYear().toString().slice(-2)}`;
        
        return {
          no: index + 1,
          name: request.fullName,
          course: request.courseYear,
          date: formattedDate,
          pages: totalPages,
          copies: totalCopies,
          printType: primaryDoc.printType,
          status: request.status,
          details: {
            submittedOn: createdDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            totalCost: `${request.totalTokens} tokens`,
            status: request.status,
            requestId: request._id,
            fileName: primaryDoc.documentTitle,
            pageCount: totalPages,
            copies: totalCopies,
            paperSize: primaryDoc.paperSize,
            printType: primaryDoc.printType,
            printingSide: primaryDoc.printingSide,
            pickupDate: request.pickupDateTime ? 
              new Date(request.pickupDateTime).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : "Not specified",
            previewImage: primaryDoc.filePath ? 
              `${API_BASE}${primaryDoc.filePath}` : 
              "../../images/SLU_Logo.png",
            // Include all documents for details view
            allDocuments: request.documents || [],
            email: request.email,
            totalTokens: request.totalTokens,
            fullName: request.fullName,
            courseYear: request.courseYear
          }
        };
      });
    } catch (error) {
      console.error("Error fetching print requests:", error);
      // Return empty array if API fails
      return [];
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

  function statusPill(status) {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") return `<span class="pill completed">${status}</span>`;
    if (statusLower === "accepted") return `<span class="pill accepted">${status}</span>`;
    if (statusLower === "rejected") return `<span class="pill rejected">${status}</span>`;
    return `<span class="pill pending">${status}</span>`;
  }

  // -------------------------
  // render table
  // -------------------------
  function renderTable(list) {
    if (!recordsBody) return;
    recordsBody.innerHTML = "";

    // Show loading state if no data
    if (list.length === 0) {
      recordsBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: #6b7780;">
            No print records found
          </td>
        </tr>
      `;
      return;
    }

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
        <td>${rec.pages}</td>
        <td>${rec.copies}</td>
        <td>${rec.printType}</td>
        <td>${statusPill(rec.status)}</td>
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
      const matchesSearch = q === "" || 
        r.name.toLowerCase().includes(q) || 
        r.course.toLowerCase().includes(q) ||
        r.details.requestId.toLowerCase().includes(q) ||
        r.printType.toLowerCase().includes(q);
      const matchesCourse = activeFilters.course ? r.course === activeFilters.course : true;
      const matchesPrintType = activeFilters.printType ? r.printType === activeFilters.printType : true;
      let matchesDate = true;
      if (activeFilters.dateFrom) matchesDate = matchesDate && (new Date(r.date) >= new Date(activeFilters.dateFrom));
      if (activeFilters.dateTo) matchesDate = matchesDate && (new Date(r.date) <= new Date(activeFilters.dateTo));

      return matchesSearch && matchesCourse && matchesPrintType && matchesDate;
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
          activeFilters = { course: null, printType: null, dateFrom: null, dateTo: null };
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
      const label = document.createElement("div"); 
      label.textContent = "Course"; 
      label.style.fontWeight = "700";
      label.style.color = "white";
      label.style.marginBottom = "8px";
      
      const courses = Array.from(new Set(printData.map(r => r.course)));
      filterPanel.appendChild(label);
      
      courses.forEach(c => {
        const b = document.createElement("button"); 
        b.textContent = c; 
        b.className = "small";
        if (activeFilters.course === c) b.classList.add("active");
        b.addEventListener("click", () => { 
          activeFilters.course = c; 
          currentPage = 1; 
          renderView(printData); 
          hideFilterPanel(); 
        });
        filterPanel.appendChild(b);
      });
      
      const clear = document.createElement("button"); 
      clear.textContent = "Clear"; 
      clear.className = "small";
      clear.addEventListener("click", () => { 
        activeFilters.course = null; 
        currentPage = 1; 
        renderView(printData); 
        hideFilterPanel(); 
      });
      filterPanel.appendChild(clear);
    }

    if (type === "printType") {
      const label = document.createElement("div"); 
      label.textContent = "Print Type"; 
      label.style.fontWeight = "700";
      label.style.color = "white";
      label.style.marginBottom = "8px";
      
      const printTypes = Array.from(new Set(printData.map(r => r.printType)));
      filterPanel.appendChild(label);
      
      printTypes.forEach(t => {
        const b = document.createElement("button"); 
        b.textContent = t; 
        b.className = "small";
        if (activeFilters.printType === t) b.classList.add("active");
        b.addEventListener("click", () => { 
          activeFilters.printType = t; 
          currentPage = 1; 
          renderView(printData); 
          hideFilterPanel(); 
        });
        filterPanel.appendChild(b);
      });
      
      const clear = document.createElement("button"); 
      clear.textContent = "Clear"; 
      clear.className = "small";
      clear.addEventListener("click", () => { 
        activeFilters.printType = null; 
        currentPage = 1; 
        renderView(printData); 
        hideFilterPanel(); 
      });
      filterPanel.appendChild(clear);
    }

    if (type === "date") {
      const label = document.createElement("div"); 
      label.textContent = "Date range"; 
      label.style.fontWeight = "700";
      label.style.color = "white";
      label.style.marginBottom = "8px";
      
      const from = document.createElement("input"); 
      from.type = "date"; 
      from.value = activeFilters.dateFrom || "";
      from.style.marginBottom = "8px";
      from.style.padding = "6px";
      from.style.borderRadius = "4px";
      from.style.border = "1px solid #ccc";
      
      const to = document.createElement("input"); 
      to.type = "date"; 
      to.value = activeFilters.dateTo || "";
      to.style.marginBottom = "8px";
      to.style.padding = "6px";
      to.style.borderRadius = "4px";
      to.style.border = "1px solid #ccc";
      
      const apply = document.createElement("button"); 
      apply.textContent = "Apply";
      apply.className = "small";
      
      const clear = document.createElement("button"); 
      clear.textContent = "Clear";
      clear.className = "small";
      
      apply.addEventListener("click", () => {
        activeFilters.dateFrom = from.value || null;
        activeFilters.dateTo = to.value || null;
        currentPage = 1; 
        renderView(printData); 
        hideFilterPanel();
      });
      
      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null; 
        activeFilters.dateTo = null;
        currentPage = 1; 
        renderView(printData); 
        hideFilterPanel();
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

    // Update all detail elements
    if (submittedDate) submittedDate.textContent = rec.details.submittedOn;
    if (totalCost) totalCost.textContent = rec.details.totalCost;
    if (statusBadge) {
      statusBadge.textContent = rec.details.status;
      statusBadge.className = `status-badge status-${rec.details.status.toLowerCase()}`;
    }
    if (requestId) requestId.textContent = rec.details.requestId;
    if (userName) userName.textContent = rec.details.fullName;
    if (userCourse) userCourse.textContent = rec.details.courseYear;
    if (userEmail) userEmail.textContent = rec.details.email;
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
      previewImage.onerror = function() {
        // Fallback if image fails to load
        this.src = "../../images/SLU_Logo.png";
      };
    }

    // Show the modal
    openModal(detailsModal);
  }

  // -------------------------
  // Event listeners for modals
  // -------------------------
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closeModal(detailsModal);
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
    }
  });

  // ------------------------- 
  // Initialize and fetch data
  // -------------------------
  async function initialize() {
    try {
      // Show loading state
      if (recordsBody) {
        recordsBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 40px; color: #6b7780;">
              Loading print records...
            </td>
          </tr>
        `;
      }
      
      // Fetch data from database
      printData = await fetchPrintRequests();
      filtered = [...printData];
      
      // Render the view
      renderView(printData);
      
    } catch (error) {
      console.error("Error initializing print records:", error);
      if (recordsBody) {
        recordsBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 40px; color: #ef4444;">
              Error loading print records
            </td>
          </tr>
        `;
      }
    }
  }

  // Start the application
  initialize();

  // expose for debugging
  window.__printRecordDemo = { 
    printData, 
    renderView, 
    openFilterPanel: (t) => openFilterPanel(t),
    showDetails,
    fetchPrintRequests
  };
});