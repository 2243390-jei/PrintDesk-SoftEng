document.addEventListener("DOMContentLoaded", () => {
  
  /* =========================
     DOM refs
     ========================= */
  const form = document.getElementById("printRequestForm")
  const printJobs = document.getElementById("printJobs")
  const addPrintJobBtn = document.getElementById("addPrintJob")
  const logoRefresh = document.getElementById("logoRefresh")
  const pickupDateTime = document.getElementById("pickupDateTime")
  const confirmationModal = document.getElementById("confirmationModal")
  const filePreviewModal = document.getElementById("filePreviewModal")
  const successModal = document.getElementById("successModal")
  const cancelSubmissionBtn = document.getElementById("cancelSubmission")
  const confirmSubmissionBtn = document.getElementById("confirmSubmission")
  const filePreviewContent = document.getElementById("filePreviewContent")
  const customResetBtn = document.getElementById("customResetBtn")
  const confirmCheckbox = document.getElementById("confirmCheckbox")
  const successHomeBtn = document.getElementById("successHomeBtn")
  const successDetails = document.getElementById("successDetails")
  const successNewSubmissionBtn = document.getElementById("successNewSubmissionBtn")
  const semesterInput = document.getElementById("semesterInput")
  const academicYearInput = document.getElementById("academicYearInput")


  /* =========================
     State + constants
     ========================= */
  let jobCount = 1
  const currentUserEmail = sessionStorage.getItem("userEmail")
  const pdfjsLib = window["pdfjs-dist/build/pdf"]

  const FORM_STATE_KEY = "printFormState_v1"
  const LAST_SUCCESS_KEY = "lastPrintSuccess_v1"

  // File type mappings for better icons and handling
  const FILE_TYPES = {
    pdf: { icon: '📄', label: 'PDF Document', preview: 'embed' },
    image: { icon: '🖼️', label: 'Image', preview: 'image' },
    word: { icon: '📝', label: 'Word Document', preview: 'icon' },
    text: { icon: '📄', label: 'Text File', preview: 'text' },
    default: { icon: '📎', label: 'File', preview: 'icon' }
  }

  // Allowed types 
  const ALLOWED_MIMES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    // Word MIME types (may vary by platform)
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg','.doc', '.docx']
  

  /* =========================
     Error Modal (dynamic)
     ========================= */
  function ensureErrorModalExists() {
    if (document.getElementById('errorModal')) return
    const html = `
      <div id="errorModal" class="modal" style="display:none; z-index: 9999;">
        <div class="modal-content" style="max-width:520px; margin: 80px auto; padding: 20px; position: relative;">
          <span class="close-error-modal" style="position:absolute; right:12px; top:8px; cursor:pointer; font-size:20px;">&times;</span>
          <h3 style="margin-top:0;">Invalid File / Selection</h3>
          <div id="errorModalMessage" style="color:#b00020; margin: 12px 0;"></div>
          <div style="text-align:right; margin-top:16px;">
            <button id="errorModalOkBtn" class="reset-btn" style="padding:8px 14px;">OK</button>
          </div>
        </div>
      </div>
    `
    document.body.insertAdjacentHTML('beforeend', html)
    const modal = document.getElementById('errorModal')
    const okBtn = document.getElementById('errorModalOkBtn')
    const closeX = modal.querySelector('.close-error-modal')

    function hideErrorModal() {
      modal.style.display = 'none'
      document.body.classList.remove('modal-open')
    }

    okBtn.addEventListener('click', hideErrorModal)
    closeX.addEventListener('click', hideErrorModal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideErrorModal()
    })
  }

  function showErrorModal(message) {
    ensureErrorModalExists()
    const modal = document.getElementById('errorModal')
    const msg = document.getElementById('errorModalMessage')
    msg.textContent = message
    modal.style.display = 'block'
    document.body.classList.add('modal-open')
  }

  /* =========================
     Helpers: file validation
     ========================= */
  function getExtension(name) {
    const idx = name.lastIndexOf('.')
    return idx >= 0 ? name.substring(idx).toLowerCase() : ''
  }

  function isValidFile(file) {
    if (!file) return false
    const ext = getExtension(file.name)
    // check mime OR extension (some files have empty/incorrect mime)
    if (file.type && ALLOWED_MIMES.includes(file.type)) return true
    if (ALLOWED_EXTS.includes(ext)) return true
    return false
  }

  /* =========================
     Modal Functions
     ========================= */
  function closeAllModals() {
    if (confirmationModal) confirmationModal.style.display = "none"
    if (filePreviewModal) filePreviewModal.style.display = "none"
    const errorModal = document.getElementById('errorModal')
    if (errorModal) errorModal.style.display = 'none'
    document.body.classList.remove("modal-open")
  }

  function closeSuccessModal() {
    if (successModal) successModal.style.display = "none"
    document.body.classList.remove("modal-open")
  }

  // Modal close buttons
  const closeModalButtons = document.querySelectorAll(".close-modal, .profile-modal-close")
  closeModalButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      const modal = e.target.closest('.modal, .profile-modal')
      if (modal && modal.id !== 'successModal') {
        closeAllModals()
      }
    })
  })

  if (cancelSubmissionBtn) cancelSubmissionBtn.addEventListener("click", closeAllModals)

  if (successHomeBtn) successHomeBtn.addEventListener("click", () => {
    clearStoredSuccess()
    closeSuccessModal()
    location.href = "home.html"
  })

  window.addEventListener("click", (e) => {
    if (e.target === confirmationModal || e.target === filePreviewModal) {
      closeAllModals()
    }
  })

  if (successNewSubmissionBtn) successNewSubmissionBtn.addEventListener("click", () => {
    clearStoredSuccess()
    closeSuccessModal()
  })

  /* =========================
     Form State Management 
     ========================= */
  function collectFormState() {
    const state = {
      meta: {
        fullName: document.getElementById("fullNameInput")?.value || "",
        email: document.getElementById("emailInput")?.value || "",
        course: document.getElementById("courseInput")?.value || "",
        year: document.getElementById("yearSelect")?.value || "",
        pickupDateTime: document.getElementById("pickupDateTime")?.value || "",
        semester: document.getElementById("semesterInput")?.value || "",
        academicYear: document.getElementById("academicYearInput")?.value || "",
      },
      jobs: []
    }

    document.querySelectorAll(".print-job").forEach((job, i) => {
      const jobId = i + 1
      const copies = job.querySelector(`input[name="copies_${jobId}"]`)?.value || 1
      const paperSize = job.querySelector(`select[name^="paper_size_"]`)?.value || ""
      const paperSide = job.querySelector(`select[name^="paper_side_"]`)?.value || ""
      const paperType = job.querySelector(`select[name^="paper_type_"]`)?.value || ""
      const notes = job.querySelector(`textarea[name^="notes_"]`)?.value || ""
      const pageCount = Number.parseInt(job.querySelector(".page-count span")?.textContent) || 0
      const fileInput = job.querySelector(".drop-zone-input")
      const fileMeta = fileInput && fileInput.files && fileInput.files[0]
        ? { name: fileInput.files[0].name, type: fileInput.files[0].type }
        : null

      state.jobs.push({
        copies, paperSize, paperSide, paperType, notes, pageCount, fileMeta
      })
    })

    return state
  }

  function saveFormState() {
    try {
      const state = collectFormState()
      localStorage.setItem(FORM_STATE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn("Failed to save form state:", e)
    }
  }

  function resetJobsAfterSubmit() {
    const currentName = document.getElementById("fullNameInput")?.value || ""
    const currentEmail = document.getElementById("emailInput")?.value || ""
    const currentCourse = document.getElementById("courseInput")?.value || ""
    const currentYear = document.getElementById("yearSelect")?.value || ""

    const allJobs = Array.from(document.querySelectorAll(".print-job"))
    allJobs.slice(1).forEach(j => j.remove())

    const firstJob = document.querySelector(".print-job")
    if (firstJob) {
      try {
        firstJob.querySelector(`input[name^="copies_"]`).value = 1
        firstJob.querySelector(`select[name^="paper_size_"]`).value = ""
        firstJob.querySelector(`select[name^="paper_side_"]`).value = ""
        firstJob.querySelector(`select[name^="paper_type_"]`).value = ""
        firstJob.querySelector(`textarea[name^="notes_"]`).value = ""

        const dropZone = firstJob.querySelector(".drop-zone")
        if (dropZone) {
          const oldInput = dropZone.querySelector(".drop-zone-input")
          if (oldInput) {
            const newInput = document.createElement("input")
            newInput.type = "file"
            newInput.name = "documents"
            newInput.className = "drop-zone-input"
            newInput.required = true
            newInput.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx"
            oldInput.replaceWith(newInput)
            initializeDropZone(dropZone)
          }
        }

        const filePreview = firstJob.querySelector(".file-preview")
        if (filePreview) {
          filePreview.style.display = "none"
          filePreview.innerHTML = ""
        }
        const pageCountSpan = firstJob.querySelector(".page-count span")
        if (pageCountSpan) pageCountSpan.textContent = "0"
      } catch (e) {
        console.warn("Failed to reset first job", e)
      }
    }

    jobCount = 1
    document.querySelectorAll(".token-cost").forEach(el => el.remove())
    const totalDisplay = document.getElementById("totalTokens")
    if (totalDisplay) totalDisplay.remove()
    const remainingDisplay = document.getElementById("remainingTokens")
    if (remainingDisplay) remainingDisplay.remove()

    const confirmCheckboxEl = document.getElementById("confirmCheckbox")
    if (confirmCheckboxEl) confirmCheckboxEl.checked = false

    localStorage.removeItem(FORM_STATE_KEY)

    const fullNameInput = document.getElementById("fullNameInput")
    const emailInput = document.getElementById("emailInput")
    const courseInput = document.getElementById("courseInput")
    const yearSelect = document.getElementById("yearSelect")
    if (fullNameInput) { fullNameInput.value = currentName; }
    if (emailInput) { emailInput.value = currentEmail; emailInput.readOnly = true }
    if (yearSelect) { yearSelect.value = currentYear }
    if (courseInput) { courseInput.value = currentCourse }
    setSemesterAndAcademicYear()
  }

  function restoreFormState() {
    const raw = localStorage.getItem(FORM_STATE_KEY)
    if (!raw) return
    try {
      const state = JSON.parse(raw)
      const m = state.meta || {}

      if (m.fullName) document.getElementById("fullNameInput").value = m.fullName
      if (m.email) document.getElementById("emailInput").value = m.email
      if (m.course) document.getElementById("courseInput").value = m.course
      if (m.year) document.getElementById("yearSelect").value = m.year
      if (m.pickupDateTime) document.getElementById("pickupDateTime").value = m.pickupDateTime
      if (m.semester && semesterInput) semesterInput.value = m.semester
      if (m.academicYear && academicYearInput) academicYearInput.value = m.academicYear

      const savedJobs = state.jobs || []
      const existing = Array.from(document.querySelectorAll(".print-job"))
      existing.slice(1).forEach(n => n.remove())
      jobCount = 1

      savedJobs.forEach((j, idx) => {
        if (idx === 0) {
          const firstJob = document.querySelector(".print-job")
          if (firstJob) {
            populateJobFields(firstJob, j, 1)
          }
        } else {
          addPrintJobProgrammatic()
          const newJob = printJobs.querySelector(`.print-job[data-job-id="${idx+1}"]`)
          if (newJob) populateJobFields(newJob, j, idx+1)
        }
      })

      document.querySelectorAll(".print-job").forEach(job => {
        calculateTokens(job)
      })
    } catch (e) {
      console.warn("Failed to restore form state:", e)
    }
  }

  function populateJobFields(jobElement, jobData, jobId) {
    try {
      if (jobData.copies !== undefined) jobElement.querySelector(`input[name^="copies_"]`).value = jobData.copies
      if (jobData.paperSize !== undefined) {
        const sel = jobElement.querySelector(`select[name^="paper_size_"]`)
        if (sel) sel.value = jobData.paperSize
      }
      if (jobData.paperSide !== undefined) {
        const sel = jobElement.querySelector(`select[name^="paper_side_"]`)
        if (sel) sel.value = jobData.paperSide
      }
      if (jobData.paperType !== undefined) {
        const sel = jobElement.querySelector(`select[name^="paper_type_"]`)
        if (sel) sel.value = jobData.paperType
      }
      if (jobData.notes !== undefined) jobElement.querySelector(`textarea[name^="notes_"]`).value = jobData.notes || ""
      if (jobData.pageCount !== undefined) jobElement.querySelector(".page-count span").textContent = jobData.pageCount

      const preview = jobElement.querySelector(".file-preview")
      if (jobData.fileMeta && preview) {
        preview.style.display = "block"
        preview.innerHTML = `
          <div style="padding:8px;color:#444;">
            <strong>${jobData.fileMeta.name}</strong>
            <div style="font-size:12px;color:#666">(File not reattached — please reselect file before submitting)</div>
          </div>
        `
      }
    } catch (e) {
      console.warn("populateJobFields error", e)
    }
  }

  /* =========================
     Success Modal Functions
     ========================= */
  function storeSuccess(result, sentMeta) {
    const data = {
      requestId: result.requestId || null,
      totalTokens: result.totalTokens || null,
      remainingTokens: result.remainingTokens || null,
      queuePosition: result.queuePosition ?? null,
      status: result.status || "Submitted",
      fullName: sentMeta.fullName || "",
      courseYear: sentMeta.courseYear || "",
      time: new Date().toISOString()
    }
    localStorage.setItem(LAST_SUCCESS_KEY, JSON.stringify(data))
  }

  function showStoredSuccessIfAny() {
    const raw = localStorage.getItem(LAST_SUCCESS_KEY)
    if (!raw) return
    try {
      const s = JSON.parse(raw)

      // Lookup DOM elements at runtime to avoid stale references
      let detailsEl = document.getElementById('successDetails')
      let modalEl = document.getElementById('successModal')

      const populateAndShow = () => {
        detailsEl.innerHTML = `
          <p><strong>Request ID:</strong> ${s.requestId || "-"}</p>
          <p><strong>Full Name:</strong> ${s.fullName || "-"}</p>
          <p><strong>Course Year:</strong> ${s.courseYear || "-"}</p>
          <p><strong>Total Tokens Used:</strong> ${s.totalTokens ?? "-"}</p>
          <p><strong>Remaining Tokens:</strong> ${s.remainingTokens ?? "-"}</p>
          <p><strong>Your Queue Position:</strong> ${s.queuePosition ?? "-"}</p>
          <p><strong>Status:</strong> ${s.status}</p>
          <p style="font-size:12px;color:#666">Submitted at: ${new Date(s.time).toLocaleString()}</p>
        `
        modalEl.style.display = 'block'
        document.body.classList.add('modal-open')
      }
console.log('showStoredSuccessIfAny called');
console.log('Raw localStorage data:', raw);
console.log('Found successDetails element:', !!detailsEl);
console.log('Found successModal element:', !!modalEl);
      if (!detailsEl || !modalEl) {
        // If the elements aren't present yet (intermittent race), retry a few times
        let tries = 0
        const maxTries = 6
        const retry = () => {
          tries++
          const d = document.getElementById('successDetails')
          const m = document.getElementById('successModal')
          if (d && m) {
            detailsEl = d
            modalEl = m
            populateAndShow()
            return
          }
          if (tries < maxTries) setTimeout(retry, 150)
          else console.error('showStoredSuccessIfAny: could not find success modal elements after retries')
        }
        retry()
      } else {
        populateAndShow()
      }
    } catch (e) {
      console.warn('showStoredSuccessIfAny error', e)
    }
  }

  function clearStoredSuccess() {
    localStorage.removeItem(LAST_SUCCESS_KEY)
  }

  /* =========================
     Print Job Functions
     ========================= */
  function addPrintJobProgrammatic() {
    jobCount++
    const newJob = document.createElement("div")
    newJob.className = "print-job"
    newJob.dataset.jobId = jobCount
    newJob.innerHTML = `
      <div class="print-job-header">
        <h5>Print Job #${jobCount}</h5>
        <button type="button" class="remove-job-btn">&times;</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Number of Copies:</label>
          <input type="number" name="copies_${jobCount}" value="1" min="1" required />
        </div>

        <div class="form-group">
          <label>Paper Size:</label>
          <select name="paper_size_${jobCount}" required>
            <option value="" disabled selected>Select paper size</option>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Paper Side:</label>
          <select name="paper_side_${jobCount}" required>
            <option value="" disabled selected>Select side</option>
            <option value="Single-sided">Single-sided</option>
            <option value="Double-sided">Double-sided</option>
          </select>
        </div>

        <div class="form-group">
          <label>Paper Type:</label>
          <select name="paper_type_${jobCount}" required>
            <option value="" disabled selected>Select print type</option>
            <option value="Black & White">Black & White</option>
            <option value="Colored">Colored</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Upload File:</label>
        <div class="drop-zone" id="dropZone_${jobCount}">
          <p>Browse File</p>
          <span>Drag & Drop files here</span>
          <input type="file" name="documents" class="drop-zone-input" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" />
        </div>
        <div class="page-count" style="margin-top: 8px; color: #666;">Pages: <span>0</span></div>
        <div class="file-preview" style="margin-top: 12px; display: none;"></div>
      </div>

      <div class="form-group">
        <label>Additional Notes:</label>
        <textarea name="notes_${jobCount}" placeholder="Specify printing preferences or remarks..."></textarea>
      </div>
    `
    printJobs.appendChild(newJob)
    initializeDropZone(newJob.querySelector(".drop-zone"))

    newJob.querySelectorAll('select, input[type="number"], textarea').forEach(el => {
      el.addEventListener("change", saveFormState)
      el.addEventListener("input", saveFormState)
    })

    newJob.querySelector(".remove-job-btn").addEventListener("click", (e) => {
      e.preventDefault()
      newJob.remove()
      updateTotalTokens()
      saveFormState()
    })
  }

  function calculateTokens(jobElement) {
    const paperTypeSelect = jobElement.querySelector(`select[name^="paper_type_"]`)
    const pageCountSpan = jobElement.querySelector(".page-count span")
    const copiesInput = jobElement.querySelector(`input[name^="copies_"]`)
    const dropZoneInput = jobElement.querySelector(".drop-zone-input")
    const file = dropZoneInput?.files?.[0]

    const paperType = paperTypeSelect ? paperTypeSelect.value : ""
    const pageCount = Number.parseInt(pageCountSpan.textContent) || 0
    const copies = Number.parseInt(copiesInput ? copiesInput.value : 1) || 1

    let isImagePrint = false
    let tokensPerPage = 0

    if (file && file.type && file.type.startsWith("image/")) isImagePrint = true

    if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
    else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10

    const totalTokens = tokensPerPage * pageCount * copies

    let tokenDisplay = jobElement.querySelector(".token-cost")
    if (!tokenDisplay) {
      tokenDisplay = document.createElement("div")
      tokenDisplay.className = "token-cost"
      tokenDisplay.style.marginTop = "8px"
      tokenDisplay.style.color = "#333"
      tokenDisplay.style.fontWeight = "bold"
      tokenDisplay.style.padding = "8px 12px"
      tokenDisplay.style.background = "#f0f8ff"
      tokenDisplay.style.borderRadius = "6px"
      tokenDisplay.style.borderLeft = "3px solid #3d2ee7"
      jobElement.appendChild(tokenDisplay)
    }
    tokenDisplay.textContent = `🪙 Tokens for this job: ${totalTokens}`
    updateTotalTokens()
    saveFormState()
  }

  function updateTotalTokens() {
    const allJobTokens = Array.from(document.querySelectorAll(".token-cost")).map(
      (div) => Number.parseInt(div.textContent.replace(/\D/g, "")) || 0,
    )
    const total = allJobTokens.reduce((a, b) => a + b, 0)

    let totalDisplay = document.getElementById("totalTokens")
    if (!totalDisplay) {
      totalDisplay = document.createElement("div")
      totalDisplay.id = "totalTokens"
      totalDisplay.style.marginTop = "15px"
      totalDisplay.style.padding = "10px 15px"
      totalDisplay.style.background = "#f8f9ff"
      totalDisplay.style.borderRadius = "8px"
      totalDisplay.style.color = "#1e1362"
      totalDisplay.style.fontWeight = "bold"
      totalDisplay.style.textAlign = "right"
      form.appendChild(totalDisplay)
    }
    totalDisplay.textContent = `💰 Total Tokens Required: ${total}`

    // update queue info for selected pickup date (shows position/count at bottom of form)
    const pickupVal = document.getElementById('pickupDateTime')?.value || ''
    if (pickupVal) updateQueueInfo(pickupVal, total)

    if (currentUserEmail) {
      fetch(`http://localhost:3000/users/${encodeURIComponent(currentUserEmail)}`)
        .then((res) => res.json())
        .then((user) => {
          const userBalance = user.tokenBalance ?? 0
          const remainingTokens = Math.max(userBalance - total, 0)
          let remainingDisplay = document.getElementById("remainingTokens")
          if (!remainingDisplay) {
            remainingDisplay = document.createElement("div")
            remainingDisplay.id = "remainingTokens"
            remainingDisplay.style.marginTop = "10px"
            remainingDisplay.style.padding = "10px 15px"
            remainingDisplay.style.borderRadius = "8px"
            remainingDisplay.style.fontWeight = "bold"
            remainingDisplay.style.textAlign = "right"
            form.appendChild(remainingDisplay)
          }

          if (remainingTokens > 0) {
            remainingDisplay.style.background = "#f0fff0"
            remainingDisplay.style.color = "#2e7d32"
          } else {
            remainingDisplay.style.background = "#fff0f0"
            remainingDisplay.style.color = "#c62828"
          }
          remainingDisplay.textContent = `🪙 Remaining Tokens After Transaction: ${remainingTokens}`
        })
        .catch((err) => console.error("Failed to fetch token balance:", err))
    }
  }

  // Fetch pending count for a given pickup date and render queue info at bottom of form
  async function updateQueueInfo(pickupDateRaw, totalTokensForRequest) {
    const pickupDateOnly = String(pickupDateRaw).substring(0,10)
    if (!pickupDateOnly) return

    let queueDisplay = document.getElementById('queueInfo')
    if (!queueDisplay) {
      queueDisplay = document.createElement('div')
      queueDisplay.id = 'queueInfo'
      queueDisplay.style.marginTop = '10px'
      queueDisplay.style.padding = '10px 15px'
      queueDisplay.style.borderRadius = '8px'
      queueDisplay.style.fontWeight = 'bold'
      queueDisplay.style.textAlign = 'right'
      form.appendChild(queueDisplay)
    }

    try {
      const resp = await fetch(`http://localhost:3000/requests/pendingCount?pickupDate=${encodeURIComponent(pickupDateOnly)}`)
      if (!resp.ok) {
        queueDisplay.style.background = '#fff7e6'
        queueDisplay.style.color = '#8a6d3b'
        queueDisplay.textContent = `⚠️ Could not fetch queue info (status ${resp.status})`
        return
      }
      const j = await resp.json()
      const count = Number(j.count || 0)

      const today = new Date()
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const sel = new Date(pickupDateOnly + 'T00:00:00')
      const isFuture = sel.setHours(0,0,0,0) > todayOnly.setHours(0,0,0,0)

      if (isFuture) {
        queueDisplay.style.background = count >= 20 ? '#fff0f0' : '#f0fff0'
        queueDisplay.style.color = count >= 20 ? '#c62828' : '#2e7d32'
        const pos = count + 1
        queueDisplay.textContent = `📅 Pickup ${pickupDateOnly} — ${count} pending, you would be #${pos}`
        if (count >= 20) {
          // show inline warning near form
          queueDisplay.textContent += ' — Reservation limit reached (20)'
        }
      } else {
        // for today, show simple queue length and estimated position
        queueDisplay.style.background = '#f8f9ff'
        queueDisplay.style.color = '#1e1362'
        const pos = count + 1
        queueDisplay.textContent = `📅 Pickup ${pickupDateOnly} — ${count} pending, you would be #${pos}`
      }
    } catch (err) {
      console.warn('updateQueueInfo error', err)
      queueDisplay.style.background = '#fff7e6'
      queueDisplay.style.color = '#8a6d3b'
      queueDisplay.textContent = '⚠️ Error loading queue info'
    }
  }

  /* =========================
     IMPROVED FILE HANDLING SYSTEM (with validation)
     ========================= */

  // Get file type information
  function getFileTypeInfo(file) {
    if (!file) return FILE_TYPES.default

    if (file.type === 'application/pdf') {
      return FILE_TYPES.pdf
    } else if (file.type.startsWith('image/')) {
      return FILE_TYPES.image
    } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      return FILE_TYPES.word
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      return FILE_TYPES.text
    } else {
      return FILE_TYPES.default
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  function initializeDropZone(dropZone) {
    const fileInput = dropZone.querySelector(".drop-zone-input")
    const pageCountSpan = dropZone.closest(".form-group").querySelector(".page-count span")
    const jobElement = dropZone.closest(".print-job")
    const filePreview = dropZone.closest(".form-group").querySelector(".file-preview")

    // Handle selection / validation / preview
    const handleFileChange = (event) => {
      const input = event.target
      if (input.files && input.files.length > 0) {
        const file = input.files[0]

        // VALIDATION: show error modal if invalid
        if (!isValidFile(file)) {
          showErrorModal("That file type is not supported. Allowed: PDF, JPG, PNG, DOC, DOCX")
          input.value = "" // clear invalid
          // reset preview & page count
          if (filePreview) { filePreview.style.display = "none"; filePreview.innerHTML = "" }
          if (pageCountSpan) pageCountSpan.textContent = "0"
          calculateTokens(jobElement)
          saveFormState()
          return
        }

        const formattedName = formatFilename(file.name)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, input.name, jobElement)
        countPages(file, pageCountSpan, jobElement)
        saveFormState()
      }
    }

    const newFileInput = fileInput.cloneNode(true)
    // ensure accept attribute preserved 
    newFileInput.accept = fileInput.accept || ".pdf,.jpg,.jpeg,.png,.doc,.docx"
    fileInput.replaceWith(newFileInput)
    newFileInput.addEventListener("change", handleFileChange)

    dropZone.addEventListener("click", (e) => {
      if (e.target === dropZone || !e.target.closest(".file-action-btn")) {
        newFileInput.click()
      }
    })

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault()
      dropZone.classList.add("drop-zone--active")
      dropZone.style.borderColor = "#3d2ee7"
      dropZone.style.backgroundColor = "#f0f0ff"
    })

    ;["dragleave", "dragend"].forEach((type) => {
      dropZone.addEventListener(type, () => {
        dropZone.classList.remove("drop-zone--active")
        dropZone.style.borderColor = "#a8a8ff"
        dropZone.style.backgroundColor = "#f9f9ff"
      })
    })

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault()
      dropZone.classList.remove("drop-zone--active")

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]

        // VALIDATION: show error modal if invalid
        if (!isValidFile(file)) {
          showErrorModal("That file type is not supported. Allowed: PDF, JPG, PNG, DOC, DOCX")
          // don't attach file
          return
        }

        const formattedName = formatFilename(file.name)

        const dt = new DataTransfer()
        dt.items.add(file)
        newFileInput.files = dt.files

        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
        countPages(file, pageCountSpan, jobElement)

        newFileInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // If there's an existing file on load, validate & show preview
    if (newFileInput.files && newFileInput.files.length > 0) {
      const file = newFileInput.files[0]
      if (!isValidFile(file)) {
        newFileInput.value = ""
        if (filePreview) { filePreview.style.display = "none"; filePreview.innerHTML = "" }
        if (pageCountSpan) pageCountSpan.textContent = "0"
      } else {
        const formattedName = formatFilename(file.name)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
        countPages(file, pageCountSpan, jobElement)
      }
    }
  }

  function formatFilename(originalName) {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    const ext = originalName.substring(originalName.lastIndexOf("."))
    const name = originalName.substring(0, originalName.lastIndexOf("."))
    return `${name}_${month}-${day}-${year}${ext}`
  }

  function showFilePreview(preview, filename, filesize, pageCountSpan, file, inputName, jobElement) {
    if (preview) {
      preview.style.display = "block"
      const copies = Number.parseInt(jobElement.querySelector(`input[name^="copies_"]`).value) || 1
      const paperType = jobElement.querySelector(`select[name^="paper_type_"]`).value
      const pageCount = Number.parseInt(pageCountSpan.textContent) || 0

      let tokensPerPage = 0
      const isImagePrint = file && file.type && file.type.startsWith("image/")

      if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
      else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10

      const totalTokens = tokensPerPage * pageCount * copies
      const fileTypeInfo = getFileTypeInfo(file)

      const previewHTML = `
        <div class="file-preview-card" style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; background: #fff; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div class="file-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div class="file-info" style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="font-size: 24px;">${fileTypeInfo.icon}</div>
                <div>
                  <strong style="color: #333; font-size: 14px; display: block;">${filename}</strong>
                  <div style="color: #666; font-size: 12px;">
                    ${fileTypeInfo.label} • ${formatFileSize(filesize)}
                  </div>
                </div>
              </div>
              <div style="color: #666; font-size: 12px; background: #f8f9fa; padding: 8px; border-radius: 6px;">
                Pages: ${pageCount} • Copies: ${copies} • Tokens/page: ${tokensPerPage}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="file-action-btn replace-btn" style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span>        <img src="../images/student_img/submission/replace.png" alt=""> </span> Replace
              </button>
              <button type="button" class="file-action-btn remove-btn" style="padding: 6px 12px; background: #ff4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span> <img src="../images/student_img/submission/trash.png" alt=""></span> Remove
              </button>
            </div>
          </div>

          <div class="file-preview-content" style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; min-height: 200px; display: flex; align-items: center; justify-content: center;">
            ${generateFilePreviewContent(file)}
          </div>
        </div>
      `
      preview.innerHTML = previewHTML

      const replaceBtn = preview.querySelector(".replace-btn")
      const removeBtn = preview.querySelector(".remove-btn")

      replaceBtn.onclick = () => replaceFile(preview, jobElement)
      removeBtn.onclick = () => removeFile(preview, pageCountSpan, inputName, jobElement)
    }
  }

  function generateFilePreviewContent(file) {
    if (!file) {
      return '<p style="color: #999; margin: 0;">No file preview available</p>'
    }

    const fileTypeInfo = getFileTypeInfo(file)

    switch (fileTypeInfo.preview) {
      case 'image':
        const imageUrl = URL.createObjectURL(file)
        return `
          <div style="width: 100%; text-align: center;">
            <img src="${imageUrl}" alt="File preview" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" />
            <p style="margin: 12px 0 0 0; color: #666; font-size: 12px;">Image Preview - ${file.name}</p>
          </div>
        `

      case 'embed':
        const pdfUrl = URL.createObjectURL(file)
        // Use an iframe with toolbar params to produce a flat preview without viewer toolbar/actions
        // Note: sandbox attribute removed because embedding blob URLs in a sandboxed iframe
        // can trigger Chrome to block the content. Leaving iframe unsandboxed for blob/pdf.
        return `
          <div style="width: 100%; height: 400px;">
            <iframe src="${pdfUrl}#toolbar=0&navpanes=0" type="application/pdf" width="100%" height="100%" style="border-radius: 6px; border: 1px solid #ddd;"></iframe>
            <p style="margin: 12px 0 0 0; color: #666; font-size: 12px;">PDF Preview - ${file.name}</p>
          </div>
        `

      case 'text':
        return `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">${fileTypeInfo.icon}</div>
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${file.name}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">Text file - Content will be processed for printing</p>
          </div>
        `

      default:
        return `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">${fileTypeInfo.icon}</div>
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${file.name}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">${fileTypeInfo.label} - Ready for printing</p>
            <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">File type: ${file.type || 'Unknown'}</p>
          </div>
        `
    }
  }

  function replaceFile(preview, jobElement) {
    const dropZone = preview.closest(".form-group").querySelector(".drop-zone")
    const fileInput = dropZone.querySelector(".drop-zone-input")
    fileInput.click()
  }

  function removeFile(preview, pageCountSpan, inputName, jobElement) {
    const dropZone = preview.closest(".form-group").querySelector(".drop-zone")
    const fileInput = dropZone.querySelector(".drop-zone-input")
    fileInput.value = ""
    preview.style.display = "none"
    preview.innerHTML = ''
    pageCountSpan.textContent = "0"
    calculateTokens(jobElement)
    saveFormState()
  }

  async function countPages(file, pageCountSpan, jobElement) {
    let pageCount = 1
    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
        pageCount = pdf.numPages
      } catch (err) {
        console.error("Error counting PDF pages:", err)
        pageCount = 1
      }
    } else if (file.type && file.type.startsWith("image/")) {
      pageCount = 1
    } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      try {
        const text = await readFileAsText(file)
        const wordCount = text.split(/\s+/).length
        pageCount = Math.max(1, Math.ceil(wordCount / 500))
      } catch (err) {
        console.error("Error estimating Word document pages:", err)
        pageCount = 1
      }
    } else if (file.type && file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      try {
        const text = await readFileAsText(file)
        const wordCount = text.split(/\s+/).length
        pageCount = Math.max(1, Math.ceil(wordCount / 500))
      } catch (err) {
        console.error("Error estimating text file pages:", err)
        pageCount = 1
      }
    }
    pageCountSpan.textContent = pageCount
    const filePreview = jobElement.querySelector(".file-preview")
    const fileInput = jobElement.querySelector(".drop-zone-input")
    if (filePreview && fileInput && fileInput.files[0]) {
      const formattedName = formatFilename(fileInput.files[0].name)
      showFilePreview(filePreview, formattedName, fileInput.files[0].size, pageCountSpan, fileInput.files[0], fileInput.name, jobElement)
    }
    calculateTokens(jobElement)
    saveFormState()
  }

  // Helper function to read file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  /* =========================
     Form Submission (validates file types before sending)
     ========================= */
  confirmSubmissionBtn.addEventListener("click", async () => {
    // close confirmation modal
    if (confirmationModal) confirmationModal.style.display = "none"
    document.body.classList.remove("modal-open")

    // final validation: ensure all files are present and allowed
    const invalidFiles = []
    document.querySelectorAll(".print-job").forEach((job, i) => {
      const jobNumber = i + 1
      const fileInput = job.querySelector(".drop-zone-input")
      const file = fileInput?.files?.[0]
      if (!file) {
        invalidFiles.push(`Print Job #${jobNumber}: no file attached`)
      } else if (!isValidFile(file)) {
        invalidFiles.push(`Print Job #${jobNumber}: unsupported file type (${file.name})`)
      }
    })

    if (invalidFiles.length > 0) {
      showErrorModal("Please fix the following file issues:\n\n" + invalidFiles.join("\n"))
      return
    }

    const sentMeta = {
      fullName: document.getElementById("fullNameInput").value,
      email: document.getElementById("emailInput").value,
      course: document.getElementById("courseInput").value,
      year: document.getElementById("yearSelect").value,
      courseYear: `${document.getElementById("courseInput").value}-${document.getElementById("yearSelect").value}`,
      pickupDateTime: document.getElementById("pickupDateTime").value
    }

    const formData = new FormData()
    formData.append("fullName", sentMeta.fullName)
    formData.append("email", sentMeta.email)
    formData.append("course", sentMeta.course)
    formData.append("year", sentMeta.year)
    formData.append("courseYear", sentMeta.courseYear)
    formData.append("pickupDateTime", sentMeta.pickupDateTime || "")
    formData.append("semester", semesterInput?.value || "")
    formData.append("academicYear", academicYearInput?.value || "")

    const printJobsData = []
    document.querySelectorAll(".print-job").forEach((job, i) => {
      const jobId = i + 1
      const pageCount = Number.parseInt(job.querySelector(".page-count span").textContent) || 0
      const copies = Number.parseInt(job.querySelector(`input[name="copies_${jobId}"]`)?.value || 1) || 1
      const paperSize = job.querySelector(`select[name^="paper_size_"]`)?.value || ""
      const paperSide = job.querySelector(`select[name^="paper_side_"]`)?.value || ""
      const paperType = job.querySelector(`select[name^="paper_type_"]`)?.value || ""
      const notes = job.querySelector(`textarea[name^="notes_"]`)?.value || ""
      const fileInput = job.querySelector(".drop-zone-input")
      const originalFile = fileInput?.files?.[0] || null
      const isImagePrint = originalFile && originalFile.type && originalFile.type.startsWith("image/")

      let tokensPerPage = 0
      if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
      else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10
      const totalTokens = tokensPerPage * pageCount * copies

      printJobsData.push({
        jobId, copies, paperSize, paperSide, paperType, notes, pageCount, tokensPerPage, totalTokens, isImagePrint
      })

      if (originalFile) {
        const formattedName = formatFilename(originalFile.name)
        const formattedFile = new File([originalFile], formattedName, { type: originalFile.type, lastModified: originalFile.lastModified })
        formData.append("documents", formattedFile)
      }
    })

    formData.append("printJobs", JSON.stringify(printJobsData))

    try {
      // Before submitting, check how many pending requests exist for the chosen pickup date
      const pickupDateOnly = (sentMeta.pickupDateTime || '').substring(0,10)
      let clientQueuePosition = null
      if (pickupDateOnly) {
        try {
          const pendingRes = await fetch(`http://localhost:3000/requests/pendingCount?pickupDate=${encodeURIComponent(pickupDateOnly)}`)
          if (pendingRes.ok) {
            const pendingJson = await pendingRes.json()
            const count = Number(pendingJson.count || 0)

            // Determine if chosen date is in the future (strictly after today)
            const today = new Date()
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const sel = new Date(pickupDateOnly + 'T00:00:00')
            const isFuture = sel.setHours(0,0,0,0) > todayOnly.setHours(0,0,0,0)

            // Enforce client-side reservation limit for future dates
            if (isFuture && count >= 20) {
              showErrorModal('Reservation limit reached for the selected future pickup date. Please choose another date.')
              return
            }

            clientQueuePosition = count + 1
          } else {
            // Non-fatal: log but proceed with submission; server will also enforce limit
            console.warn('Failed to get pending count before submit:', pendingRes.status)
          }
        } catch (err) {
          console.warn('Error fetching pending count:', err)
        }
      }

      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      })

      const responseText = await res.text()
      let result
      try {
        result = JSON.parse(responseText)
      } catch (err) {
        throw new Error(`Server returned invalid JSON: ${responseText}`)
      }

      if (!res.ok) {
        const errorMsg = result.error || result.message || "Unknown server error"
        throw new Error(errorMsg)
      }

      // If server didn't return a queuePosition, fall back to client-calculated one
      if (result.queuePosition == null && clientQueuePosition != null) {
        result.queuePosition = clientQueuePosition
      }

      // Save success details and reset form
      storeSuccess(result, sentMeta)
      localStorage.removeItem(FORM_STATE_KEY)
      resetJobsAfterSubmit()

    } catch (err) {
      showErrorModal("⚠️ Error submitting form: " + err.message)
      console.error(err)
    }
  })

  /* =========================
     Event Listeners & Initialization
     ========================= */
  if (logoRefresh) {
    logoRefresh.addEventListener("click", () => (window.location.href = "home.html"))
  }

  /* ===== Pickup date constraints (date-only) ===== */
  function pad(n) { return String(n).padStart(2, "0") }

  function formatDateYYYYMMDD(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  function formatDateReadable(d) {
    return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
  }

  function setPickupConstraints() {
    if (!pickupDateTime) return
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // determine earliest selectable date based on day-of-week and current time
    let minDate = new Date(today)
    const minutesNow = now.getHours() * 60 + now.getMinutes()
    const start = 7 * 60 + 30 // 7:30
    const end = 17 * 60 // 17:00

    // if today is Sunday, move to Monday
    if (minDate.getDay() === 0) {
      minDate.setDate(minDate.getDate() + 1)
    } else {
      // if today but current time outside allowed window, disallow today
      if (minutesNow < start || minutesNow > end) {
        minDate.setDate(minDate.getDate() + 1)
      }
      // if that moves to Sunday, skip to Monday
      if (minDate.getDay() === 0) minDate.setDate(minDate.getDate() + 1)
    }

    const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    pickupDateTime.min = formatDateYYYYMMDD(minDate)
    pickupDateTime.max = formatDateYYYYMMDD(maxDate)

    pickupDateTime.removeEventListener('change', validatePickupDate)
    pickupDateTime.addEventListener('change', validatePickupDate)
  }

  function validatePickupDate() {
    if (!pickupDateTime) return true
    if (!pickupDateTime.value) return true

    const selected = new Date(pickupDateTime.value + 'T00:00:00')
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const minDate = pickupDateTime.min ? new Date(pickupDateTime.min + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const maxDate = pickupDateTime.max ? new Date(pickupDateTime.max + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)

    // no past dates relative to minDate
    if (selected < minDate) {
      showErrorModal('Pickup date cannot be in the past. Please choose a valid date.')
      pickupDateTime.value = ''
      return false
    }

    // not more than configured max ahead
    if (selected > maxDate) {
      showErrorModal('Pickup date cannot be more than 7 days in advance.')
      pickupDateTime.value = ''
      return false
    }

    // cannot be Sunday (0 === Sunday)
    if (selected.getDay() === 0) {
      showErrorModal('Pickup cannot be scheduled on Sundays. Please choose another day.')
      pickupDateTime.value = ''
      return false
    }

    // if selected is today, ensure current time is within allowed window 
    if (selected.getFullYear() === today.getFullYear() && selected.getMonth() === today.getMonth() && selected.getDate() === today.getDate()) {
      const minutesNow = now.getHours() * 60 + now.getMinutes()
      const start = 7 * 60 + 30 // 7:30
      const end = 17 * 60 // 17:00
      if (minutesNow < start || minutesNow > end) {
        showErrorModal('Today cannot be selected because current time is outside the allowed pickup window (7:30 AM - 5:00 PM). Please choose another date.')
        pickupDateTime.value = ''
        return false
      }
    }

    return true
  }

  // initialize constraints
  setPickupConstraints()

  // update queue info whenever pickup date changes
  if (pickupDateTime) {
    pickupDateTime.addEventListener('change', () => {
      // validate and then update queue info
      if (!validatePickupDate()) return
      if (pickupDateTime.value) updateQueueInfo(pickupDateTime.value)
      else {
        const q = document.getElementById('queueInfo')
        if (q) q.remove()
      }
    })
  }

  function getSemesterAndAcademicYear(date = new Date()) {
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    let semesterLabel, ayStart, ayEnd

    if (month >= 8 && month <= 12) {
      semesterLabel = "1st Semester"
      ayStart = year
      ayEnd = year + 1
    } else if (month >= 1 && month <= 5) {
      semesterLabel = "2nd Semester"
      ayStart = year - 1
      ayEnd = year
    } else {
      // June - July
      semesterLabel = "Short Term"
      ayStart = year - 1
      ayEnd = year
    }

    const ayText = `AY ${ayStart}-${ayEnd}`
    return { semesterLabel, ayText, ayStart, ayEnd }
  }

  function setSemesterAndAcademicYear(date = new Date()) {
    const { semesterLabel, ayText } = getSemesterAndAcademicYear(date)

    if (semesterInput) semesterInput.value = semesterLabel
    if (academicYearInput) academicYearInput.value = ayText
  }

  function populateAcademicYearSelect(preferredValue) {
    const sel = document.getElementById("academicYearInput")
    if (!sel) return

    // determine AY start for "current" academic year
    const now = new Date()
    const month = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const currentAyStart = month >= 8 ? currentYear : currentYear - 1

    // previous, current, next
    const starts = [ currentAyStart]

    // build options
    starts.forEach((s) => {
      const value = `AY ${s}-${s + 1}`
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = value
      sel.appendChild(opt)
    })

    // set preferred or default to current AY
    if (preferredValue) sel.value = preferredValue
    else sel.value = `AY ${currentAyStart}-${currentAyStart + 1}`

    // save when changed
    sel.addEventListener('change', saveFormState)
  }

  function loadUserData() {
    if (currentUserEmail) {
      fetch(`http://localhost:3000/users/${encodeURIComponent(currentUserEmail)}`)
        .then((res) => res.json())
        .then((user) => {
          const fullNameInput = document.getElementById("fullNameInput")
          const emailInput = document.getElementById("emailInput")

          fullNameInput.value = user.fullName || ""
          emailInput.value = user.email || ""
          emailInput.readOnly = true

          if (user.courseYear) {
            const [course, year] = user.courseYear.split('-')
            if (course) document.getElementById("courseInput").value = course
            if (year) document.getElementById("yearSelect").value = year
          }
          saveFormState()
        })
        .catch((err) => console.error("Failed to fetch user:", err))
    }
  }

  //Autofill Data
  setSemesterAndAcademicYear()
  populateAcademicYearSelect()
  loadUserData()

  if (addPrintJobBtn) {
    addPrintJobBtn.addEventListener("click", () => {
      addPrintJobProgrammatic()
      saveFormState()
    })
  }

  printJobs.addEventListener("click", (e) => {
    if (e.target.matches(".remove-job-btn")) {
      e.preventDefault()
      const job = e.target.closest(".print-job")
      job.remove()
      updateTotalTokens()
      saveFormState()
    }
  })

  printJobs.addEventListener("change", (e) => {
    const job = e.target.closest(".print-job")
    if (job) {
      calculateTokens(job)
    }
    saveFormState()
  })

  const firstDropZone = document.querySelector(".drop-zone")
  if (firstDropZone) {
    const firstFileInput = firstDropZone.querySelector('.drop-zone-input')
    firstFileInput.name = 'documents'
    initializeDropZone(firstDropZone)
    const firstJob = document.querySelector(".print-job")
    if (firstJob) {
      firstJob.querySelectorAll('select, input[type="number"], textarea').forEach(element => {
        element.addEventListener('change', () => calculateTokens(firstJob))
        element.addEventListener('input', saveFormState)
      })
    }
  }

  if (customResetBtn) {
    customResetBtn.addEventListener("click", () => {
      const currentName = document.getElementById("fullNameInput").value
      const currentEmail = document.getElementById("emailInput").value
      const currentCourse = document.getElementById("courseInput").value
      const currentYear = document.getElementById("yearSelect").value

      document.getElementById("pickupDateTime").value = ""
      confirmCheckbox.checked = false

      const allJobs = document.querySelectorAll(".print-job")
      allJobs.forEach((job, index) => {
        if (index > 0) job.remove()
      })

      const firstJob = document.querySelector(".print-job")
      if (firstJob) {
        try {
          firstJob.querySelector(`input[name="copies_1"]`).value = 1
          firstJob.querySelector(`select[name="paper_size_1"]`).value = ""
          firstJob.querySelector(`select[name="paper_side_1"]`).value = ""
          firstJob.querySelector(`select[name="paper_type_1"]`).value = ""
          firstJob.querySelector(`textarea[name="notes_1"]`).value = ""
          const dropZone = firstJob.querySelector(".drop-zone")
          const fileInput = dropZone.querySelector(".drop-zone-input")
          fileInput.value = ""
          fileInput.name = 'documents'
          const filePreview = firstJob.querySelector(".file-preview")
          filePreview.style.display = "none"
          filePreview.innerHTML = ''
          firstJob.querySelector(".page-count span").textContent = "0"
        } catch (e) { /* ignore */ }
      }

      jobCount = 1
      const tokenDisplay = document.querySelector(".token-cost")
      if (tokenDisplay) tokenDisplay.remove()
      const totalDisplay = document.getElementById("totalTokens")
      if (totalDisplay) totalDisplay.remove()
      const remainingDisplay = document.getElementById("remainingTokens")
      if (remainingDisplay) remainingDisplay.remove()

      document.getElementById("fullNameInput").value = currentName
      document.getElementById("emailInput").value = currentEmail
      document.getElementById("courseInput").value = currentCourse
      document.getElementById("yearSelect").value = currentYear
      document.getElementById("emailInput").readOnly = true

      saveFormState()
    })
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    e.stopPropagation()
    let formIsValid = true
    let errorMessage = ""

    const courseInput = document.getElementById("courseInput")
    const validCourses = courseInput.getAttribute("data-valid-courses").split(",")
    const selectedCourse = courseInput.value.trim()
    
    if (!selectedCourse) {
      formIsValid = false
      errorMessage = "Please fill in your Course\n"
    } else if (!validCourses.includes(selectedCourse)) {
      formIsValid = false
      errorMessage = "Invalid course selected. Please choose from the available options.\n"
    }
    if (!document.getElementById("yearSelect").value) {
      formIsValid = false
      errorMessage += "Please select your Year\n"
    }
    if (!document.getElementById("pickupDateTime").value) {
      formIsValid = false
      errorMessage += "Please select a Pickup Date & Time\n"
    } else {
      // validate pickup time more strictly before allowing confirmation modal
      if (!validatePickupDate()) {
        formIsValid = false
        errorMessage += "Please select a valid pickup date (not past, not Sunday, within 7 days).\n"
      }
    }

    const printJobElements = document.querySelectorAll(".print-job")
    printJobElements.forEach((job, index) => {
      const jobNumber = index + 1
      const fileInput = job.querySelector(`input[name="documents"]`)
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        formIsValid = false
        errorMessage += `Please upload a file for Print Job #${jobNumber}\n`
      } else {
        const file = fileInput.files[0]
        if (!isValidFile(file)) {
          formIsValid = false
          errorMessage += `Unsupported file type for Print Job #${jobNumber}: ${file.name}\n`
        }
        const pageCountSpan = job.querySelector(".page-count span")
        const pageCount = Number.parseInt(pageCountSpan.textContent) || 0
        if (pageCount === 0) {
          formIsValid = false
          errorMessage += `Please wait for file processing to complete for Print Job #${jobNumber}\n`
        }
      }
      const copies = job.querySelector(`input[name="copies_${jobNumber}"]`)
      const paperSize = job.querySelector(`select[name="paper_size_${jobNumber}"]`)
      const paperSide = job.querySelector(`select[name="paper_side_${jobNumber}"]`)
      const paperType = job.querySelector(`select[name="paper_type_${jobNumber}"]`)
      if (!copies || !copies.value) {
        formIsValid = false
        errorMessage += `Please enter number of copies for Print Job #${jobNumber}\n`
      }
      if (!paperSize || !paperSize.value) {
        formIsValid = false
        errorMessage += `Please select paper size for Print Job #${jobNumber}\n`
      }
      if (!paperSide || !paperSide.value) {
        formIsValid = false
        errorMessage += `Please select paper side for Print Job #${jobNumber}\n`
      }
      if (!paperType || !paperType.value) {
        formIsValid = false
        errorMessage += `Please select paper type for Print Job #${jobNumber}\n`
      }
    })

    if (!confirmCheckbox.checked) {
      formIsValid = false
      errorMessage += "Please confirm that the information provided is accurate and complete\n"
    }

    if (!formIsValid) {
      showErrorModal("Please fix the following errors:\n\n" + errorMessage)
      return
    }

    confirmationModal.style.display = "block"
    document.body.classList.add("modal-open")
  })

  // Disable the semester dropdown
  if (semesterInput) {
    semesterInput.disabled = true;
  }

  if(academicYearInput) {
    academicYearInput.disabled = true;
  }

  restoreFormState()
  showStoredSuccessIfAny()

  form.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("change", saveFormState)
    el.addEventListener("input", saveFormState)
  })

  document.querySelectorAll(".print-job").forEach(job => calculateTokens(job))
})
