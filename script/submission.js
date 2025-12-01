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
    pdf: {
      icon: '📄',
      label: 'PDF Document',
      preview: 'embed'
    },
    image: {
      icon: '🖼️',
      label: 'Image',
      preview: 'image'
    },
    word: {
      icon: '📝',
      label: 'Word Document',
      preview: 'icon'
    },
    text: {
      icon: '📄',
      label: 'Text File',
      preview: 'text'
    },
    default: {
      icon: '📎',
      label: 'File',
      preview: 'icon'
    }
  }

  /* =========================
     Modal Utility Functions
     ========================= */
  function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  /* =========================
     Initialize Logout Functionality
     ========================= */
  function initializeLogout() {
    const logoutBtn = document.getElementById('profileLogoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (!logoutBtn || !logoutModal || !cancelLogout || !confirmLogout) {
      console.warn('Logout elements not found');
      return;
    }

    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal(document.getElementById('profileModal'));
      setTimeout(() => {
        openModal(logoutModal);
      }, 200);
    });

    cancelLogout.addEventListener('click', function () {
      closeModal(logoutModal);
    });

    confirmLogout.addEventListener('click', function () {
      console.log('User logging out...');
      sessionStorage.removeItem('userEmail');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      closeModal(logoutModal);
      closeModal(document.getElementById('profileModal'));
      setTimeout(() => {
        window.location.href = '../../index.html';
      }, 300);
    });

    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.open');
        if (openModals.length > 0) {
          openModals.forEach(modal => closeModal(modal));
        }
      }
    });
  }

  /* =========================
     Initialize Profile Functionality
     ========================= */
  function initializeProfile() {
    const navbarProfilePic = document.getElementById("nav-profile-pic");
    const profileModal = document.getElementById("profileModal");
    const closeProfileBtn = document.querySelector(".close-modal");

    if (navbarProfilePic) {
      if (currentUserEmail) {
        fetchAndDisplayUser(currentUserEmail);
      }

      navbarProfilePic.addEventListener("click", async () => {
        if (!currentUserEmail) {
          alert("⚠️ Please log in first.");
          return;
        }
        openModal(profileModal);
        await fetchAndDisplayUser(currentUserEmail);
      });

      if (closeProfileBtn) {
        closeProfileBtn.addEventListener("click", () => {
          closeModal(profileModal);
        });
      }

      // Initialize logout functionality
      initializeLogout();
    }
  }

  /* =========================
     User Profile Functions
     ========================= */
  async function fetchAndDisplayUser(email) {
    try {
      const res = await fetch(`http://localhost:3000/users/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("User not found");
      const user = await res.json();
      updateProfileModal(user.fullName, user.email, user.tokenBalance, user.role, user.picture);
      updateNavbarProfilePic(user.picture);
      updateTokenProgress(user.tokenBalance);
    } catch (err) {
      console.error("⚠️ Failed to fetch user:", err);
    }
  }

  function updateProfileModal(name, email, tokens, role, picture) {
    const studentName = document.getElementById("studentName");
    const studentId = document.getElementById("studentId");
    const tokenCount = document.getElementById("tokenCount");
    const profilePic = document.getElementById("profileModalPic");

    if (studentName) studentName.textContent = name || "Unknown User";
    if (studentId) studentId.textContent = email || "N/A";
    if (tokenCount) tokenCount.textContent = tokens ?? 0;
    if (profilePic && picture) {
      profilePic.src = picture;
      profilePic.style.borderRadius = "50%";
    }
  }

  function updateNavbarProfilePic(picture) {
    const navbarProfilePic = document.getElementById("nav-profile-pic");
    if (!navbarProfilePic) return;

    if (picture) {
      navbarProfilePic.src = picture;
    } else {
      navbarProfilePic.src = "../images/student_img/profile.png";
    }
    navbarProfilePic.style.borderRadius = "50%";
  }

  function updateTokenProgress(currentTokens = 0) {
    const tokenCount = document.getElementById("tokenCount");
    const progressBar = document.getElementById("tokenProgressBar");
    const maxTokens = 500;

    if (tokenCount && progressBar) {
      tokenCount.textContent = currentTokens;
      const progress = (currentTokens / maxTokens) * 100;
      progressBar.style.width = progress + "%";
    }

    const notificationsList = document.getElementById("notificationsList");
    if (notificationsList) {
      notificationsList.innerHTML = `
        <div class="notification-item">
          <div class="notification-content">
            <div class="notification-title">Token Update</div>
            <div class="notification-message">You currently have ${currentTokens} tokens.</div>
            <div class="notification-time">Just now</div>
          </div>
        </div>
      `;
    }
  }

  /* =========================
     Other Modal Functions
     ========================= */
  function closeAllModals() {
    confirmationModal.style.display = "none"
    filePreviewModal.style.display = "none"
    document.body.classList.remove("modal-open")
  }

  function closeSuccessModal() {
    successModal.style.display = "none"
    document.body.classList.remove("modal-open")
  }

  const closeModalButtons = document.querySelectorAll(".close-modal")
  closeModalButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      const modal = e.target.closest('.modal')
      if (modal && modal.id !== 'successModal') {
        closeAllModals()
      }
    })
  })

  cancelSubmissionBtn.addEventListener("click", closeAllModals)

  successHomeBtn.addEventListener("click", () => {
    clearStoredSuccess()
    closeSuccessModal()
    location.href = "home.html"
  })

  window.addEventListener("click", (e) => {
    if (e.target === confirmationModal || e.target === filePreviewModal) {
      closeAllModals()
    }
  })

  successNewSubmissionBtn.addEventListener("click", () => {
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
            newInput.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
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
    if (fullNameInput) { fullNameInput.value = currentName; fullNameInput.readOnly = true }
    if (emailInput) { emailInput.value = currentEmail; emailInput.readOnly = true }
    if (yearSelect) { yearSelect.value = currentYear }
    if (courseInput) { courseInput.value = currentCourse }
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
          const newJob = printJobs.querySelector(`.print-job[data-job-id="${idx + 1}"]`)
          if (newJob) populateJobFields(newJob, j, idx + 1)
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
      successDetails.innerHTML = `
        <p><strong>Request ID:</strong> ${s.requestId || "-"}</p>
        <p><strong>Full Name:</strong> ${s.fullName || "-"}</p>
        <p><strong>Course Year:</strong> ${s.courseYear || "-"}</p>
        <p><strong>Total Tokens Used:</strong> ${s.totalTokens ?? "-"}</p>
        <p><strong>Remaining Tokens:</strong> ${s.remainingTokens ?? "-"}</p>
        <p><strong>Status:</strong> ${s.status}</p>
        <p style="font-size:12px;color:#666">Submitted at: ${new Date(s.time).toLocaleString()}</p>
      `
      successModal.style.display = "block"
      document.body.classList.add("modal-open")
    } catch (e) {
      console.warn("showStoredSuccessIfAny error", e)
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

    if (file && file.type.startsWith("image/")) isImagePrint = true

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

  /* =========================
     IMPROVED FILE HANDLING SYSTEM
     ========================= */
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

    const handleFileChange = (event) => {
      const input = event.target
      if (input.files && input.files.length > 0) {
        const file = input.files[0]
        const formattedName = formatFilename(file.name)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, input.name, jobElement)
        countPages(file, pageCountSpan, jobElement)
        saveFormState()
      }
    }

    const newFileInput = fileInput.cloneNode(true)
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
        const formattedName = formatFilename(file.name)

        const dt = new DataTransfer()
        dt.items.add(file)
        newFileInput.files = dt.files

        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
        countPages(file, pageCountSpan, jobElement)

        newFileInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    if (newFileInput.files && newFileInput.files.length > 0) {
      const file = newFileInput.files[0]
      const formattedName = formatFilename(file.name)
      showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
      countPages(file, pageCountSpan, jobElement)
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
      const isImagePrint = file && file.type.startsWith("image/")

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
                <span>Replace</span>
              </button>
              <button type="button" class="file-action-btn remove-btn" style="padding: 6px 12px; background: #ff4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span>Remove</span>
              </button>
            </div>
          </div>
          
          <div style="background: #e8f4ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
            <strong style="color: #1a73e8; font-size: 14px;">🪙 Total Tokens for this document: ${totalTokens}</strong>
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
        return `
          <div style="width: 100%; height: 400px;">
            <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%" style="border-radius: 6px; border: 1px solid #ddd;" />
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
    } else if (file.type.startsWith("image/")) {
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
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
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

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  /* =========================
     Form Submission
     ========================= */
  confirmSubmissionBtn.addEventListener("click", async () => {
    confirmationModal.style.display = "none"
    document.body.classList.remove("modal-open")

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
      const isImagePrint = originalFile && originalFile.type.startsWith("image/")

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

      // SUCCESS PATH
      successDetails.innerHTML = `
        <p><strong>Request ID:</strong> ${result.requestId || "-"}</p>
        <p><strong>Full Name:</strong> ${sentMeta.fullName}</p>
        <p><strong>Course Year:</strong> ${sentMeta.courseYear}</p>
        <p><strong>Total Tokens Used:</strong> ${result.totalTokens ?? "-"}</p>
        <p><strong>Remaining Tokens:</strong> ${result.remainingTokens ?? "-"}</p>
        <p><strong>Status:</strong> ${result.status || "Submitted"}</p>
      `

      successModal.style.display = "block"
      document.body.classList.add("modal-open")

      storeSuccess(result, sentMeta)
      localStorage.removeItem(FORM_STATE_KEY)
      resetJobsAfterSubmit()

    } catch (err) {
      alert("⚠️ Error submitting form: " + err.message)
      console.error(err)
    }
  })

  /* =========================
     Event Listeners & Initialization
     ========================= */
  if (logoRefresh) {
    logoRefresh.addEventListener("click", () => (window.location.href = "home.html"))
  }

  function setMinPickupDateTime() {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
    pickupDateTime.min = minDateTime
    pickupDateTime.addEventListener('change', validatePickupTime)
  }

  function validatePickupTime() {
    const selectedDateTime = new Date(pickupDateTime.value)
    const hours = selectedDateTime.getHours()
    if (hours < 7 || hours >= 17) {
      alert('Pickup time must be between 7:00 AM and 5:00 PM')
      pickupDateTime.value = ''
    }
  }

  setMinPickupDateTime()

  function loadUserData() {
    if (currentUserEmail) {
      fetch(`http://localhost:3000/users/${encodeURIComponent(currentUserEmail)}`)
        .then((res) => res.json())
        .then((user) => {
          const fullNameInput = document.getElementById("fullNameInput")
          const emailInput = document.getElementById("emailInput")

          fullNameInput.value = user.fullName || ""
          emailInput.value = user.email || ""
          fullNameInput.readOnly = true
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

  // Initialize everything
  loadUserData()
  initializeProfile()
  showStoredSuccessIfAny()

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
      document.getElementById("fullNameInput").readOnly = true
      document.getElementById("emailInput").readOnly = true

      saveFormState()
    })
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    e.stopPropagation()
    let formIsValid = true
    let errorMessage = ""

    if (!document.getElementById("courseInput").value) {
      formIsValid = false
      errorMessage = "Please fill in your Course\n"
    }
    if (!document.getElementById("yearSelect").value) {
      formIsValid = false
      errorMessage += "Please select your Year\n"
    }
    if (!document.getElementById("pickupDateTime").value) {
      formIsValid = false
      errorMessage += "Please select a Pickup Date & Time\n"
    }

    const printJobElements = document.querySelectorAll(".print-job")
    printJobElements.forEach((job, index) => {
      const jobNumber = index + 1
      const fileInput = job.querySelector(`input[name="documents"]`)
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        formIsValid = false
        errorMessage += `Please upload a file for Print Job #${jobNumber}\n`
      } else {
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
      alert("Please fix the following errors:\n\n" + errorMessage)
      return
    }

    confirmationModal.style.display = "block"
    document.body.classList.add("modal-open")
  })

  restoreFormState()

  form.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("change", saveFormState)
    el.addEventListener("input", saveFormState)
  })

  document.querySelectorAll(".print-job").forEach(job => calculateTokens(job))
})