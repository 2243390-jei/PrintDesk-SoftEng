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
  const sidebarQueueCount = document.getElementById("sidebarQueueCount");
  const documentNavigation = document.getElementById('documentNavigation');
  const documentTabs = document.getElementById('documentTabs');
  const documentCounter = document.getElementById('documentCounter');
  const currentDocumentName = document.getElementById('currentDocumentName');
  const prevDocumentBtn = document.getElementById('prevDocument');
  const nextDocumentBtn = document.getElementById('nextDocument');
  const previewArea = document.querySelector('.preview-area');
  const previewPlaceholder = document.getElementById('previewPlaceholder');

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // modals
  const detailsModal = document.getElementById("detailsModal");

  // Logout modal elements
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  const cancelLogout = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");

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
  let printData = [];
  let filtered = [];
  let view = "table";
  let activeFilters = { course: null, dateFrom: null, dateTo: null };
  let currentRequestId = null;
  let currentDocuments = []; // Array of all documents for current request
  let currentDocumentIndex = 0; // Current document index  

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  if (curYear) curYear.textContent = new Date().getFullYear();

  // -------------------------
  // Utility functions
  // -------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function statusPill(status) {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") return `<span class="pill completed">${status}</span>`;
    if (statusLower === "accepted") return `<span class="pill accepted">${status}</span>`;
    if (statusLower === "rejected") return `<span class="pill rejected">${status}</span>`;
    return `<span class="pill pending">${status}</span>`;
  }

  // -------------------------
  // File Preview Functions
  // -------------------------
  function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  function isImageFile(filename) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    return imageExtensions.includes(getFileExtension(filename));
  }

  function isPDFFile(filename) {
    return getFileExtension(filename) === 'pdf';
  }

  function isWordFile(filename) {
    const wordExtensions = ['doc', 'docx'];
    return wordExtensions.includes(getFileExtension(filename));
  }

  function isExcelFile(filename) {
    const excelExtensions = ['xls', 'xlsx'];
    return excelExtensions.includes(getFileExtension(filename));
  }

  function isPowerPointFile(filename) {
    const pptExtensions = ['ppt', 'pptx'];
    return pptExtensions.includes(getFileExtension(filename));
  }

  function createFilePreview(fileUrl, filename, documentTitle) {
    // Clear previous preview
    previewArea.innerHTML = '';

    const fileExt = getFileExtension(filename);

    if (isImageFile(filename)) {
      // Handle images
      const img = document.createElement('img');
      img.src = fileUrl;
      img.alt = `Preview of ${documentTitle}`;
      img.className = 'preview-image';
      img.style.display = 'block';
      img.onerror = () => showPreviewUnavailable(filename);
      previewArea.appendChild(img);

    } else if (isPDFFile(filename)) {
      // Handle PDF files using PDF.js or embed
      const pdfContainer = document.createElement('div');
      pdfContainer.className = 'pdf-preview-container';
      pdfContainer.innerHTML = `
        <embed src="${fileUrl}" type="application/pdf" width="100%" height="400px" />
        <div class="pdf-alternative">
          <p>Can't view the PDF? <a href="${fileUrl}" target="_blank" download="${filename}">Download instead</a></p>
        </div>
      `;
      previewArea.appendChild(pdfContainer);

    } else if (isWordFile(filename) || isExcelFile(filename) || isPowerPointFile(filename)) {
      // Handle Office documents using Microsoft Office Online Viewer
      const officeContainer = document.createElement('div');
      officeContainer.className = 'office-preview-container';

      // Microsoft Office Online Viewer URL
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

      officeContainer.innerHTML = `
        <iframe src="${officeViewerUrl}" width="100%" height="400px" frameborder="0"></iframe>
        <div class="office-alternative">
          <p>Can't view the document? <a href="${fileUrl}" target="_blank" download="${filename}">Download instead</a></p>
        </div>
      `;
      previewArea.appendChild(officeContainer);

    } else {
      // Handle other file types
      showPreviewUnavailable(filename);
    }
  }

  function showPreviewUnavailable(filename) {
    previewArea.innerHTML = `
      <div class="preview-placeholder">
        <img src="../../images/admin_img/document-preview.png" alt="Document" />
        <p>No preview available for ${filename}</p>
        <p class="file-download-text">Please download the file to view its contents</p>
        <button class="download-btn" onclick="downloadCurrentDocument()">Download Document</button>
      </div>
    `;
  }

  function downloadCurrentDocument() {
    if (currentDocuments.length === 0 || currentDocumentIndex >= currentDocuments.length) return;

    const currentDoc = currentDocuments[currentDocumentIndex];
    if (!currentDoc.filePath) return;

    const fileUrl = `${API_BASE}${currentDoc.filePath}`;
    const filename = currentDoc.documentTitle || 'document';

    // Create a temporary anchor element to trigger download
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

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

      // Show only accepted requests in Print Management (completed requests belong in history)
      const filteredData = data.filter(request => request.status === "Accepted");

      const sortedData = filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return sortedData.map((request, index) => {
        const primaryDoc = request.documents && request.documents.length > 0
          ? request.documents[0]
          : {
            documentTitle: "Unknown",
            pageCount: 0,
            numberOfCopies: 1,
            paperSize: "Unknown",
            printType: "Unknown",
            printingSide: "Unknown",
            filePath: null
          };

        const createdDate = new Date(request.createdAt);
        const formattedDate = `${createdDate.getMonth() + 1}/${createdDate.getDate()}/${createdDate.getFullYear().toString().slice(-2)}`;

        return {
          no: index + 1,
          name: request.fullName,
          course: request.courseYear,
          date: formattedDate,
          status: request.status || "Accepted",
          details: {
            submittedOn: createdDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            totalCost: `${request.totalTokens} tokens`,
            status: request.status || "Accepted",
            requestId: request._id,
            fileName: primaryDoc.documentTitle,
            pageCount: primaryDoc.pageCount,
            copies: primaryDoc.numberOfCopies,
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
            // IMPORTANT: Store ALL documents for the request
            allDocuments: request.documents || [],
            email: request.email,
            totalTokens: request.totalTokens
          }
        };
      });
    } catch (error) {
      console.error("Error fetching print requests:", error);
      return [];
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
  // render table
  // -------------------------
  function renderTable(list) {
    if (!recordsBody) return;
    recordsBody.innerHTML = "";

    // Show loading state if no data
    if (list.length === 0) {
      recordsBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #6b7780;">
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
        <td>${rec.no}</td>
        <td style="font-weight:600">${rec.name}</td>
        <td>${rec.course}</td>
        <td>${rec.date}</td>
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
        r.details.requestId.toLowerCase().includes(q);
      const matchesCourse = activeFilters.course ? r.course === activeFilters.course : true;

      let matchesDate = true;
      if (activeFilters.dateFrom || activeFilters.dateTo) {
        // Parse the record date (format: "MM/DD/YY")
        const recordDateParts = r.date.split('/');
        const recordDate = new Date(
          parseInt(recordDateParts[2]) + 2000, // Convert YY to YYYY
          parseInt(recordDateParts[0]) - 1,    // Month is 0-indexed
          parseInt(recordDateParts[1])         // Day
        );

        // Create date objects for comparison (set to start and end of day)
        const filterFrom = activeFilters.dateFrom ? new Date(activeFilters.dateFrom) : null;
        const filterTo = activeFilters.dateTo ? new Date(activeFilters.dateTo) : null;

        if (filterFrom) {
          // Set filterFrom to start of day (00:00:00)
          const startOfDay = new Date(filterFrom);
          startOfDay.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && (recordDate >= startOfDay);
        }

        if (filterTo) {
          // Set filterTo to end of day (23:59:59.999)
          const endOfDay = new Date(filterTo);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && (recordDate <= endOfDay);
        }
      }

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
          activeFilters = { course: null, dateFrom: null, dateTo: null };
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

    currentRequestId = rec.details.requestId;
    currentDocuments = rec.details.allDocuments || [];
    currentDocumentIndex = 0;

    // Update request-level details (non-document specific)
    if (submittedDate) submittedDate.textContent = rec.details.submittedOn;
    if (totalCost) totalCost.textContent = rec.details.totalCost;
    if (statusBadge) {
      statusBadge.textContent = rec.details.status;
      statusBadge.className = `status-badge status-${rec.details.status.toLowerCase()}`;
    }
    if (requestId) requestId.textContent = rec.details.requestId;
    if (pickupDate) pickupDate.textContent = rec.details.pickupDate;

    // Setup document navigation and show file preview for first document
    setupDocumentNavigation(currentDocuments);
    // ensure preview and navigation are visible as appropriate
    if (documentNavigation) documentNavigation.style.display = currentDocuments && currentDocuments.length > 1 ? 'block' : 'none';
    if (previewArea) previewArea.style.display = '';

    // Populate the document details and show the first document's preview
    if (currentDocuments && currentDocuments.length > 0) {
      currentDocumentIndex = 0;
      showDocument(currentDocumentIndex);
    } else {
      // no documents: clear preview fields
      if (fileName) fileName.textContent = '';
      if (pageCount) pageCount.textContent = 0;
      if (copiesCount) copiesCount.textContent = 0;
      if (paperSize) paperSize.textContent = '';
      if (printType) printType.textContent = '';
      if (printingSide) printingSide.textContent = '';
      if (previewArea) previewArea.innerHTML = `<div class="preview-placeholder"><img src="../../images/admin_img/document-preview.png" alt="Document" /><p>No preview available</p></div>`;
    }

    // Show the modal
    openModal(detailsModal);
  }

  function setupDocumentNavigation(documents) {
    if (!documentNavigation || !documentTabs) return;

    // Clear existing tabs
    documentTabs.innerHTML = '';

    if (documents.length > 1) {
      // Show navigation for multiple documents
      documentNavigation.style.display = 'block';

      // Create tabs for each document
      documents.forEach((doc, index) => {
        const tab = document.createElement('button');
        tab.className = `document-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = `Doc ${index + 1}`;
        tab.title = doc.documentTitle || `Document ${index + 1}`;
        tab.addEventListener('click', () => switchDocument(index));
        documentTabs.appendChild(tab);
      });

      // Enable/disable navigation buttons
      updateNavigationButtons();
    } else {
      // Hide navigation for single document
      documentNavigation.style.display = 'none';
    }
  }

  function showDocument(index) {
    if (index < 0 || index >= currentDocuments.length) return;

    const doc = currentDocuments[index];
    currentDocumentIndex = index;

    // Update document counter
    if (documentCounter) {
      documentCounter.textContent = `Document ${index + 1} of ${currentDocuments.length}`;
    }

    // Update current document name
    if (currentDocumentName) {
      currentDocumentName.textContent = doc.documentTitle || 'Unknown Document';
    }

    // Update document-specific details
    if (fileName) fileName.textContent = doc.documentTitle || 'Unknown';
    if (pageCount) pageCount.textContent = doc.pageCount || 0;
    if (copiesCount) copiesCount.textContent = doc.numberOfCopies || 1;
    if (paperSize) paperSize.textContent = doc.paperSize || 'Unknown';
    if (printType) printType.textContent = doc.printType || 'Unknown';
    if (printingSide) printingSide.textContent = doc.printingSide || 'Unknown';

    // Update preview based on file type
    if (doc.filePath) {
      const fileUrl = `${API_BASE}${doc.filePath}`;
      const filename = doc.documentTitle || 'document';
      createFilePreview(fileUrl, filename, doc.documentTitle);
    } else {
      // No file path available
      showPreviewUnavailable(doc.documentTitle || 'Unknown document');
    }

    // Update active tab
    updateActiveTab();
    updateNavigationButtons();
  }

  function switchDocument(index) {
    showDocument(index);
  }

  function updateActiveTab() {
    const tabs = documentTabs.querySelectorAll('.document-tab');
    tabs.forEach((tab, index) => {
      tab.classList.toggle('active', index === currentDocumentIndex);
    });
  }

  function updateNavigationButtons() {
    if (prevDocumentBtn) {
      prevDocumentBtn.disabled = currentDocumentIndex === 0;
    }
    if (nextDocumentBtn) {
      nextDocumentBtn.disabled = currentDocumentIndex === currentDocuments.length - 1;
    }
  }

  // -------------------------
  // Event Listeners for Document Navigation
  // -------------------------
  if (prevDocumentBtn) {
    prevDocumentBtn.addEventListener('click', () => {
      if (currentDocumentIndex > 0) {
        switchDocument(currentDocumentIndex - 1);
      }
    });
  }

  if (nextDocumentBtn) {
    nextDocumentBtn.addEventListener('click', () => {
      if (currentDocumentIndex < currentDocuments.length - 1) {
        switchDocument(currentDocumentIndex + 1);
      }
    });
  }

  // Printer selection/details removed — printing will use browser print preview

  // -------------------------
  // Event listeners for modals
  // -------------------------
  const backButton = document.getElementById('backBtn');
  const acceptBtn = document.getElementById('acceptBtn');
  const markDoneBtn = document.getElementById('markDoneBtn');

  if (backButton) {
    backButton.addEventListener('click', () => {
      closeModal(detailsModal);
    });
  }

  // Print button: open the document file in a new tab and trigger browser print preview
  if (acceptBtn) {
    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentDocuments || currentDocuments.length === 0) {
        alert('No document available to print.');
        return;
      }
      const doc = currentDocuments[currentDocumentIndex];
      if (!doc || !doc.filePath) {
        alert('No file available to print.');
        return;
      }
      const fileUrl = `${API_BASE}${doc.filePath}`;
      const w = window.open(fileUrl, '_blank');
      if (w) {
        // Try to trigger print after load — may be blocked by browser depending on cross-origin
        w.addEventListener('load', () => { try { w.focus(); w.print(); } catch (err) { /* ignore */ } });
      }
    });
  }

  // Mark as done: set request status to Completed via PATCH and refresh view
  if (markDoneBtn) {
    markDoneBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentRequestId) return;
      if (!confirm('Mark this request as completed? This will move it to history.')) return;
      try {
        const resp = await fetch(`${REQUESTS_ENDPOINT}/${currentRequestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Completed' })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update request');
        }
        // Close modal and refresh list
        closeModal(detailsModal);
        printData = await fetchPrintRequests();
        renderView(printData);
        await updateQueueCount();
      } catch (err) {
        console.error('Error marking as done:', err);
        alert('Failed to mark request as completed. See console for details.');
      }
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
      // printer modals removed for this page
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
            <td colspan="7" style="text-align: center; padding: 40px; color: #6b7780;">
              Loading print records...
            </td>
          </tr>
        `;
      }

      // Fetch data from database
      printData = await fetchPrintRequests();
      filtered = [...printData];

      // Update queue count
      await updateQueueCount();

      // Render the view
      renderView(printData);
      // No printer modal on this page anymore (printing opens browser print preview)
      // attachPrinterDetailHandlers();
      checkForQueueRedirect();

    } catch (error) {
      console.error("Error initializing print records:", error);
      if (recordsBody) {
        recordsBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
              Error loading print records
            </td>
          </tr>
        `;
      }
    }
  }

  // ------------------------- 
  // Printer selection/details removed — printing will use browser print preview

  // Start the app
  initialize();

  // Set up periodic queue count updates (every 30 seconds)
  setInterval(updateQueueCount, 30000);

  // expose for debugging
  window.__printRecordDemo = {
    printData,
    renderView,
    openFilterPanel: (t) => openFilterPanel(t),
    showDetails,
    fetchPrintRequests,
    updateQueueCount,
    downloadCurrentDocument
  };

});