;(() => {
  const API_URL = "http://localhost:3000/requests"
  let allRequests = []
  let filteredRequests = []
  let previousFilteredRequests = []
  const currentUserEmail = sessionStorage.getItem("userEmail") || null
  let currentViewedRequestId = null
  let isEditMode = false
  let originalRequestData = null
  let currentDocuments = []
  let pollingInterval = null

  // ======= Helpers =======
  function parseDateTimeLocal(s) {
    if (!s) return null
    // contains timezone (Z or +hh:mm or -hh:mm)
    if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s)
    // match YYYY-MM-DDTHH:mm(:ss)?
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      return new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] || 0)
      )
    }
    return new Date(s)
  }

  // Format for human-friendly display (date + time)
  function formatDisplayDate(value, options) {
    const d = typeof value === 'string' ? parseDateTimeLocal(value) : value
    if (!d || Number.isNaN(d.getTime())) return '-'
    const opts = options || { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }
    return d.toLocaleString('en-PH', opts)
  }

  // For <input type="datetime-local"> value (YYYY-MM-DDTHH:mm)
  function toInputDatetimeLocal(value) {
    const d = typeof value === 'string' ? parseDateTimeLocal(value) : value
    if (!d || Number.isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // ======= Fetch with timeout =======
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

  // ======= DOM assurances =======
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

    ensureFilters()
  }

  // If filter UI not present, create a compact one. If your page already has them, this won't duplicate.
  function ensureFilters() {
    // container for filters
    let filterWrapper = document.querySelector(".history-filter-section")
    if (!filterWrapper) {
      filterWrapper = document.createElement("div")
      filterWrapper.className = "history-filter-section"
      filterWrapper.style.cssText = "display:flex;gap:12px;align-items:center;padding:12px;"
      // try to insert above submissionList
      const submissionList = document.getElementById("submissionList")
      if (submissionList) submissionList.parentNode.insertBefore(filterWrapper, submissionList)
      else document.body.insertBefore(filterWrapper, document.body.firstChild)
    }

    // Status buttons container
    if (!filterWrapper.querySelector(".filter-buttons")) {
      const fb = document.createElement("div")
      fb.className = "filter-buttons"
      fb.style.cssText = "display:flex;gap:8px;align-items:center"
      fb.innerHTML = `
        <button class="filter-btn active">All</button>
        <button class="filter-btn">Pending</button>
        <button class="filter-btn">Completed</button>
        <button class="filter-btn">Cancelled</button>
      `
      filterWrapper.appendChild(fb)
    }

    // Semester select
    if (!filterWrapper.querySelector("#semesterFilter")) {
      const semWrap = document.createElement("div")
      semWrap.style.cssText = "display:flex;flex-direction:column"
      semWrap.innerHTML = `
        <label style="font-size:12px;color:#333;margin-bottom:4px">Semester</label>
        <select id="semesterFilter" style="padding:6px;border-radius:6px">
          <option value="">All Semesters</option>
          <option value="1st Semester">1st Semester</option>
          <option value="2nd Semester">2nd Semester</option>
          <option value="Short Term">Short Term</option>
        </select>
      `
      filterWrapper.appendChild(semWrap)
    }

    // Academic year select 
    if (!filterWrapper.querySelector("#academicYearFilter")) {
      const ayWrap = document.createElement("div")
      ayWrap.style.cssText = "display:flex;flex-direction:column"
      ayWrap.innerHTML = `
        <label style="font-size:12px;color:#333;margin-bottom:4px">Academic Year</label>
        <select id="academicYearFilter" style="padding:6px;border-radius:6px">
          <option value="">All Years</option>
        </select>
      `
      filterWrapper.appendChild(ayWrap)
    }
  }
  
  function getCurrentSemesterAndAcademicYear() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  let semesterLabel, academicYear

  if (month >= 8 && month <= 12) {
    semesterLabel = "1st Semester"
    academicYear = `AY ${year}-${year + 1}`
  } else if (month >= 1 && month <= 5) {
    semesterLabel = "2nd Semester"
    academicYear = `AY ${year - 1}-${year}`
  } else {
    // June - July
    semesterLabel = "Short Term"
    academicYear = `AY ${year - 1}-${year}`
  }

  return { semesterLabel, academicYear }
}

  // Auto-populate AY list using available requests' academicYear fields
  function populateAcademicYearFilter() {
    const select = document.getElementById("academicYearFilter")
    if (!select) return
    const yearsSet = new Set()
    allRequests.forEach(r => {
      if (r.academicYear) yearsSet.add(r.academicYear)
    })
    // Clear (keep the default "All Years")
    const selected = select.value || ""
    select.innerHTML = `<option value="">All Years</option>`
    Array.from(yearsSet).sort().forEach(ay => {
      const opt = document.createElement("option")
      opt.value = ay
      opt.textContent = ay
      select.appendChild(opt)
    })
    // restore previous selection if still available
    if (selected && Array.from(yearsSet).includes(selected)) select.value = selected
  }

  // ======= Polling =======
  function startPolling() {
    if (pollingInterval) return
    pollingInterval = setInterval(async () => {
      try {
        await checkForUpdates()
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 5000)
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

      const hasChanges = JSON.stringify(newAllRequests) !== JSON.stringify(allRequests)
      if (!hasChanges) return

      allRequests = newAllRequests
      populateAcademicYearFilter()

      // Reapply filters and update display
      const userEmail = sessionStorage.getItem("userEmail") || null
      if (userEmail) {
        applyFilters() // applyFilters will call renderCards
        // show update notification only if filtered list actually changed
        if (JSON.stringify(filteredRequests) !== JSON.stringify(previousFilteredRequests)) {
          showUpdateNotification()
        }
      }
    } catch (err) {
      console.error("Polling update error:", err)
    }
  }

  // ======= Initialization =======
  document.addEventListener("DOMContentLoaded", async () => {
    const logoRefresh = document.getElementById("logoRefresh")
    if (logoRefresh) logoRefresh.addEventListener("click", () => location.reload())

    ensureContainers()
    attachFilterHandlers()
    await initialize()
    startPolling()
  })

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
    populateAcademicYearFilter()
    const { semesterLabel, academicYear } = getCurrentSemesterAndAcademicYear()

    const semSelect = document.getElementById("semesterFilter")
    const aySelect = document.getElementById("academicYearFilter")

    if (semSelect) {
      semSelect.value = semesterLabel
    }

    if (aySelect) {
      const hasOption = Array.from(aySelect.options).some(o => o.value === academicYear)
      if (!hasOption) {
        const opt = document.createElement("option")
        opt.value = academicYear
        opt.textContent = academicYear
        aySelect.appendChild(opt)
      }
      aySelect.value = academicYear
    }

    // set "Pending" as active status button
    const filterContainer = document.querySelector(".filter-buttons")
    if (filterContainer) {
      Array.from(filterContainer.querySelectorAll(".filter-btn")).forEach((b) => b.classList.remove("active"))
      const pendingBtn = Array.from(filterContainer.querySelectorAll(".filter-btn"))
        .find(b => b.textContent.trim().toLowerCase() === 'pending')
      if (pendingBtn) pendingBtn.classList.add('active')
    }

    applyFilters()
  } catch (err) {
    submissionList.innerHTML = `<div class="error-message"><p>Error loading requests: ${err.message}</p></div>`
    console.error("history init error:", err)
    stopPolling()
  }
}

  // ======= UI: notification =======
  function showUpdateNotification() {
    const existing = document.querySelector('.update-notification')
    if (existing) existing.remove()
    const notification = document.createElement('div')
    notification.className = 'update-notification'
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #3d2ee7; color:white;
      padding: 12px 20px; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); z-index:10000; cursor:pointer;
    `
    notification.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span>🔄 Requests updated</span><button style="background:none;border:none;color:white;font-size:16px;cursor:pointer">×</button></div>`
    notification.querySelector('button').addEventListener('click', () => notification.remove())
    document.body.appendChild(notification)
    setTimeout(() => { if (notification.parentElement) notification.remove() }, 5000)
  }

  //Render cards 
  function renderCards(requests) {
    const submissionList = document.getElementById("submissionList")
    if (!submissionList) return

    if (!requests || requests.length === 0) {
      submissionList.innerHTML = `
      <div class="no-data">
        <img src="../images/student_img/history/folder.png" alt="No Data" style="width:120px;margin-bottom:1rem;">
        <p>No print requests found</p>
      </div>`
      previousFilteredRequests = []
      return
    }

    submissionList.innerHTML = ""
    requests.forEach((r) => {
      const createdDate = r.createdAt ? formatDisplayDate(r.createdAt, { month: "short", day: "numeric", year: "numeric" }) : "-"
      const pickup = r.pickupDateTime ? formatDisplayDate(r.pickupDateTime) : "-"
      const docsCount = Array.isArray(r.documents) ? r.documents.length : 0
      const status = r.status || "Pending"
      const semesterText = r.semester ? ` • ${r.semester}` : ""
      const ayText = r.academicYear ? ` • ${r.academicYear}` : ""

      const card = document.createElement("div")
      card.className = "submission-card"
      card.innerHTML = `
      <div class="submission-details">
        <div class="submission-header">
          <div class="org-info">
            <h3>${r.fullName || "Unknown User"}</h3>
            <span class="academic-info">${createdDate} • ${r.courseYear || "-"}${semesterText}${ayText}</span>
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
      </div>`
      submissionList.appendChild(card)
    })

    previousFilteredRequests = JSON.parse(JSON.stringify(requests || []))
  }

  // ======= View modal =======
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
        if (confirm("You have unsaved changes. Close without saving?")) {
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
          if (confirm("You have unsaved changes. Close without saving?")) {
            isEditMode = false
            m.style.display = "none"
          }
        } else {
          m.style.display = "none"
        }
      }
    }

    // Edit / Save / Delete handlers (unchanged)
    const editBtn = e.target.closest(".btn-edit")
    if (editBtn) { enableEditMode(editBtn.dataset.id); return }

    const saveBtn = e.target.closest(".btn-save")
    if (saveBtn) { saveRequestChanges(saveBtn.dataset.id); return }

    const deleteBtn = e.target.closest(".btn-delete")
    if (deleteBtn) {
      const id = deleteBtn.dataset.id
      if (confirm("Are you sure you want to delete this print request?")) deleteRequest(id)
    }
  })

  function enableEditMode(requestId) {
    isEditMode = true
    const modal = document.getElementById("requestModal")
    originalRequestData = JSON.parse(JSON.stringify(currentDocuments))
    const editableFields = modal.querySelectorAll('.editable-field')
    editableFields.forEach(field => {
      field.disabled = false
      field.style.backgroundColor = '#fff'
      field.style.borderColor = '#3d2ee7'
    })
    const editBtn = modal.querySelector('.btn-edit')
    const saveBtn = modal.querySelector('.btn-save')
    if (editBtn) editBtn.style.display = 'none'
    if (saveBtn) saveBtn.style.display = 'inline-block'
    const deleteBtn = modal.querySelector('.btn-delete')
    if (deleteBtn) deleteBtn.style.display = 'none'
  }

  async function deleteRequest(id) {
    try {
      const res = await fetch(`http://localhost:3000/requests/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (res.ok) {
        alert("Print request deleted successfully")
        const modal = document.getElementById("requestModal"); if (modal) modal.style.display = "none"
        initialize()
      } else {
        alert("Error deleting request: " + result.error)
      }
    } catch (err) {
      alert("⚠️ Error: " + err.message)
    }
  }

  function openRequestModal(req) {
    currentViewedRequestId = req._id
    isEditMode = false
    currentDocuments = JSON.parse(JSON.stringify(req.documents || []))
    originalRequestData = JSON.parse(JSON.stringify(currentDocuments))
    const modal = document.getElementById("requestModal")
    const created = req.createdAt ? formatDisplayDate(req.createdAt, { month: "long", day: "numeric", year: "numeric" }) : "-"
    const pickup = req.pickupDateTime ? formatDisplayDate(req.pickupDateTime) : "-"
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
          <p style="margin:4px 0 0 0;font-size:0.9rem">This request cannot be revised.</p>
        </div>
      </div>
      <div class="detail-group"><label class="detail-label">Pickup</label><div class="detail-input">${pickup}</div></div>
      <div class="detail-group"><label class="detail-label">Total Tokens</label><div class="detail-input">${req.totalTokens ?? calculateTotalTokens(req)}</div></div>
    `

    modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" style="max-width:900px;margin:40px auto;">
      <div class="modal-header">
        <h2>
          <img src="../images/student_img/history/book.png" alt="icon" width="24" height="24" class="icon">
          ${req.fullName || "Print Request"}
        </h2>
        <button class="modal-close request-modal-close" aria-label="Close">
          <span class="icon-close" aria-hidden="true"></span>
        </button>
        <div class="modal-subheader" style="margin-top:8px;color:#666;">
          <img src="../images/student_img/history/calendar_blank.png" alt="calendar" width="16" height="16" class="icon">
          ${created} • ${req.courseYear || ""}${req.semester ? ` • ${req.semester}` : ""}${req.academicYear ? ` • ${req.academicYear}` : ""}
        </div>
      </div>

      <div class="modal-body" style="padding:16px;">
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

        <div class="form-actions" style="margin-top:12px;display:flex;gap:8px;align-items:center;">
          ${isPending ? `
            <button type="button" class="btn btn-primary btn-edit" data-id="${req._id}">Edit Request</button>
            <button type="button" class="btn btn-primary btn-save" data-id="${req._id}" style="display:none">Save Changes</button>
            <button type="button" class="btn btn-delete" data-id="${req._id}">Delete Request</button>
          ` : isAcceptedOrCompleted ? `` : `<button type="button" class="btn btn-delete" data-id="${req._id}">Delete Request</button>`}
          <button type="button" class="btn btn-secondary request-modal-close">Close</button>
        </div>
      </div>
    </div>
    `

    // set editable field values if pending
    if (isPending && currentDocuments.length > 0) {
      const firstDoc = currentDocuments[0]
      const paperSizeSelect = modal.querySelector('select[data-field="paperSize"]')
      const paperTypeSelect = modal.querySelector('select[data-field="paperType"]')
      const paperSideSelect = modal.querySelector('select[data-field="paperSide"]')
      const copiesInput = modal.querySelector('input[data-field="copies"]')
      const pickupInput = modal.querySelector('input[data-field="pickupDateTime"]')

      if (paperSizeSelect) paperSizeSelect.value = firstDoc.paperSize || "A4"
      if (paperTypeSelect) paperTypeSelect.value = firstDoc.printType || firstDoc.paperType || "Black & White"
      if (paperSideSelect) {
        const candidate = firstDoc.printingSide || firstDoc.paperSide || firstDoc.paper_side
        if (candidate) paperSideSelect.value = candidate
      }
      if (copiesInput) copiesInput.value = firstDoc.numberOfCopies || 1
      if (pickupInput && req.pickupDateTime) {
        pickupInput.value = toInputDatetimeLocal(req.pickupDateTime)
      }
    }

    modal.style.display = "flex"
    modal.style.alignItems = "flex-start"
    modal.style.justifyContent = "center"
  }

  function getDocumentPreview(doc) {
    const filename = doc.documentTitle || (doc.filePath ? doc.filePath.split("/").pop() : "Document")
    const ext = filename.split(".").pop().toLowerCase()
    const link = doc.filePath ? `${doc.filePath}` : "#"
    if (["pdf", "jpg", "jpeg", "png", "gif"].includes(ext)) {
      return `
        <div class="doc-preview-container" style="display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;background:#fafafa">
          <div style="flex-shrink:0;max-height:400px;overflow:auto;border:1px solid #ddd;border-radius:4px;background:white">
            ${ext === "pdf" ? `<iframe src="${link}" style="width:100%;height:400px;border:none;border-radius:4px"></iframe>` : `<img src="${link}" alt="${filename}" style="width:100%;height:auto;max-height:400px;object-fit:contain;border-radius:4px" onerror="this.src='../images/student_img/history/file_empty.png'"/>`}
          </div>
          <div>
            <div class="doc-name" style="font-weight:600;color:#1e1362;margin-bottom:4px">${filename}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Pages: ${doc.pageCount ?? "-"} • Copies: ${doc.numberOfCopies ?? "-"} • Tokens/page: ${doc.tokensPerPage ?? "-"}</div>
            <a href="${link}" target="_blank" style="display:inline-block;color:#3d2ee7;text-decoration:none;font-size:0.9rem;font-weight:500">View Full Size ↗</a>
          </div>
          <div style="font-weight:600;color:#1e1362;text-align:right">${doc.totalTokens ?? 0} tokens</div>
        </div>`
    }
    return `
      <div class="doc-item" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;background:#fafafa">
        <img src="../images/student_img/history/file_empty.png" alt="Doc" width="64" height="64" style="flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div class="doc-name" style="font-weight:600;color:#1e1362;margin-bottom:4px">${filename}</div>
          <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Pages: ${doc.pageCount ?? "-"} • Copies: ${doc.numberOfCopies ?? "-"} • Tokens/page: ${doc.tokensPerPage ?? "-"}</div>
          <a href="${link}" target="_blank" style="display:inline-block;color:#3d2ee7;text-decoration:none;font-size:0.9rem;font-weight:500">Download ↗</a>
        </div>
        <div style="font-weight:600;color:#1e1362;text-align:right">${doc.totalTokens ?? 0} tokens</div>
      </div>`
  }

  async function saveRequestChanges(id) {
    try {
      const modal = document.getElementById("requestModal")
      const paperSize = modal.querySelector('select[data-field="paperSize"]')?.value
      const paperType = modal.querySelector('select[data-field="paperType"]')?.value
      const paperSide = modal.querySelector('select[data-field="paperSide"]')?.value
      const copies = modal.querySelector('input[data-field="copies"]')?.value
      const pickupDateTime = modal.querySelector('input[data-field="pickupDateTime"]')?.value

      const updates = { pickupDateTime, documents: currentDocuments }
      if (paperSize) updates.paperSize = paperSize
      if (paperType) updates.paperType = paperType
      if (paperSide) updates.paperSide = paperSide
      if (copies) updates.copies = Number.parseInt(copies)

      const res = await fetch(`http://localhost:3000/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const result = await res.json()
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

  // ======= Filters setup & logic =======
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

    const userRequests = allRequests.filter((r) => (r.email || "").toLowerCase() === (currentUserEmail || "").toLowerCase())
    let result = userRequests.slice()

    // Status filter
    if (selectedStatus === "Completed") result = result.filter((r) => (r.status || "").toLowerCase() === "completed")
    else if (selectedStatus === "Pending") result = result.filter((r) => (r.status || "").toLowerCase() === "pending")
    else if (selectedStatus === "Cancelled") result = result.filter((r) => {
      const s = (r.status || "").toLowerCase()
      return s === "rejected" || s === "cancelled"
    })

    // Academic year filter
    if (selectedYear) {
      result = result.filter((r) => (r.academicYear || "") === selectedYear)
    }

    // Semester filter
    if (selectedSemester) {
  result = result.filter((r) => ((r.semester || "").trim().toLowerCase() === selectedSemester.trim().toLowerCase()))
}

    // Sort & render
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    filteredRequests = result
    renderCards(filteredRequests)
  }

  // ======= utility: token calculation =======
  function calculateTotalTokens(request) {
    if (request.totalTokens !== undefined) return request.totalTokens
    if (request.documents && Array.isArray(request.documents)) {
      return request.documents.reduce((total, doc) => total + (doc.totalTokens || 0), 0)
    }
    return 0
  }

  // Stop/start polling on visibility
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopPolling()
    else startPolling()
  })
})()
