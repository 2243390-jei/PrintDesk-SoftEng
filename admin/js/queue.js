document.addEventListener("DOMContentLoaded", () => {
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
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const previewPlaceholder = document.getElementById('previewPlaceholder');

  // -------------------------
  // State
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let queueData = []; // Will be populated from backend
  let filtered = [];
  let view = "table"; // 'table' | 'board' | 'list'
  let activeFilters = { status: null, dateFrom: null, dateTo: null };
  let currentRequestId = null;

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

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
    const status = text.toLowerCase();
    if (status === "completed") return `<span class="pill accepted">${text}</span>`;
    if (status === "accepted") return `<span class="pill accepted">${text}</span>`;
    if (status === "rejected") return `<span class="pill rejected">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
  }
  
  function statusPillText(text) {
    return statusPill(text);
  }

  // Function to check if file is an image
  function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  // Function to check if file is a PDF
  function isPdfFile(filename) {
    return filename.toLowerCase().endsWith('.pdf');
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
      
      // Sort by createdAt (oldest first) to maintain queue order
      const sortedData = data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Transform backend data to frontend format with queue numbers
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
              printingSide: "Unknown",
              filePath: null
            };
        
        // Format date for display
        const createdDate = new Date(request.createdAt);
        const formattedDate = `${createdDate.getMonth() + 1}/${createdDate.getDate()}/${createdDate.getFullYear().toString().slice(-2)}`;
        
        // Use the status from database, default to "Pending" if not present
        const status = request.status || "Pending";
        
        // Determine preview type and URL
        let previewImage = "../../images/SLU_Logo.png";
        let previewType = "image";
        
        if (primaryDoc.filePath) {
          const fullFilePath = `${API_BASE}${primaryDoc.filePath}`;
          if (isImageFile(primaryDoc.documentTitle)) {
            previewImage = fullFilePath;
            previewType = "image";
          } else if (isPdfFile(primaryDoc.documentTitle)) {
            previewImage = "../../images/pdf-icon.png"; // You can add a PDF icon
            previewType = "pdf";
          } else {
            previewImage = "../../images/document-icon.png"; // Generic document icon
            previewType = "document";
          }
        }
        
        return {
          id: request._id, // Use the actual MongoDB _id for internal reference
          queueNumber: index + 1, // This is the display queue number (1, 2, 3, ...)
          name: request.fullName,
          course: request.courseYear,
          date: formattedDate,
          status: status,
          details: {
            submittedOn: createdDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            totalCost: `${request.totalTokens} tokens`,
            status: status,
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
            previewImage: previewImage,
            previewType: previewType,
            filePath: primaryDoc.filePath ? `${API_BASE}${primaryDoc.filePath}` : null,
            // Include all documents for the print management page
            allDocuments: request.documents || [],
            email: request.email,
            totalTokens: request.totalTokens
          }
        };
      });
    } catch (error) {
      console.error("Error fetching print requests:", error);
      // Return empty array if API fails
      return [];
    }
  }

  async function updateRequestStatus(requestId, newStatus) {
    try {
      const response = await fetch(`${REQUESTS_ENDPOINT}/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
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
        <td>${item.queueNumber}</td>
        <td>
          <div class="user-name">
            <div class="user-avatar" aria-hidden="true">${item.name.split(" ")[0].slice(0,1)}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${item.name}</div>
              <div style="font-size:13px; color: #6b7780;">${item.course}</div>
            </div>
          </div>
        </td>
        <td>${item.course}</td>
        <td>${item.date}</td>
        <td>${statusPill(item.status)}</td>
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
        <div class="queue-badge">#${item.queueNumber}</div>
        <div class="avatar">${item.name.split(" ")[0].slice(0,1)}</div>
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
        <div style="width:60px;font-weight:700;text-align:center;">#${item.queueNumber}</div>
        <div class="avatar">${item.name.split(" ")[0].slice(0,1)}</div>
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
        item.date.includes(q) ||
        item.queueNumber.toString().includes(q);

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
      const acceptedBtn = document.createElement("button"); acceptedBtn.textContent = "Accepted";
      const completedBtn = document.createElement("button"); completedBtn.textContent = "Completed";
      const rejectedBtn = document.createElement("button"); rejectedBtn.textContent = "Rejected";
      const clearBtn = document.createElement("button"); clearBtn.textContent = "Clear";

      pendingBtn.addEventListener("click", () => { activeFilters.status = "Pending"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      acceptedBtn.addEventListener("click", () => { activeFilters.status = "Accepted"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      completedBtn.addEventListener("click", () => { activeFilters.status = "Completed"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      rejectedBtn.addEventListener("click", () => { activeFilters.status = "Rejected"; currentPage = 1; renderView(queueData); hideFilterPanel(); });
      clearBtn.addEventListener("click", () => { activeFilters.status = null; currentPage = 1; renderView(queueData); hideFilterPanel(); });

      filterPanel.appendChild(label);
      filterPanel.appendChild(pendingBtn);
      filterPanel.appendChild(acceptedBtn);
      filterPanel.appendChild(completedBtn);
      filterPanel.appendChild(rejectedBtn);
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
  // Modal: View Details with Enhanced Preview
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
    if (requestId) requestId.textContent = `Queue #${item.queueNumber}`;
    if (fileName) fileName.textContent = item.details.fileName;
    if (pageCount) pageCount.textContent = item.details.pageCount;
    if (copiesCount) copiesCount.textContent = item.details.copies;
    if (paperSize) paperSize.textContent = item.details.paperSize;
    if (printType) printType.textContent = item.details.printType;
    if (printingSide) printingSide.textContent = item.details.printingSide;
    if (pickupDate) pickupDate.textContent = item.details.pickupDate;

    // Enhanced preview handling
    if (previewImage && previewContainer) {
      const fileName = item.details.fileName;
      
      // Hide placeholder if we have a file
      if (previewPlaceholder) {
        previewPlaceholder.style.display = item.details.filePath ? 'none' : 'block';
      }

      if (item.details.filePath) {
        if (isImageFile(fileName)) {
          // Show actual image for image files
          previewImage.src = item.details.filePath;
          previewImage.alt = `Preview of ${fileName}`;
          previewImage.style.display = 'block';
          previewImage.onerror = function() {
            // If image fails to load, show placeholder
            this.style.display = 'none';
            if (previewPlaceholder) previewPlaceholder.style.display = 'block';
          };
        } else if (isPdfFile(fileName)) {
          // For PDF files, show PDF icon and download link
          previewImage.src = "../../images/pdf-icon.png";
          previewImage.alt = `PDF Document: ${fileName}`;
          previewImage.style.display = 'block';
          
          // Add download button for PDF
          let downloadBtn = previewContainer.querySelector('.download-btn');
          if (!downloadBtn) {
            downloadBtn = document.createElement('a');
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = 'Download PDF';
            downloadBtn.style.display = 'block';
            downloadBtn.style.marginTop = '10px';
            downloadBtn.style.padding = '8px 16px';
            downloadBtn.style.backgroundColor = '#007bff';
            downloadBtn.style.color = 'white';
            downloadBtn.style.textDecoration = 'none';
            downloadBtn.style.borderRadius = '4px';
            downloadBtn.style.textAlign = 'center';
            previewContainer.appendChild(downloadBtn);
          }
          downloadBtn.href = item.details.filePath;
          downloadBtn.download = fileName;
          downloadBtn.style.display = 'block';
        } else {
          // For other file types, show document icon
          previewImage.src = "../../images/document-icon.png";
          previewImage.alt = `Document: ${fileName}`;
          previewImage.style.display = 'block';
        }
      } else {
        // No file available
        previewImage.style.display = 'none';
        if (previewPlaceholder) previewPlaceholder.style.display = 'block';
      }
    }

    // Show/hide action buttons based on current status
    if (rejectBtn && acceptBtn) {
      if (item.details.status === "Pending") {
        rejectBtn.style.display = "block";
        acceptBtn.style.display = "block";
      } else {
        rejectBtn.style.display = "none";
        acceptBtn.style.display = "none";
      }
    }

    openModal(detailsModal);
  }

  // Handle back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentRequestId = null;
      closeModal(detailsModal);
    });
  }

  // Handle reject action
  async function handleReject(id) {
    const item = queueData.find(item => item.id === id);
    
    if (item) {
      try {
        // Update status in backend
        await updateRequestStatus(item.details.requestId, "Rejected");
        
        // Update the status to Rejected in frontend
        item.details.status = "Rejected";
        item.status = "Rejected";
        
        // Show confirmation message
        alert(`Request Queue #${item.queueNumber} has been rejected.`);
        
        // Close the modal
        closeModal(detailsModal);
        
        // Refresh the view to reflect changes
        renderView(queueData);
      } catch (error) {
        alert("Failed to reject request. Please try again.");
        console.error("Error rejecting request:", error);
      }
    }
  }

  // Handle accept action
  async function handleAccept(id) {
    const item = queueData.find(item => item.id === id);
    
    if (item) {
      try {
        // Update status in backend
        await updateRequestStatus(item.details.requestId, "Accepted");
        
        // Update the status to Accepted in frontend
        item.status = "Accepted";
        item.details.status = "Accepted";
        
        // Store the request data in sessionStorage to pass to print management page
        sessionStorage.setItem('selectedRequest', JSON.stringify(item));
        
        // Show confirmation message
        alert(`Request Queue #${item.queueNumber} has been accepted and moved to print management.`);
        
        // Close modal
        closeModal(detailsModal);
        
        // Refresh the view to reflect changes
        renderView(queueData);
        
        // Redirect to print management page
        window.location.href = '../html/printmanagement.html';
      } catch (error) {
        alert("Failed to accept request. Please try again.");
        console.error("Error accepting request:", error);
      }
    }
  }

  // Add event listeners to action buttons
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function() {
      if (currentRequestId) handleReject(currentRequestId);
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      if (currentRequestId) handleAccept(currentRequestId);
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
        const id = btn.getAttribute('data-id');
        if (id) openDetailsForId(id);
      });
    });
  }

  // -------------------------
  // Initialize (fetch data and render first view)
  // -------------------------
  async function initialize() {
    try {
      // Show loading state
      if (queueBody) queueBody.innerHTML = "<tr><td colspan='6'>Loading print requests...</td></tr>";
      
      // Fetch data from backend
      queueData = await fetchPrintRequests();
      
      // Render the view
      renderView(queueData);
    } catch (error) {
      console.error("Error initializing:", error);
      if (queueBody) queueBody.innerHTML = "<tr><td colspan='6'>Error loading print requests</td></tr>";
    }
  }

  initialize();

  // Expose some helpers to console for quick testing (optional)
  window.__queueDemo = {
    queueData,
    renderView,
    openDetailsForId,
    fetchPrintRequests
  };
});