document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const queueBody = document.getElementById("queueBody");
  const searchInput = document.getElementById("searchInput");
  const curYear = document.getElementById("curYear");
  const pageNumbers = document.getElementById("pageNumbers");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const sidebarQueueCount = document.getElementById("sidebarQueueCount");

  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const filterPanel = document.getElementById("filterPanel");

  // Modal elements
  const detailsModal = document.getElementById('detailsModal');
  const backBtn = document.getElementById('backBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const acceptBtn = document.getElementById('acceptBtn');
  const documentsContainer = document.getElementById('documentsContainer');

  // Logout elements
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const confirmLogout = document.getElementById('confirmLogout');

  // Detail elements
  const submittedDate = document.getElementById('submittedDate');
  const totalCost = document.getElementById('totalCost');
  const statusBadge = document.getElementById('statusBadge');
  const requestId = document.getElementById('requestId');

  // -------------------------
  // State
  // -------------------------
  let perPage = 5;
  let currentPage = 1;
  let queueData = []; // Will be populated from backend
  let filtered = [];
  let activeFilters = {
    dateFrom: null,
    dateTo: null
  };
  let currentRequestId = null;
  
  // API endpoints
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  // -------------------------
  // Utility helpers
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

  function statusPill(text) {
    if (!text) return '';
    const status = text.toLowerCase();
    if (status === "completed") return `<span class="pill completed">${text}</span>`;
    if (status === "accepted") return `<span class="pill accepted">${text}</span>`;
    if (status === "rejected") return `<span class="pill rejected">${text}</span>`;
    if (status === "cancelled") return `<span class="pill cancelled">${text}</span>`;
    return `<span class="pill pending">${text}</span>`;
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

  // Function to format time for display
  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Function to format date for display
  function formatDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d)) return dateString || '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  // Check if a file exists on the server before attempting preview
  async function checkFileExists(url) {
    try {
      let resp = await fetch(url, { method: 'HEAD' });
      if (resp && resp.ok) return true;
      // Fallback to GET if HEAD not allowed
      resp = await fetch(url, { method: 'GET' });
      return resp && resp.ok;
    } catch (err) {
      return false;
    }
  }

  function showPreviewUnavailable(wrapper, filename, reason = 'deleted', fileUrl = null) {
    let message = `No preview available for ${filename}`;
    if (reason === 'unsupported') {
      message = "We're sorry, but for some reason we can't open this for you.";
    }
    if (reason === 'notfound') {
      message = 'File not found';
    }

    // Placeholder with image + message. If a file URL is provided, show a download/view link beneath it.
    wrapper.innerHTML = `
      <div class="preview-placeholder" style="text-align:center; padding:20px; color:#6b7780;">
        <img src="../../images/admin_img/document-preview.png" alt="Document" style="max-width:80px; opacity:0.9; margin-bottom:12px;" />
        <p style="margin:0 0 8px 0;">${message}</p>
      </div>
    `;

    if (fileUrl) {
      const links = document.createElement('div');
      links.style.textAlign = 'center';
      links.style.paddingBottom = '12px';
      // Single link that opens the file in a new tab so user can view or save it
      links.innerHTML = `<p style="margin:0; font-size:14px; color:#6b7780;">Can't view the file? <a href="${fileUrl}" target="_blank" rel="noopener" style="color:#0d6efd; text-decoration:none; font-weight:500;">Download the file</a></p>`;
      wrapper.appendChild(links);
    }
  }

  // -------------------------
  // API Functions - FIXED VERSION with Date Filtering & Auto-Cancellation
  // -------------------------
  async function fetchPrintRequests() {
    try {
      console.log("Fetching queue requests from:", REQUESTS_ENDPOINT);
      const response = await fetch(REQUESTS_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Raw API data:", data);

      // Get today's date at midnight (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log("Today's date (for filtering):", today.toDateString());

      // Filter only pending requests for queue
      const pendingRequests = data.filter(request => request.status === "Pending");
      console.log("All pending requests:", pendingRequests.length);

      // Separate requests by date and auto-cancel past ones
      const validRequests = [];
      const requestsToCancel = [];
      
      for (const request of pendingRequests) {
        const requestDate = new Date(request.createdAt);
        requestDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Compare dates (ignore time) - ONLY show today and future dates
        if (requestDate < today) {
          // Auto-cancel past requests
          console.log(`Auto-cancelling past request: ${request._id} from ${requestDate.toDateString()}`);
          requestsToCancel.push(request._id);
        } else {
          // Keep only today and future requests
          console.log(`Keeping request: ${request._id} from ${requestDate.toDateString()}`);
          validRequests.push(request);
        }
      }

      // Batch cancel past requests
      if (requestsToCancel.length > 0) {
        console.log(`Cancelling ${requestsToCancel.length} past requests...`);
        for (const requestId of requestsToCancel) {
          try {
            await updateRequestStatus(requestId, "Cancelled");
            console.log(`✓ Request ${requestId} cancelled`);
          } catch (error) {
            console.error(`✗ Failed to cancel request ${requestId}:`, error);
          }
        }
      }

      console.log("Valid (today & future) requests:", validRequests.length);

      // Transform backend data to frontend format with queue numbers
      const transformedData = [];
      let queueNumber = 1;

      validRequests.forEach((request) => {
        // Create separate queue items for each document
        if (request.documents && request.documents.length > 0) {
          request.documents.forEach((doc, docIndex) => {
            // Format dates for display
            const createdDate = new Date(request.createdAt);
            const formattedDate = formatDate(request.createdAt);
            const queueTime = formatTime(request.createdAt);
            const pickupTime = request.pickupDateTime ? formatTime(request.pickupDateTime) : "Not specified";
            const pickupDate = request.pickupDateTime ? (() => {
              const pd = new Date(request.pickupDateTime);
              if (isNaN(pd)) return 'Not specified';
              const mm = String(pd.getMonth() + 1).padStart(2, '0');
              const dd = String(pd.getDate()).padStart(2, '0');
              const yy = String(pd.getFullYear()).slice(-2);
              return `${mm}/${dd}/${yy}`;
            })() : 'Not specified';

            // Determine preview type and URL
            let previewImage = "../../images/SLU_Logo.png";
            let previewType = "image";

            if (doc.filePath) {
              const fullFilePath = `${API_BASE}${doc.filePath}`;
              if (isImageFile(doc.documentTitle)) {
                previewImage = fullFilePath;
                previewType = "image";
              } else if (isPdfFile(doc.documentTitle)) {
                previewImage = "../../images/pdf-icon.png";
                previewType = "pdf";
              } else {
                previewImage = "../../images/document-icon.png";
                previewType = "document";
              }
            }

            transformedData.push({
              id: `${request._id}_${docIndex}`,
              requestId: request._id,
              queueNumber: queueNumber++,
              name: request.fullName || "Unknown",
              course: request.courseYear || "Unknown",
              date: formattedDate,
              queueTime: queueTime,
              pickupTime: pickupTime,
              pickupDate: pickupDate,
              status: request.status,
              documentIndex: docIndex,
              totalDocuments: request.documents.length,
              details: {
                submittedOn: createdDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                totalCost: `${request.totalTokens || 0} tokens`,
                status: request.status,
                requestId: request._id,
                fileName: doc.documentTitle || "Unknown Document",
                pageCount: doc.pageCount || 0,
                copies: doc.numberOfCopies || 1,
                paperSize: doc.paperSize || "Unknown",
                printType: doc.printType || "Unknown",
                printingSide: doc.printingSide || "Unknown",
                pickupDate: request.pickupDateTime ?
                  new Date(request.pickupDateTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : "Not specified",
                previewImage: previewImage,
                previewType: previewType,
                filePath: doc.filePath ? `${API_BASE}${doc.filePath}` : null,
                allDocuments: request.documents || [],
                email: request.email,
                totalTokens: request.totalTokens
              }
            });
          });
        } else {
          // Fallback for requests without documents
          const createdDate = new Date(request.createdAt);
          const formattedDate = formatDate(request.createdAt);
          const queueTime = formatTime(request.createdAt);
            const pickupTime = request.pickupDateTime ? formatTime(request.pickupDateTime) : "Not specified";
            const pickupDate = request.pickupDateTime ? (() => {
              const pd = new Date(request.pickupDateTime);
              if (isNaN(pd)) return 'Not specified';
              const mm = String(pd.getMonth() + 1).padStart(2, '0');
              const dd = String(pd.getDate()).padStart(2, '0');
              const yy = String(pd.getFullYear()).slice(-2);
              return `${mm}/${dd}/${yy}`;
            })() : 'Not specified';

          transformedData.push({
            id: request._id,
            requestId: request._id,
            queueNumber: queueNumber++,
            name: request.fullName || "Unknown",
            course: request.courseYear || "Unknown",
            date: formattedDate,
            queueTime: queueTime,
            pickupTime: pickupTime,
            pickupDate: pickupDate,
            status: request.status,
            documentIndex: 0,
            totalDocuments: 1,
            details: {
              submittedOn: createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              totalCost: `${request.totalTokens || 0} tokens`,
              status: request.status,
              requestId: request._id,
              fileName: "Unknown Document",
              pageCount: 0,
              copies: 1,
              paperSize: "Unknown",
              printType: "Unknown",
              printingSide: "Unknown",
              pickupDate: request.pickupDateTime ?
                new Date(request.pickupDateTime).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : "Not specified",
              previewImage: "../../images/SLU_Logo.png",
              previewType: "image",
              filePath: null,
              allDocuments: [],
              email: request.email,
              totalTokens: request.totalTokens
            }
          });
        }
      });

      console.log("Transformed queue data:", transformedData);
      return transformedData;
    } catch (error) {
      console.error("Error fetching print requests:", error);
      return [];
    }
  }

  // -------------------------
  // Update Request Status Function - FIXED VERSION
  // -------------------------
  async function updateRequestStatus(requestId, newStatus) {
    try {
      console.log(`Updating request ${requestId} to status: ${newStatus}`);
      
      const response = await fetch(`${REQUESTS_ENDPOINT}/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          // Add timestamps and reasons for certain statuses
          ...(newStatus === "Rejected" && { 
            rejectionReason: "Rejected by admin",
            rejectedAt: new Date().toISOString()
          }),
          ...(newStatus === "Cancelled" && { 
            cancellationReason: "Auto-cancelled: Past submission date",
            cancelledAt: new Date().toISOString()
          })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Update response:", result);
      return result;
    } catch (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
  }

  // -------------------------
  // Renderers - FIXED VERSION
  // -------------------------
  function renderTable(list) {
    if (!queueBody) {
      console.error("Queue body element not found!");
      return;
    }
    
    queueBody.innerHTML = "";

    // Remove the "Status" and "Actions" header text (if present) to hide those column labels
    document.querySelectorAll('th').forEach(th => {
      if (!th.textContent) return;
      const txt = th.textContent.trim().toLowerCase();
      if (txt === 'status' || txt === 'action' || txt === 'actions') {
        th.textContent = '';
      }
    });

    if (list.length === 0) {
      queueBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6b7780;">No pending requests in queue</td></tr>`;
      return;
    }

    const start = (currentPage - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    pageItems.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.queueNumber}</td>
        <td>
          <div class="user-name">
            <div class="user-avatar" aria-hidden="true">${item.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${item.name}</div>
              <div style="font-size:13px; color: #6b7780;">${item.course}</div>
            </div>
          </div>
        </td>
        <td>${item.course}</td>
        <td>${item.date}</td>
        <td class="col-pickup">${item.pickupDate || 'Not specified'}</td>
        <td>
          <div style="font-size:13px;">
            Document ${item.documentIndex + 1} of ${item.totalDocuments}
          </div>
        </td>
        <td class="col-actions">
          <button class="view-details-btn" data-id="${item.id}" aria-label="View details for queue ${item.queueNumber}" title="View details">
            View Details
          </button>
        </td>
      `;
      queueBody.appendChild(tr);
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
  // Filters (search + date)
  // -------------------------
  function applyFiltersToList(list) {
    // Always read the current search input from the DOM (handles cloned/replaced input)
    const searchEl = document.getElementById('searchInput');
    const q = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : "";
    
    return list.filter(item => {
      // Search across multiple fields
      const matchesSearch = q === "" ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.course && item.course.toLowerCase().includes(q)) ||
        (item.date && item.date.toLowerCase().includes(q)) ||
        (item.queueNumber && item.queueNumber.toString().includes(q));

      // date range only (pickupTime & queueTime filters removed)
      let matchesDate = true;
      if (activeFilters.dateFrom || activeFilters.dateTo) {
        const recordDateParts = item.date ? item.date.split('/') : [];
        if (recordDateParts.length === 3) {
          let recordDate;
          try {
            recordDate = new Date(
              parseInt(recordDateParts[2]) + 2000,
              parseInt(recordDateParts[0]) - 1,
              parseInt(recordDateParts[1])
            );
          } catch (error) {
            recordDate = new Date(item.date);
          }
          const normalizeToStartOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
          if (activeFilters.dateFrom) {
            const filterFrom = normalizeToStartOfDay(activeFilters.dateFrom);
            const recordDateNormalized = normalizeToStartOfDay(recordDate);
            matchesDate = matchesDate && (recordDateNormalized >= filterFrom);
          }
          if (activeFilters.dateTo) {
            const filterTo = normalizeToStartOfDay(activeFilters.dateTo);
            const recordDateNormalized = normalizeToStartOfDay(recordDate);
            matchesDate = matchesDate && (recordDateNormalized <= filterTo);
          }
        } else {
          try {
            const recordDate = new Date(item.date);
            if (activeFilters.dateFrom) {
              const filterFrom = new Date(activeFilters.dateFrom);
              filterFrom.setHours(0,0,0,0);
              const recordDateNormalized = new Date(recordDate);
              recordDateNormalized.setHours(0,0,0,0);
              matchesDate = matchesDate && (recordDateNormalized >= filterFrom);
            }
            if (activeFilters.dateTo) {
              const filterTo = new Date(activeFilters.dateTo);
              filterTo.setHours(23,59,59,999);
              const recordDateNormalized = new Date(recordDate);
              recordDateNormalized.setHours(23,59,59,999);
              matchesDate = matchesDate && (recordDateNormalized <= filterTo);
            }
          } catch (error) {
            console.warn('Error parsing date for filtering:', error);
          }
        }
      }

      return matchesSearch && matchesDate;
    });
  }

  function renderView(list) {
    // apply filters
    filtered = applyFiltersToList(list);
    // if current page is out-of-bounds after filtering, reset to 1
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = 1;

    renderTable(filtered);

    // Update sidebar queue count
    if (sidebarQueueCount) {
      sidebarQueueCount.textContent = filtered.length;
      if (filtered.length === 0) {
        sidebarQueueCount.style.display = 'none';
      } else {
        sidebarQueueCount.style.display = 'flex';
      }
    }
  }

  // -------------------------
  // Search - FIXED: Added proper event listener
  // -------------------------
  function setupSearch() {
    if (!searchInput) {
      console.error("Search input element not found!");
      return;
    }
    
    // Clear any existing event listeners first
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    // Get the new reference
    const currentSearchInput = document.getElementById("searchInput");
    
    currentSearchInput.addEventListener("input", (e) => {
      currentPage = 1;
      renderView(queueData);
    });
    
    // Also add keydown for Enter key
    currentSearchInput.addEventListener("keydown", (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        currentPage = 1;
        renderView(queueData);
      }
    });
    
    // Clear search when page loads
    currentSearchInput.value = '';
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
        if (action === "open-filter") {
          const f = btn.dataset.filter;
          // only 'date' is available now; openFilterPanel will handle it
          openFilterPanel(f);
        } else if (action === "clear") { 
          // Clear all active filters (only date filters exist now)
          activeFilters = {
            dateFrom: null,
            dateTo: null
          };
          currentPage = 1;
          renderView(queueData);
          hideFilterPanel();
          filterMenu.classList.remove("open");
        }
      });
    });
  }

  // -------------------------
  // Filter panel rendering (date only)
  // -------------------------
  function openFilterPanel(type) {
    if (!filterPanel) return;
    filterPanel.innerHTML = "";
    filterPanel.classList.remove("visually-hidden");
    filterPanel.setAttribute("aria-hidden", "false");

    if (type === "date") {
      const label = document.createElement("div");
      label.textContent = "Date range";
      label.style.fontWeight = "700";
      const from = document.createElement("input");
      from.type = "date";
      from.value = activeFilters.dateFrom || "";
      from.style.width = "100%";
      from.style.padding = "8px";
      from.style.marginBottom = "8px";
      from.style.borderRadius = "4px";
      from.style.border = "1px solid #ddd";

      const to = document.createElement("input");
      to.type = "date";
      to.value = activeFilters.dateTo || "";
      to.style.width = "100%";
      to.style.padding = "8px";
      to.style.marginBottom = "8px";
      to.style.borderRadius = "4px";
      to.style.border = "1px solid #ddd";

      const apply = document.createElement("button");
      apply.textContent = "Apply";
      const clear = document.createElement("button");
      clear.textContent = "Clear";

      apply.addEventListener("click", () => {
        activeFilters.dateFrom = from.value || null;
        activeFilters.dateTo = to.value || null;
        currentPage = 1;
        renderView(queueData);
        hideFilterPanel();
      });

      clear.addEventListener("click", () => {
        activeFilters.dateFrom = null;
        activeFilters.dateTo = null;
        currentPage = 1;
        renderView(queueData);
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
  // Modal: View Details with Multiple Document Support
  // -------------------------
  async function openDetailsForId(id) {
    console.log("Opening details for ID:", id);
    const item = queueData.find(item => item.id === id);
    if (!item) {
      console.error("Item not found for ID:", id);
      return;
    }

    currentRequestId = id;

    // Update basic detail elements
    if (submittedDate) submittedDate.textContent = item.details.submittedOn;
    if (totalCost) totalCost.textContent = item.details.totalCost;
    if (statusBadge) {
      // keep badge styling but do not show status text in table column; modal still shows badge text
      statusBadge.textContent = item.details.status;
      statusBadge.className = `status-badge status-${item.details.status.toLowerCase()}`;
    }
    if (requestId) requestId.textContent = `Queue #${item.queueNumber}`;

    // Render all documents for this request (await existence checks)
    await renderAllDocuments(item);

    // Scroll/focus to the specific document preview that was clicked
    try {
      const selector = `[data-doc-index="${item.documentIndex}"]`;
      const targetDoc = documentsContainer ? documentsContainer.querySelector(selector) : null;
      if (targetDoc) {
        // small timeout to allow images to layout
        setTimeout(() => {
          targetDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = targetDoc.querySelector('a, button, img, [tabindex]');
          if (focusable) focusable.focus();
        }, 50);
      }
    } catch (err) {
      console.warn('Could not scroll to document preview:', err);
    }

    // Show/hide action buttons based on current status
    if (rejectBtn && acceptBtn) {
      if (item.details.status === "Pending") {
        rejectBtn.style.display = "flex";
        acceptBtn.style.display = "flex";
      } else {
        rejectBtn.style.display = "none";
        acceptBtn.style.display = "none";
      }
    }

    openModal(detailsModal);

    // ensure focus goes into the modal for accessibility/visibility
    if (detailsModal) {
      const focusEl = detailsModal.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (focusEl) focusEl.focus();
    }
  }

  async function renderAllDocuments(item) {
    if (!documentsContainer) return;
    documentsContainer.innerHTML = "";

    const allDocuments = item.details.allDocuments || [];

    if (allDocuments.length === 0) {
      documentsContainer.innerHTML = `<div class="document-item">No documents available</div>`;
      return;
    }

    for (let index = 0; index < allDocuments.length; index++) {
      const docData = allDocuments[index];
      const docItem = document.createElement("div");
      docItem.className = "document-item";
      docItem.setAttribute("data-doc-index", index);

      const fileName = docData.documentTitle || "Unknown Document";
      const fileUrl = docData.filePath
        ? (docData.filePath.startsWith("http") ? docData.filePath : `${API_BASE}${docData.filePath}`)
        : null;

      // Header
      const header = document.createElement("div");
      header.className = "document-header";
      header.innerHTML = `
        <div class="document-title">${fileName}</div>
        <div class="document-number">Document ${index + 1}</div>
      `;
      docItem.appendChild(header);

      // Preview area
      let previewWrapper = document.createElement("div");
      previewWrapper.className = "preview-wrapper";

      if (fileUrl) {
        // Verify resource exists before rendering preview
        const exists = await checkFileExists(fileUrl);
        if (!exists) {
          showPreviewUnavailable(previewWrapper, fileName, 'notfound');
        } else if (isImageFile(fileName)) {
          // Image preview (PNG/JPG/GIF/etc.) — inline, no print controls
          const img = document.createElement("img");
          img.src = fileUrl;
          img.alt = `Preview of ${fileName}`;
          img.className = "preview-image";
          img.tabIndex = 0;
          previewWrapper.appendChild(img);
        } else if (isPdfFile(fileName)) {
          // PDF preview using iframe with toolbar parameters to provide a flat preview
          const pdfContainer = document.createElement('div');
          pdfContainer.className = 'pdf-preview-container';
          const iframe = document.createElement('iframe');
          iframe.src = fileUrl + '#toolbar=0&navpanes=0';
          iframe.type = 'application/pdf';
          iframe.style.width = '100%';
          iframe.style.height = '400px';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '6px';
          pdfContainer.appendChild(iframe);
          previewWrapper.appendChild(pdfContainer);
        } else {
          // Unsupported file types — existence already checked, show apology placeholder
          showPreviewUnavailable(previewWrapper, fileName, 'unsupported', fileUrl);
        }
      } else {
        const noPreview = document.createElement("div");
        noPreview.style.textAlign = "center";
        noPreview.style.padding = "24px";
        noPreview.style.color = "#6b7780";
        noPreview.textContent = "No preview available";
        previewWrapper.appendChild(noPreview);
      }

      docItem.appendChild(previewWrapper);

      // Metadata grid
      const meta = document.createElement("div");
      meta.className = "preview-grid";
      meta.innerHTML = `
        <div class="preview-item"><div class="preview-label">File Name</div><div class="preview-value">${fileName}</div></div>
        <div class="preview-item"><div class="preview-label">Page Count</div><div class="preview-value">${docData.pageCount || 0}</div></div>
        <div class="preview-item"><div class="preview-label">Number of Copies</div><div class="preview-value">${docData.numberOfCopies || 1}</div></div>
        <div class="preview-item"><div class="preview-label">Paper Size</div><div class="preview-value">${docData.paperSize || "Unknown"}</div></div>
        <div class="preview-item"><div class="preview-label">Print Type</div><div class="preview-value">${docData.printType || "Unknown"}</div></div>
        <div class="preview-item"><div class="preview-label">Printing Side</div><div class="preview-value">${docData.printingSide || "Unknown"}</div></div>
        <div class="preview-item"><div class="preview-label">Additional Notes</div><div class="preview-value">${docData.notes || "N/A"}</div></div> 
      `;
      docItem.appendChild(meta);

      documentsContainer.appendChild(docItem);
    }
  }

  // Handle back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentRequestId = null;
      closeModal(detailsModal);
    });
  }

  // -------------------------
  // Handle Reject Action - FIXED VERSION
  // -------------------------
  async function handleReject(id) {
    const item = queueData.find(item => item.id === id);

    if (item) {
      if (!confirm(`Are you sure you want to reject Queue #${item.queueNumber}?`)) {
        return;
      }

      try {
        console.log(`Rejecting request: ${item.requestId}`);
        
        // Update status in backend for the entire request to "Rejected"
        const updatedRequest = await updateRequestStatus(item.requestId, "Rejected");
        
        if (updatedRequest && updatedRequest.status === "Rejected") {
          // Show confirmation message
          alert(`✅ Request Queue #${item.queueNumber} has been rejected.`);
          
          // Close the modal
          closeModal(detailsModal);
          
          // Refresh the data to reflect changes
          await initialize();
          
          console.log(`✓ Request ${item.requestId} successfully rejected.`);
        } else {
          throw new Error("Failed to update status in database");
        }
      } catch (error) {
        alert("❌ Failed to reject request. Please try again.");
        console.error("Error rejecting request:", error);
      }
    }
  }

  // -------------------------
  // Handle Accept Action - FIXED VERSION
  // -------------------------
  async function handleAccept(id) {
    const item = queueData.find(item => item.id === id);

    if (item) {
      if (!confirm(`Are you sure you want to accept Queue #${item.queueNumber}?`)) {
        return;
      }

      try {
        console.log(`Accepting request: ${item.requestId}`);
        
        // Update status in backend for the entire request to "Accepted"
        const updatedRequest = await updateRequestStatus(item.requestId, "Accepted");
        
        if (updatedRequest && updatedRequest.status === "Accepted") {
            // Store the server-updated request in sessionStorage to pass to print management page
            // This stores the authoritative record from the backend (includes _id and documents)
            try {
              sessionStorage.setItem('selectedRequest', JSON.stringify(updatedRequest));
            } catch (e) {
              // fallback to the client item if storing server response fails for any reason
              sessionStorage.setItem('selectedRequest', JSON.stringify(item));
            }

          // Show confirmation message
          alert(`✅ Request Queue #${item.queueNumber} has been accepted and moved to print management.`);

          // Close modal
          closeModal(detailsModal);

          // Refresh the data to reflect changes
          await initialize();

          // Redirect to print management page
          window.location.href = '../html/printmanagement.html';
        } else {
          throw new Error("Failed to update status in database");
        }
      } catch (error) {
        alert("❌ Failed to accept request. Please try again.");
        console.error("Error accepting request:", error);
      }
    }
  }

  // Add event listeners to action buttons
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function () {
      if (currentRequestId) handleReject(currentRequestId);
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function () {
      if (currentRequestId) handleAccept(currentRequestId);
    });
  }

  // -------------------------
  // Logout functionality
  // -------------------------
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(logoutModal);
    });
  }

  if (cancelLogout) {
    cancelLogout.addEventListener('click', function () {
      closeModal(logoutModal);
    });
  }

  if (confirmLogout) {
    confirmLogout.addEventListener('click', function () {
      // Perform logout actions here
      // For now, just redirect to login page
      window.location.href = '/index.html';
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
      if (logoutModal && logoutModal.classList.contains('open')) {
        closeModal(logoutModal);
      }
    }
  });

  // -------------------------
  // Attach click handlers to view details buttons (use delegation)
  // -------------------------
  function attachViewDetailsHandlers() {
    if (!queueBody) return;
    // ensure we only attach the delegated handler once
    if (queueBody._hasDelegate) return;

    queueBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-details-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      console.log("View details clicked for ID (delegated):", id);
      if (id) openDetailsForId(id);
    });

    queueBody._hasDelegate = true;
  }

  // -------------------------
  // Initialize (fetch data and render first view) - FIXED VERSION
  // -------------------------
  async function initialize() {
    try {
      console.log("Initializing queue management...");
      
      // Show loading state
      if (queueBody) queueBody.innerHTML = "<tr><td colspan='7'>Loading print requests...</td></tr>";

      // Fetch data from backend
      queueData = await fetchPrintRequests();
      console.log("Fetched queue data:", queueData);

      // set footer year if element exists
      if (curYear) curYear.textContent = new Date().getFullYear();

      // Setup search functionality
      setupSearch();

      // Render the view
      renderView(queueData);
    } catch (error) {
      console.error("Error initializing:", error);
      if (queueBody) queueBody.innerHTML = "<tr><td colspan='7'>Error loading print requests</td></tr>";
    }
  }

  initialize();

  // Expose some helpers to console for quick testing (optional)
  window.__queueDemo = {
    queueData,
    renderView,
    openDetailsForId,
    fetchPrintRequests,
    updateRequestStatus
  };
});