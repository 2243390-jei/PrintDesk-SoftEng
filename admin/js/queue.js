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
    pickupTime: null,
    queueTime: null,
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

      // Filter only pending requests for queue
      const pendingRequests = sortedData.filter(request => request.status === "Pending");

      // Transform backend data to frontend format with queue numbers
      const transformedData = [];
      let queueNumber = 1;

      pendingRequests.forEach((request) => {
        // Create separate queue items for each document
        if (request.documents && request.documents.length > 0) {
          request.documents.forEach((doc, docIndex) => {
            // Format dates for display
            const createdDate = new Date(request.createdAt);
            const formattedDate = formatDate(request.createdAt);
            const queueTime = formatTime(request.createdAt);
            const pickupTime = request.pickupDateTime ? formatTime(request.pickupDateTime) : "Not specified";

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
              id: `${request._id}_${docIndex}`, // Unique ID for each document
              requestId: request._id, // Original request ID
              queueNumber: queueNumber++,
              name: request.fullName,
              course: request.courseYear,
              date: formattedDate,
              queueTime: queueTime,
              pickupTime: pickupTime,
              status: request.status,
              documentIndex: docIndex,
              totalDocuments: request.documents.length,
              details: {
                submittedOn: createdDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                totalCost: `${request.totalTokens} tokens`,
                status: request.status,
                requestId: request._id,
                fileName: doc.documentTitle,
                pageCount: doc.pageCount,
                copies: doc.numberOfCopies,
                paperSize: doc.paperSize,
                printType: doc.printType,
                printingSide: doc.printingSide,
                pickupDate: request.pickupDateTime ?
                  new Date(request.pickupDateTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : "Not specified",
                previewImage: previewImage,
                previewType: previewType,
                filePath: doc.filePath ? `${API_BASE}${doc.filePath}` : null,
                // Include all documents for the modal view
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

          transformedData.push({
            id: request._id,
            requestId: request._id,
            queueNumber: queueNumber++,
            name: request.fullName,
            course: request.courseYear,
            date: formattedDate,
            queueTime: queueTime,
            pickupTime: pickupTime,
            status: request.status,
            documentIndex: 0,
            totalDocuments: 1,
            details: {
              submittedOn: createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              totalCost: `${request.totalTokens} tokens`,
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

      return transformedData;
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

    // Remove the "Status" and "Actions" header text (if present) to hide those column labels
    document.querySelectorAll('th').forEach(th => {
      if (!th.textContent) return;
      const txt = th.textContent.trim().toLowerCase();
      if (txt === 'status' || txt === 'action' || txt === 'actions') {
        th.textContent = '';
      }
    });

    if (list.length === 0) {
      queueBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7780;">No pending requests in queue</td></tr>`;
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
            <div class="user-avatar" aria-hidden="true">${item.name.split(" ")[0].slice(0, 1)}</div>
            <div>
              <div style="font-weight:700; font-size:14px;">${item.name}</div>
              <div style="font-size:13px; color: #6b7780;">${item.course}</div>
            </div>
          </div>
        </td>
        <td>${item.course}</td>
        <td>${item.date}</td>
        <td>
          <div style="font-size:13px;">
            Document ${item.documentIndex + 1} of ${item.totalDocuments}
          </div>
        </td>
        <td class="col-actions">
          <button class="view-details-btn" data-id="${item.id}" aria-label="View details for queue ${item.queueNumber}" title="View details">
            <span class="icon" aria-hidden="true"></span>
            <span class="btn-text" style="margin-left:6px;">View Details</span>
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
  // Filters (search + pickupTime/queueTime/date)
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

      // pickup time filter
      let matchesPickupTime = true;
      if (activeFilters.pickupTime) {
        matchesPickupTime = item.pickupTime.toLowerCase().includes(activeFilters.pickupTime.toLowerCase());
      }

      // queue time filter
      let matchesQueueTime = true;
      if (activeFilters.queueTime) {
        matchesQueueTime = item.queueTime.toLowerCase().includes(activeFilters.queueTime.toLowerCase());
      }

      // date range
      let matchesDate = true;
      if (activeFilters.dateFrom) {
        matchesDate = matchesDate && (new Date(item.date) >= new Date(activeFilters.dateFrom));
      }
      if (activeFilters.dateTo) {
        matchesDate = matchesDate && (new Date(item.date) <= new Date(activeFilters.dateTo));
      }

      return matchesSearch && matchesPickupTime && matchesQueueTime && matchesDate;
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
        if (action === "open-filter") {
          const f = btn.dataset.filter;
          openFilterPanel(f);
        } else if (action === "apply") {
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

    if (type === "pickupTime") {
      const label = document.createElement("div");
      label.textContent = "Pickup Time";
      label.style.fontWeight = "700";
      label.style.marginBottom = "8px";

      const timeSelect = document.createElement("select");
      timeSelect.style.width = "100%";
      timeSelect.style.padding = "8px";
      timeSelect.style.borderRadius = "4px";
      timeSelect.style.border = "1px solid #ddd";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "All pickup times";
      timeSelect.appendChild(defaultOption);

      // Add time options (you can customize these)
      const timeOptions = ["Morning", "Afternoon", "Evening"];
      timeOptions.forEach(time => {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = time;
        option.selected = activeFilters.pickupTime === time;
        timeSelect.appendChild(option);
      });

      const apply = document.createElement("button");
      apply.textContent = "Apply";
      const clear = document.createElement("button");
      clear.textContent = "Clear";

      apply.addEventListener("click", () => {
        activeFilters.pickupTime = timeSelect.value || null;
        currentPage = 1;
        renderView(queueData);
        hideFilterPanel();
      });

      clear.addEventListener("click", () => {
        activeFilters.pickupTime = null;
        currentPage = 1;
        renderView(queueData);
        hideFilterPanel();
      });

      filterPanel.appendChild(label);
      filterPanel.appendChild(timeSelect);
      filterPanel.appendChild(apply);
      filterPanel.appendChild(clear);
    }

    if (type === "queueTime") {
      const label = document.createElement("div");
      label.textContent = "Queue Time";
      label.style.fontWeight = "700";
      label.style.marginBottom = "8px";

      const timeSelect = document.createElement("select");
      timeSelect.style.width = "100%";
      timeSelect.style.padding = "8px";
      timeSelect.style.borderRadius = "4px";
      timeSelect.style.border = "1px solid #ddd";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "All queue times";
      timeSelect.appendChild(defaultOption);

      // Add time options
      const timeOptions = ["Morning", "Afternoon", "Evening"];
      timeOptions.forEach(time => {
        const option = document.createElement("option");
        option.value = time;
        option.textContent = time;
        option.selected = activeFilters.queueTime === time;
        timeSelect.appendChild(option);
      });

      const apply = document.createElement("button");
      apply.textContent = "Apply";
      const clear = document.createElement("button");
      clear.textContent = "Clear";

      apply.addEventListener("click", () => {
        activeFilters.queueTime = timeSelect.value || null;
        currentPage = 1;
        renderView(queueData);
        hideFilterPanel();
      });

      clear.addEventListener("click", () => {
        activeFilters.queueTime = null;
        currentPage = 1;
        renderView(queueData);
        hideFilterPanel();
      });

      filterPanel.appendChild(label);
      filterPanel.appendChild(timeSelect);
      filterPanel.appendChild(apply);
      filterPanel.appendChild(clear);
    }

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
  function openDetailsForId(id) {
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

    // Render all documents for this request
    renderAllDocuments(item);

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

  function renderAllDocuments(item) {
    if (!documentsContainer) return;
    documentsContainer.innerHTML = "";

    const allDocuments = item.details.allDocuments || [];

    if (allDocuments.length === 0) {
      documentsContainer.innerHTML = `<div class="document-item">No documents available</div>`;
      return;
    }

    allDocuments.forEach((docData, index) => {
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
        if (isImageFile(fileName)) {
          // Image preview (PNG/JPG/GIF/etc.)
          const img = document.createElement("img");
          img.src = fileUrl;
          img.alt = `Preview of ${fileName}`;
          img.className = "preview-image";
          img.tabIndex = 0;
          previewWrapper.appendChild(img);
        } else if (isPdfFile(fileName)) {
          // PDF preview using <object> with fallback link
          const pdfWrap = document.createElement("div");
          pdfWrap.className = "pdf-preview-wrapper";
          const obj = document.createElement("object");
          obj.data = fileUrl;
          obj.type = "application/pdf";
          obj.width = "100%";
          obj.height = "420";
          // Fallback content inside object for browsers that don't render PDFs
          obj.innerHTML = `<p>Unable to display PDF preview. <a href="${fileUrl}" target="_blank" rel="noopener">Open PDF in new tab</a></p>`;
          pdfWrap.appendChild(obj);
          // Add explicit open/download links as well
          const links = document.createElement("div");
          links.className = "file-links";
          links.innerHTML = `<a href="${fileUrl}" target="_blank" rel="noopener" class="open-btn">Open PDF</a>
                             <a href="${fileUrl}" download="${fileName}" class="download-btn">Download</a>`;
          pdfWrap.appendChild(links);
          previewWrapper.appendChild(pdfWrap);
        } else {
          // Generic file preview (icon + links)
          const fileWrap = document.createElement("div");
          fileWrap.className = "file-preview-wrapper";
          const icon = document.createElement("img");
          icon.src = "../../images/document-icon.png";
          icon.alt = "Document icon";
          icon.className = "preview-image";
          fileWrap.appendChild(icon);
          const links = document.createElement("div");
          links.className = "file-links";
          links.innerHTML = `<a href="${fileUrl}" download="${fileName}" class="download-btn">Download</a>
                             <a href="${fileUrl}" target="_blank" rel="noopener" class="open-btn">Open</a>`;
          fileWrap.appendChild(links);
          previewWrapper.appendChild(fileWrap);
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
      `;
      docItem.appendChild(meta);

      documentsContainer.appendChild(docItem);
    });
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
        // Update status in backend for the entire request
        await updateRequestStatus(item.requestId, "Rejected");

        // Show confirmation message
        alert(`Request Queue #${item.queueNumber} has been rejected.`);

        // Close the modal
        closeModal(detailsModal);

        // Refresh the data to reflect changes
        await initialize();
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
        // Update status in backend for the entire request
        await updateRequestStatus(item.requestId, "Accepted");

        // Store the request data in sessionStorage to pass to print management page
        sessionStorage.setItem('selectedRequest', JSON.stringify(item));

        // Show confirmation message
        alert(`Request Queue #${item.queueNumber} has been accepted and moved to print management.`);

        // Close modal
        closeModal(detailsModal);

        // Refresh the data to reflect changes
        await initialize();

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
  // Initialize (fetch data and render first view)
  // -------------------------
  async function initialize() {
    try {
      // Show loading state
      if (queueBody) queueBody.innerHTML = "<tr><td colspan='6'>Loading print requests...</td></tr>";

      // Fetch data from backend
      queueData = await fetchPrintRequests();
      console.log("Fetched queue data:", queueData);

      // set footer year if element exists
      if (curYear) curYear.textContent = new Date().getFullYear();

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
