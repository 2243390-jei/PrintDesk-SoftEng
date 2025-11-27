; (() => {
  const API_URL = "http://localhost:3000/requests"
  let allRequests = []
  let filteredRequests = []
  const currentUserEmail = sessionStorage.getItem("userEmail") || null
  let currentViewedRequestId = null
  let isEditMode = false
  let originalRequestData = null
  let currentDocuments = []
  let pollingInterval = null

  // Helper: fetch with timeout
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(resource, { ...options, signal: controller.signal })
      clearTimeout(id)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (err) {
      clearTimeout(id)
      throw err
    }
  }

  // Ensure DOM elements we need exist (create if not)
  function ensureContainers() {
    let submissionList = document.getElementById("submissionList")
    if (!submissionList) {
      submissionList = document.createElement("div")
      submissionList.id = "submissionList"
      submissionList.className = "submission-cards"
      const filterSection = document.querySelector(".history-filter-section")
      if (filterSection && filterSection.parentNode) {
        filterSection.parentNode.insertBefore(submissionList, filterSection.nextSibling)
      } else {
        document.body.appendChild(submissionList)
      }
    }

    let requestModal = document.getElementById("requestModal")
    if (!requestModal) {
      requestModal = document.createElement("div")
      requestModal.id = "requestModal"
      requestModal.className = "modal"
      requestModal.setAttribute("aria-hidden", "true")
      document.body.appendChild(requestModal)
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const logoRefresh = document.getElementById("logoRefresh")
    if (logoRefresh) {
      logoRefresh.addEventListener("click", () => location.reload())
    }

    ensureContainers()
    attachFilterHandlers()
    await initialize()

    // Start polling for real-time updates
    startPolling()
  })

  // Polling for real-time updates
  function startPolling() {
    // Check for updates every 5 seconds (same as queue)
    pollingInterval = setInterval(async () => {
      try {
        await checkForUpdates()
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 5000) // 5 seconds
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  async function checkForUpdates() {
    try {
      const resp = await fetchWithTimeout(API_URL)
      const data = await resp.json()
      const newAllRequests = Array.isArray(data) ? data : []

      // Check if requests have changed
      const hasChanges = JSON.stringify(newAllRequests) !== JSON.stringify(allRequests)

      if (hasChanges) {
        console.log('Changes detected in requests, updating...')
        allRequests = newAllRequests

        // Reapply filters and update display
        const previousFilteredCount = filteredRequests.length
        const userEmail = sessionStorage.getItem("userEmail") || null

        if (userEmail) {
          filteredRequests = allRequests.filter((r) => (r.email || "").toLowerCase() === userEmail.toLowerCase())
          filteredRequests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

          // Only show notification if the filtered data actually changed
          if (filteredRequests.length !== previousFilteredCount ||
            JSON.stringify(filteredRequests) !== JSON.stringify(previousFilteredRequests)) {
            showUpdateNotification()
            renderCards(filteredRequests)
          }
        }
      }
    } catch (err) {
      console.error("Polling update error:", err)
    }
  }

  function showUpdateNotification() {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.update-notification')
    if (existingNotification) {
      existingNotification.remove()
    }

    const notification = document.createElement('div')
    notification.className = 'update-notification'
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3d2ee7;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    `

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>🔄 Requests updated</span>
        <button style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
      </div>
    `

    // Add click handler for close button
    notification.querySelector('button').addEventListener('click', () => {
      notification.remove()
    })

    document.body.appendChild(notification)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove()
      }
    }, 5000)
  }

  // Add CSS for animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    .update-notification:hover {
      transform: translateY(-2px);
      transition: transform 0.2s ease;
    }
  `
  document.head.appendChild(style)

  async function initialize() {
    const submissionList = document.getElementById("submissionList")

    if (!currentUserEmail) {
      submissionList.innerHTML = `
      <div class="no-data">
        <img src="../images/student_img/history/folder.png" alt="No Data" style="width:120px;margin-bottom:1rem;">
        <p>Please log in to view your print history.</p>
      </div>`
      stopPolling()
      return
    }

    try {
      const resp = await fetchWithTimeout(API_URL)
      const data = await resp.json()
      allRequests = Array.isArray(data) ? data : []
      filteredRequests = allRequests.filter((r) => (r.email || "").toLowerCase() === currentUserEmail.toLowerCase())

      // Sort by most recent by default (newest first)
      filteredRequests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      renderCards(filteredRequests)
    } catch (err) {
      submissionList.innerHTML = `<div class="error-message"><p>Error loading requests: ${err.message}</p></div>`
      console.error("history init error:", err)
      stopPolling()
    }
  }

  // Stop polling when page is not visible to save resources
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopPolling()
    } else {
      startPolling()
    }
  })

  // Calculate total tokens for a request
  function calculateTotalTokens(request) {
    if (request.totalTokens !== undefined) return request.totalTokens

    if (request.documents && Array.isArray(request.documents)) {
      return request.documents.reduce((total, doc) => total + (doc.totalTokens || 0), 0)
    }

    return 0
  }

  // Render request cards into #submissionList
  function renderCards(requests) {
    const submissionList = document.getElementById("submissionList")
    if (!submissionList) return

    if (!requests || requests.length === 0) {
      submissionList.innerHTML = `
      <div class="no-data">
        <img src="../images/student_img/history/folder.png" alt="No Data" style="width:120px;margin-bottom:1rem;">
        <p>No print requests found</p>
      </div>`
      return
    }

    submissionList.innerHTML = ""
    requests.forEach((r) => {
      const createdDate = r.createdAt
        ? new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "-"
      const pickup = r.pickupDateTime ? new Date(r.pickupDateTime).toLocaleString() : "-"
      const docsCount = Array.isArray(r.documents) ? r.documents.length : 0
      const status = r.status || "Pending"

      const card = document.createElement("div")
      card.className = "submission-card"

      card.innerHTML = `
      <div class="submission-details">
        <div class="submission-header">
          <div class="org-info">
            <h3>${r.fullName || "Unknown User"}</h3>
            <span class="academic-info">${createdDate} • ${r.courseYear || "-"}</span>
          </div>
        </div>
        <div class="event-details">
          <h4>Print Request • ${docsCount} document${docsCount !== 1 ? "s" : ""}</h4>
          <div class="event-meta">
            <span class="icon-calendar">Created: ${createdDate}</span>
            <span class="icon-location">Pickup: ${pickup}</span>
            <span class="icon-token">Tokens: ${r.totalTokens ?? calculateTotalTokens(r)}</span>
            <span class="icon-status">Status: ${status}</span>
          </div>
        </div>
        <div class="submission-footer">
          <button class="view-btn" data-id="${r._id}"><span class="icon-eye">View Details</span></button>
        </div>
      </div>
    `
      submissionList.appendChild(card)
    })
  }

  // Attach click handlers for "View Details" buttons + modal behavior
  document.body.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".view-btn")
    if (viewBtn) {
      const id = viewBtn.dataset.id
      const req = filteredRequests.find((x) => x._id === id)
      if (req) openRequestModal(req)
      return
    }

    const modal = document.getElementById("requestModal")
    if (modal && e.target === modal) {
      if (isEditMode) {
        if (confirm("You have unsaved changes. Are you sure you want to close without saving?")) {
          isEditMode = false
          modal.style.display = "none"
        }
      } else {
        modal.style.display = "none"
      }
    }

    if (e.target.matches(".request-modal-close, .request-modal-close *")) {
      const m = document.getElementById("requestModal")
      if (m) {
        if (isEditMode) {
          if (confirm("You have unsaved changes. Are you sure you want to close without saving?")) {
            isEditMode = false
            m.style.display = "none"
          }
        } else {
          m.style.display = "none"
        }
      }
    }

    // Edit Request Button
    const editBtn = e.target.closest(".btn-edit")
    if (editBtn) {
      const id = editBtn.dataset.id
      enableEditMode(id)
      return
    }

    // Save Changes Button
    const saveBtn = e.target.closest(".btn-save")
    if (saveBtn) {
      const id = saveBtn.dataset.id
      saveRequestChanges(id)
      return
    }

    // Delete Request Button
    const deleteBtn = e.target.closest(".btn-delete")
    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm("Are you sure you want to delete this print request?")) {
        deleteRequest(id)
      }
    }
  })

  // Enable edit mode for a request
  function enableEditMode(requestId) {
    isEditMode = true
    const modal = document.getElementById("requestModal")

    // Store original data for cancel functionality
    originalRequestData = JSON.parse(JSON.stringify(currentDocuments))

    // Enable all editable fields
    const editableFields = modal.querySelectorAll('.editable-field')
    editableFields.forEach(field => {
      field.disabled = false
      field.style.backgroundColor = '#fff'
      field.style.borderColor = '#3d2ee7'
    })

    // Show save button, hide edit button
    modal.querySelector('.btn-edit').style.display = 'none'
    modal.querySelector('.btn-save').style.display = 'inline-block'
    modal.querySelector('.btn-delete').style.display = 'none'

    // Update modal header to show editing state
    const modalHeader = modal.querySelector('.modal-header h2')
    modalHeader.innerHTML = `
    <img src="../images/admin_img/write.png" alt="edit" width="24" height="24" class="icon">
    Editing Request • ${modalHeader.textContent.split('•')[1] || ''}
    <span style="font-size: 0.8em; color: #3d2ee7; margin-left: 10px;">(Editing Mode)</span>
  `

    // Scroll to the Request Details section
    const requestDetailsSection = modal.querySelector('.modal-section')
    if (requestDetailsSection) {
      requestDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function deleteRequest(id) {
    try {
      const res = await fetch(`http://localhost:3000/requests/${id}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (res.ok) {
        alert("Print request deleted successfully")
        const modal = document.getElementById("requestModal")
        if (modal) modal.style.display = "none"
        initialize()
      } else {
        alert("Error deleting request: " + result.error)
      }
    } catch (err) {
      alert("⚠️ Error: " + err.message)
    }
  }

  // Build and show the modal for a single request
  function openRequestModal(req) {
    currentViewedRequestId = req._id
    isEditMode = false
    currentDocuments = JSON.parse(JSON.stringify(req.documents || []))
    originalRequestData = JSON.parse(JSON.stringify(currentDocuments))

    const modal = document.getElementById("requestModal")
    const created = req.createdAt
      ? new Date(req.createdAt).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "-"
    const pickup = req.pickupDateTime ? new Date(req.pickupDateTime).toLocaleString() : "-"
    const isPending = (req.status || "").toLowerCase() === "pending"
    const isAcceptedOrCompleted = ["accepted", "completed"].includes((req.status || "").toLowerCase())

    const docsHtml = currentDocuments.map((doc, index) => getDocumentPreview(doc, index)).join("")

    const detailsHtml = isPending
      ? `
      <div class="detail-group">
        <label class="detail-label">Paper Size</label>
        <select class="editable-field" data-field="paperSize" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f5f5f5;">
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="Legal">Legal</option>
        </select>
      </div>
      <div class="detail-group">
        <label class="detail-label">Paper Type</label>
        <select class="editable-field" data-field="paperType" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f5f5f5;">
          <option value="Black & White">Black & White</option>
          <option value="Colored">Colored</option>
        </select>
      </div>
      <div class="detail-group">
        <label class="detail-label">Paper Side</label>
        <select class="editable-field" data-field="paperSide" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f5f5f5;">
          <option value="Single-sided">Single-sided</option>
          <option value="Double-sided">Double-sided</option>
        </select>
      </div>
      <div class="detail-group">
        <label class="detail-label">Number of Copies</label>
        <input type="number" class="editable-field" data-field="copies" min="1" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f5f5f5;" />
      </div>
      <div class="detail-group">
        <label class="detail-label">Pickup Date & Time</label>
        <input type="datetime-local" class="editable-field" data-field="pickupDateTime" disabled style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;background-color:#f5f5f5;" />
      </div>
    `
      : `
      <div class="detail-group">
        <div style="padding:12px;background:#f5f3ff;border-left:4px solid #3d2ee7;border-radius:4px;color:#7c3aed">
          <strong>Request Status: ${req.status || "Pending"}</strong>
          <p style="margin:4px 0 0 0;font-size:0.9rem">This request cannot be revised. Only pending requests can be modified.</p>
        </div>
      </div>
      <div class="detail-group"><label class="detail-label">Pickup</label><div class="detail-input">${pickup}</div></div>
      <div class="detail-group"><label class="detail-label">Total Tokens</label><div class="detail-input">${req.totalTokens ?? calculateTotalTokens(req)}</div></div>
    `

    modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>
          <img src="../images/student_img/history/book.png" alt="icon" width="24" height="24" class="icon">
          ${req.fullName || "Print Request"}
        </h2>
        <button class="modal-close request-modal-close" aria-label="Close">
          <span class="icon-close" aria-hidden="true"></span>
        </button>
        <div class="modal-subheader">
          <img src="../images/student_img/history/calendar_blank.png" alt="calendar" width="16" height="16" class="icon">
          ${created} • ${req.courseYear || ""}
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <h3>
            <div class="section-header">
              <img src="../images/student_img/history/clock.png" alt="clock" width="20" height="20" class="icon">
              Request Details
              <span class="section-status">${req.status || "Pending"}</span>
            </div>
          </h3>

          ${detailsHtml}
          <div class="detail-group"><label class="detail-label">Number of Documents</label><div class="detail-input">${currentDocuments.length}</div></div>
        </div>

        <div class="modal-section documents-section">
          <h3>Documents & Preview</h3>
          <div class="documents-list">
            ${docsHtml || `<div class="detail-input">No documents attached</div>`}
          </div>
        </div>

        <div class="form-actions">
          ${isPending
        ? `
            <button type="button" class="btn btn-primary btn-edit" data-id="${req._id}">
              Edit Request
            </button>
            <button type="button" class="btn btn-primary btn-save" data-id="${req._id}" style="display: none;">
              Save Changes
            </button>
            <button type="button" class="btn btn-delete" data-id="${req._id}">
              Delete Request
            </button>
          `
        : isAcceptedOrCompleted
          ? `
            <!-- No delete button for accepted or completed requests -->
          `
          : `
            <button type="button" class="btn btn-delete" data-id="${req._id}">
              Delete Request
            </button>
          `
      }
          <button type="button" class="btn btn-secondary request-modal-close">
            Close
          </button>
        </div>
      </div>
    </div>
  `

    // Set editable field values if pending
    if (isPending && currentDocuments.length > 0) {
      const firstDoc = currentDocuments[0]
      const paperSizeSelect = modal.querySelector('select[data-field="paperSize"]')
      const paperTypeSelect = modal.querySelector('select[data-field="paperType"]')
      const paperSideSelect = modal.querySelector('select[data-field="paperSide"]')
      const copiesInput = modal.querySelector('input[data-field="copies"]')
      const pickupInput = modal.querySelector('input[data-field="pickupDateTime"]')

      if (paperSizeSelect) paperSizeSelect.value = firstDoc.paperSize || "A4"
      if (paperTypeSelect) paperTypeSelect.value = firstDoc.paperType || "Black & White"
      if (paperSideSelect) paperSideSelect.value = firstDoc.paperSide || "Single-sided"
      if (copiesInput) copiesInput.value = firstDoc.numberOfCopies || 1
      if (pickupInput && req.pickupDateTime) {
        pickupInput.value = new Date(req.pickupDateTime).toISOString().slice(0, 16)
      }
    }

    modal.style.display = "flex"
  }

  function getDocumentPreview(doc, index) {
    const filename = doc.documentTitle || (doc.filePath ? doc.filePath.split("/").pop() : "Document")
    const ext = filename.split(".").pop().toLowerCase()
    const link = doc.filePath ? `${doc.filePath}` : "#"

    if (["pdf", "jpg", "jpeg", "png", "gif"].includes(ext)) {
      return `
        <div class="doc-preview-container" style="display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;background:#fafafa">
          <div style="flex-shrink:0;max-height:400px;overflow:auto;border:1px solid #ddd;border-radius:4px;background:white">
            ${ext === "pdf"
          ? `<iframe src="${link}" style="width:100%;height:400px;border:none;border-radius:4px"></iframe>`
          : `<img src="${link}" alt="${filename}" style="width:100%;height:auto;max-height:400px;object-fit:contain;border-radius:4px" onerror="this.src='../images/student_img/history/file_empty.png'" />`
        }
          </div>
          <div>
            <div class="doc-name" style="font-weight:600;color:#1e1362;margin-bottom:4px">${filename}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Pages: ${doc.pageCount ?? "-"} • Copies: ${doc.numberOfCopies ?? "-"} • Tokens/page: ${doc.tokensPerPage ?? "-"}</div>
            <a href="${link}" target="_blank" style="display:inline-block;color:#3d2ee7;text-decoration:none;font-size:0.9rem;font-weight:500">View Full Size ↗</a>
          </div>
          <div style="font-weight:600;color:#1e1362;text-align:right">${doc.totalTokens ?? 0} tokens</div>
        </div>
      `
    } else {
      return `
        <div class="doc-item" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;background:#fafafa">
          <img src="../images/student_img/history/file_empty.png" alt="Doc" width="64" height="64" style="flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div class="doc-name" style="font-weight:600;color:#1e1362;margin-bottom:4px">${filename}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Pages: ${doc.pageCount ?? "-"} • Copies: ${doc.numberOfCopies ?? "-"} • Tokens/page: ${doc.tokensPerPage ?? "-"}</div>
            <a href="${link}" target="_blank" style="display:inline-block;color:#3d2ee7;text-decoration:none;font-size:0.9rem;font-weight:500">Download ↗</a>
          </div>
          <div style="font-weight:600;color:#1e1362;text-align:right">${doc.totalTokens ?? 0} tokens</div>
        </div>
      `
    }
  }

  async function saveRequestChanges(id) {
    try {
      const modal = document.getElementById("requestModal")
      const paperSize = modal.querySelector('select[data-field="paperSize"]')?.value
      const paperType = modal.querySelector('select[data-field="paperType"]')?.value
      const paperSide = modal.querySelector('select[data-field="paperSide"]')?.value
      const copies = modal.querySelector('input[data-field="copies"]')?.value
      const pickupDateTime = modal.querySelector('input[data-field="pickupDateTime"]')?.value

      const updates = {
        pickupDateTime,
        documents: currentDocuments
      }

      if (paperSize) updates.paperSize = paperSize
      if (paperType) updates.paperType = paperType
      if (paperSide) updates.paperSide = paperSide
      if (copies) updates.copies = Number.parseInt(copies)

      console.log("Saving updates:", updates)

      const res = await fetch(`http://localhost:3000/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const result = await res.json()
      console.log("Server response:", result)

      if (res.ok) {
        alert("Print request updated successfully")
        isEditMode = false
        const modal = document.getElementById("requestModal")
        if (modal) modal.style.display = "none"
        initialize()
      } else {
        alert("Error updating request: " + result.error)
      }
    } catch (err) {
      alert("Error: " + err.message)
    }
  }

  // Filters: status buttons + academic year/semester
  function attachFilterHandlers() {
    const filterContainer = document.querySelector(".filter-buttons")
    if (filterContainer) {
      filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter-btn")
        if (!btn) return
        Array.from(filterContainer.querySelectorAll(".filter-btn")).forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        applyFilters()
      })
    }

    const yearSelect = document.getElementById("academicYearFilter")
    const semesterSelect = document.getElementById("semesterFilter")

    if (yearSelect) yearSelect.addEventListener("change", () => applyFilters())
    if (semesterSelect) semesterSelect.addEventListener("change", () => applyFilters())
  }

  // Apply all filters
  function applyFilters() {
    if (!allRequests) return

    const filterContainer = document.querySelector(".filter-buttons")
    let selectedStatus = "All"
    if (filterContainer) {
      const active = filterContainer.querySelector(".filter-btn.active")
      if (active) selectedStatus = active.textContent.trim()
    }

    const yearSelect = document.getElementById("academicYearFilter")
    const semesterSelect = document.getElementById("semesterFilter")
    const selectedYear = yearSelect ? yearSelect.value : ""
    const selectedSemester = semesterSelect ? semesterSelect.value : ""

    const userRequests = allRequests.filter(
      (r) => (r.email || "").toLowerCase() === (currentUserEmail || "").toLowerCase(),
    )
    let result = userRequests.slice()

    // Status filter
    if (selectedStatus === "Completed") result = result.filter((r) => (r.status || "").toLowerCase() === "completed")
    else if (selectedStatus === "Pending") result = result.filter((r) => (r.status || "").toLowerCase() === "pending")
    else if (selectedStatus === "Cancelled")
      result = result.filter(
        (r) => (r.status || "").toLowerCase() === "rejected" || (r.status || "").toLowerCase() === "cancelled",
      )

    if (selectedYear) {
      result = result.filter((r) => {
        if (!r.createdAt) return false
        const created = new Date(r.createdAt)
        const [startYear, endYear] = selectedYear.split("-").map(Number)
        const isInYear = created.getFullYear() === startYear || created.getFullYear() === endYear
        return isInYear
      })
    }

    if (selectedSemester) {
      result = result.filter((r) => {
        if (!r.createdAt) return false
        const created = new Date(r.createdAt)
        const month = created.getMonth()

        if (selectedSemester === "1") {
          return month >= 7 || month < 12 // Aug-Dec
        } else if (selectedSemester === "2") {
          return month >= 0 && month < 5 // Jan-May
        } else if (selectedSemester === "short") {
          return month >= 5 && month < 7 // Jun-Jul
        }
        return true
      })
    }

    // Sort by most recent (newest first) after filtering
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    filteredRequests = result
    renderCards(filteredRequests)
  }
})()