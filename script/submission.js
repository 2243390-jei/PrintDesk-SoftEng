document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printRequestForm")
  const printJobs = document.getElementById("printJobs")
  const addPrintJobBtn = document.getElementById("addPrintJob")
  const logoRefresh = document.getElementById("logoRefresh")
  const pickupDateTime = document.getElementById("pickupDateTime")
  const confirmationModal = document.getElementById("confirmationModal")
  const filePreviewModal = document.getElementById("filePreviewModal")
  const cancelSubmissionBtn = document.getElementById("cancelSubmission")
  const confirmSubmissionBtn = document.getElementById("confirmSubmission")
  const filePreviewContent = document.getElementById("filePreviewContent")
  const customResetBtn = document.getElementById("customResetBtn")
  const confirmCheckbox = document.getElementById("confirmCheckbox") 
  
  let jobCount = 1

  // Import pdfjsLib or declare it before using it
  const pdfjsLib = window["pdfjs-dist/build/pdf"]

  // =============================
  // Logo click redirect to home
  // =============================
  if (logoRefresh) {
    logoRefresh.addEventListener("click", () => {
      window.location.href = "home.html"
    })
  }

  // =============================
  // 🧠 Auto-fill user info from session
  // =============================
  const currentUserEmail = sessionStorage.getItem("userEmail")

  function loadUserData() {
    if (currentUserEmail) {
      fetch(`http://localhost:3000/users/${encodeURIComponent(currentUserEmail)}`)
        .then((res) => res.json())
        .then((user) => {
          // Set values and make them readonly
          const fullNameInput = document.getElementById("fullNameInput")
          const emailInput = document.getElementById("emailInput")
          
          fullNameInput.value = user.fullName || ""
          emailInput.value = user.email || ""
          fullNameInput.readOnly = true
          emailInput.readOnly = true
          
          // Auto-fill course and year if available in user data
          if (user.courseYear) {
            const [course, year] = user.courseYear.split('-');
            if (course) document.getElementById("courseInput").value = course
            if (year) document.getElementById("yearSelect").value = year
          }
        })
        .catch((err) => console.error("Failed to fetch user:", err))
    }
  }

  loadUserData()

  // =============================
  // Set minimum datetime for pickup (current time + 1 hour)
  // =============================
  function setMinPickupDateTime() {
    const now = new Date()
    // Set minimum to current time + 1 hour
    now.setHours(now.getHours() + 1)
    
    // Format to YYYY-MM-DDTHH:MM
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
    pickupDateTime.min = minDateTime
    
    // Set max time to 5pm and min time to 7am
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

  // =============================
  // FIXED: Token calculation - PROPERLY TRIGGERED
  // =============================
  function calculateTokens(jobElement) {
    const paperTypeSelect = jobElement.querySelector(`select[name^="paper_type_"]`)
    const pageCountSpan = jobElement.querySelector(".page-count span")
    const copiesInput = jobElement.querySelector(`input[name^="copies_"]`)
    const dropZoneInput = jobElement.querySelector(".drop-zone-input")
    const file = dropZoneInput?.files?.[0]

    // Get values with defaults
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
          
          remainingDisplay.className = remainingTokens > 0 ? "" : "low-tokens"
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

  // =============================
  // FIXED: Drop Zone Logic with PROPER document preview
  // =============================
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
      }
    }

    // Remove existing event listeners and add new ones
    const newFileInput = fileInput.cloneNode(true)
    fileInput.replaceWith(newFileInput)
    newFileInput.addEventListener("change", handleFileChange)

    dropZone.addEventListener("click", (e) => {
      if (e.target === dropZone || !e.target.closest(".remove-file-btn")) {
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
        
        // Create a new DataTransfer to set the file
        const dt = new DataTransfer()
        dt.items.add(file)
        newFileInput.files = dt.files
        
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
        countPages(file, pageCountSpan, jobElement)
        
        // Trigger change event manually
        newFileInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // If there's already a file, show the preview
    if (newFileInput.files && newFileInput.files.length > 0) {
      const file = newFileInput.files[0]
      const formattedName = formatFilename(file.name)
      showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, newFileInput.name, jobElement)
      countPages(file, pageCountSpan, jobElement)
    }
  }

  // Format filename with date at the end
  function formatFilename(originalName) {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    
    const ext = originalName.substring(originalName.lastIndexOf("."))
    const name = originalName.substring(0, originalName.lastIndexOf("."))
    
    // Date added at the end as requested: filename_MM-DD-YYYY.ext
    return `${name}_${month}-${day}-${year}${ext}`
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  }

  // FIXED: Show file preview with document styling like the image
  function showFilePreview(preview, filename, filesize, pageCountSpan, file, inputName, jobElement) {
    if (preview) {
      preview.style.display = "block"
      
      // Get current job settings for token calculation
      const copies = Number.parseInt(jobElement.querySelector(`input[name^="copies_"]`).value) || 1
      const paperType = jobElement.querySelector(`select[name^="paper_type_"]`).value
      const pageCount = Number.parseInt(pageCountSpan.textContent) || 0
      
      let tokensPerPage = 0
      const isImagePrint = file && file.type.startsWith("image/")
      
      if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
      else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10

      const totalTokens = tokensPerPage * pageCount * copies
      
      // Create document preview HTML like the image
      preview.innerHTML = `
        <div class="document-preview-container" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; background: #f9f9f9; margin-top: 10px;">
          <h4 style="margin: 0 0 12px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Documents & Preview</h4>
          <div style="border-top: 2px solid #ddd; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <strong style="color: #333; font-size: 14px;">${filename}</strong>
                <div style="color: #666; font-size: 12px; margin-top: 4px;">
                  Pages: ${pageCount} • Copies: ${copies} • Tokens/page: ${tokensPerPage}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="view-file-btn" style="padding: 6px 12px; background: #3d2ee7; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  View Full Size
                </button>
                <button type="button" class="remove-file-btn" style="padding: 6px 12px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  Remove
                </button>
              </div>
            </div>
            <div style="background: #e8f4ff; padding: 8px; border-radius: 4px; margin-top: 8px;">
              <strong style="color: #1a73e8;">🪙 Total Tokens for this document: ${totalTokens}</strong>
            </div>
          </div>
        </div>
      `
      
      // Add event listeners to the new buttons
      const viewBtn = preview.querySelector(".view-file-btn")
      const removeBtn = preview.querySelector(".remove-file-btn")
      
      viewBtn.onclick = () => previewFile(file)
      removeBtn.onclick = () => removeFile(preview, pageCountSpan, inputName, jobElement)
    }
  }

  // FIXED: Large file preview modal
  function previewFile(file) {
    if (!file) return
    
    filePreviewContent.innerHTML = ""
    
    // Create a larger container for better visibility
    const previewContainer = document.createElement("div")
    previewContainer.style.width = "90vw"
    previewContainer.style.height = "80vh"
    previewContainer.style.maxWidth = "1200px"
    previewContainer.style.maxHeight = "800px"
    previewContainer.style.display = "flex"
    previewContainer.style.flexDirection = "column"
    previewContainer.style.alignItems = "center"
    previewContainer.style.justifyContent = "center"
    
    const fileName = document.createElement("h3")
    fileName.textContent = `Preview: ${file.name}`
    fileName.style.marginBottom = "20px"
    fileName.style.color = "#333"
    previewContainer.appendChild(fileName)
    
    if (file.type.startsWith("image/")) {
      const img = document.createElement("img")
      img.src = URL.createObjectURL(file)
      img.alt = "File Preview"
      img.style.maxWidth = "100%"
      img.style.maxHeight = "70vh"
      img.style.objectFit = "contain"
      img.style.border = "2px solid #ddd"
      img.style.borderRadius = "8px"
      previewContainer.appendChild(img)
    } else if (file.type === "application/pdf") {
      const object = document.createElement("object")
      object.data = URL.createObjectURL(file)
      object.type = "application/pdf"
      object.width = "100%"
      object.height = "600"
      object.style.border = "2px solid #ddd"
      object.style.borderRadius = "8px"
      previewContainer.appendChild(object)
    } else {
      const notSupported = document.createElement("div")
      notSupported.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h4>Preview not available for this file type</h4>
          <p>File: ${file.name}</p>
          <p>Type: ${file.type}</p>
        </div>
      `
      previewContainer.appendChild(notSupported)
    }
    
    // Add close button
    const closeButton = document.createElement("button")
    closeButton.textContent = "Close Preview"
    closeButton.style.marginTop = "20px"
    closeButton.style.padding = "10px 20px"
    closeButton.style.backgroundColor = "#3d2ee7"
    closeButton.style.color = "white"
    closeButton.style.border = "none"
    closeButton.style.borderRadius = "5px"
    closeButton.style.cursor = "pointer"
    closeButton.onclick = () => {
      filePreviewModal.style.display = "none"
      // Clean up object URLs
      if (file.type.startsWith("image/")) {
        URL.revokeObjectURL(file)
      }
    }
    previewContainer.appendChild(closeButton)
    
    filePreviewContent.appendChild(previewContainer)
    filePreviewModal.style.display = "block"
  }

  // FIXED: Remove file function
  function removeFile(preview, pageCountSpan, inputName, jobElement) {
    const dropZone = preview.closest(".form-group").querySelector(".drop-zone")
    const fileInput = dropZone.querySelector(".drop-zone-input")
    
    // Clear the file input
    fileInput.value = ""
    
    // Reset preview and page count
    preview.style.display = "none"
    preview.innerHTML = '' // Clear the preview content
    pageCountSpan.textContent = "0"
    
    // Recalculate tokens
    calculateTokens(jobElement)
    
    console.log("File removed successfully")
  }

  async function countPages(file, pageCountSpan, jobElement) {
    let pageCount = 1; // Default for non-PDF files
    
    if (file.type === "application/pdf") {
      try {
        console.log("Counting PDF pages for:", file.name);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        pageCount = pdf.numPages;
        console.log("PDF pages counted:", pageCount);
      } catch (err) {
        console.error("Error counting PDF pages:", err);
        pageCount = 1; // Fallback to 1 page if counting fails
      }
    } else if (file.type.startsWith("image/")) {
      pageCount = 1; // Images are always 1 page
    }
    
    // Update the page count display
    pageCountSpan.textContent = pageCount;
    
    // Update the file preview with the correct page count if it exists
    const filePreview = jobElement.querySelector(".file-preview");
    if (filePreview && filePreview.style.display !== "none") {
      // Recreate the preview with updated page count
      const fileInput = jobElement.querySelector(".drop-zone-input")
      const file = fileInput?.files?.[0]
      if (file) {
        const formattedName = formatFilename(file.name)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, fileInput.name, jobElement)
      }
    }
    
    // Recalculate tokens after page count is updated
    calculateTokens(jobElement);
  }

  // =============================
  // Add / Remove Print Jobs - WITH PROPER PREVIEW AND TOKEN CALCULATION
  // =============================
  addPrintJobBtn.addEventListener("click", () => {
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
          <input type="file" name="documents" class="drop-zone-input" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
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

    // Add token calculation to the new job - FIXED EVENT LISTENERS
    const jobElement = newJob
    
    // Add change listeners to all form elements
    const formElements = newJob.querySelectorAll('select, input[type="number"]')
    formElements.forEach(element => {
      element.addEventListener('change', () => {
        calculateTokens(jobElement)
        // Update preview if file exists
        const filePreview = jobElement.querySelector(".file-preview")
        const fileInput = jobElement.querySelector(".drop-zone-input")
        const pageCountSpan = jobElement.querySelector(".page-count span")
        if (filePreview.style.display !== "none" && fileInput.files.length > 0) {
          const file = fileInput.files[0]
          const formattedName = formatFilename(file.name)
          showFilePreview(filePreview, formattedName, file.size, pageCountSpan, file, fileInput.name, jobElement)
        }
      })
    })

    newJob.querySelector(".remove-job-btn").addEventListener("click", (e) => {
      e.preventDefault()
      newJob.remove()
      updateTotalTokens()
    })
  })

  printJobs.addEventListener("click", (e) => {
    if (e.target.matches(".remove-job-btn")) {
      e.preventDefault()
      e.target.closest(".print-job").remove()
      updateTotalTokens()
    }
  })

  // =============================
  // FIXED: Token recalculation when settings change - PROPER EVENT DELEGATION
  // =============================
  printJobs.addEventListener("change", (e) => {
    const job = e.target.closest(".print-job")
    if (job) {
      calculateTokens(job)
    }
  })

  // =============================
  // Initialize for first job with token calculation
  // =============================
  const firstDropZone = document.querySelector(".drop-zone")
  if (firstDropZone) {
    const firstFileInput = firstDropZone.querySelector('.drop-zone-input')
    firstFileInput.name = 'documents'
    initializeDropZone(firstDropZone)
    
    // Add token calculation to first job
    const firstJob = document.querySelector(".print-job")
    firstJob.querySelectorAll('select, input[type="number"]').forEach(element => {
      element.addEventListener('change', () => calculateTokens(firstJob))
    })
  }

  // =============================
  // Custom Reset Function - PRESERVE NAME AND EMAIL
  // =============================
  customResetBtn.addEventListener("click", () => {
    // Store current name and email values before reset
    const currentName = document.getElementById("fullNameInput").value
    const currentEmail = document.getElementById("emailInput").value
    
    // Reset only specific fields - DO NOT reset name and email
    document.getElementById("courseInput").value = ""
    document.getElementById("yearSelect").value = ""
    document.getElementById("pickupDateTime").value = ""
    confirmCheckbox.checked = false
    
    // Reset all print jobs to first job only
    const allJobs = document.querySelectorAll(".print-job")
    allJobs.forEach((job, index) => {
      if (index > 0) {
        job.remove()
      }
    })
    
    // Reset the first job
    const firstJob = document.querySelector(".print-job")
    if (firstJob) {
      firstJob.querySelector(`input[name="copies_1"]`).value = 1
      firstJob.querySelector(`select[name="paper_size_1"]`).value = ""
      firstJob.querySelector(`select[name="paper_side_1"]`).value = ""
      firstJob.querySelector(`select[name="paper_type_1"]`).value = ""
      firstJob.querySelector(`textarea[name="notes_1"]`).value = ""
      
      // Reset file upload
      const dropZone = firstJob.querySelector(".drop-zone")
      const fileInput = dropZone.querySelector(".drop-zone-input")
      fileInput.value = ""
      fileInput.name = 'documents'
      
      // Hide file preview
      const filePreview = firstJob.querySelector(".file-preview")
      filePreview.style.display = "none"
      filePreview.innerHTML = ''
      
      // Reset page count
      const pageCount = firstJob.querySelector(".page-count span")
      pageCount.textContent = "0"
    }
    
    // Reset job count
    jobCount = 1
    
    // Clear token displays
    const tokenDisplay = document.querySelector(".token-cost")
    if (tokenDisplay) tokenDisplay.remove()
    
    const totalDisplay = document.getElementById("totalTokens")
    if (totalDisplay) totalDisplay.remove()
    
    const remainingDisplay = document.getElementById("remainingTokens")
    if (remainingDisplay) remainingDisplay.remove()
    
    // Ensure name and email remain locked and preserved
    document.getElementById("fullNameInput").value = currentName
    document.getElementById("emailInput").value = currentEmail
    
    // Re-set the readonly attribute to ensure they stay locked
    document.getElementById("fullNameInput").readOnly = true
    document.getElementById("emailInput").readOnly = true
    
    console.log("Form reset successfully - name and email preserved")
  })

  // =============================
  // Modal Logic
  // =============================
  const closeModalButtons = document.querySelectorAll(".close-modal")
  
  closeModalButtons.forEach(button => {
    button.addEventListener("click", () => {
      confirmationModal.style.display = "none"
      filePreviewModal.style.display = "none"
    })
  })
  
  cancelSubmissionBtn.addEventListener("click", () => {
    confirmationModal.style.display = "none"
  })
  
  window.addEventListener("click", (e) => {
    if (e.target === confirmationModal || e.target === filePreviewModal) {
      confirmationModal.style.display = "none"
      filePreviewModal.style.display = "none"
    }
  })

  // =============================
  // Form Validation
  // =============================
  form.addEventListener("submit", (e) => {
    e.preventDefault()
    
    // Check form validity
    let formIsValid = true
    let errorMessage = ""

    // Check required fields
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

    // Check print jobs
    const printJobElements = document.querySelectorAll(".print-job")
    let hasValidFile = false
    
    printJobElements.forEach((job, index) => {
      const jobNumber = index + 1
      
      const fileInput = job.querySelector(`input[name="documents"]`)
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        formIsValid = false
        errorMessage += `Please upload a file for Print Job #${jobNumber}\n`
      } else {
        hasValidFile = true
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
    
    // Show confirmation modal instead of directly submitting
    confirmationModal.style.display = "block"
  })

  // =============================
  // DEBUG: Form Submission with enhanced logging
  // =============================
  confirmSubmissionBtn.addEventListener("click", async () => {
    confirmationModal.style.display = "none"
    
    const formData = new FormData()
    const printJobsData = []

    // DEBUG: Collect all form data with enhanced logging
    const fullName = document.getElementById("fullNameInput").value
    const email = document.getElementById("emailInput").value
    const course = document.getElementById("courseInput").value
    const year = document.getElementById("yearSelect").value
    const courseYear = `${course}-${year}`.trim()
    const pickupDateTimeValue = document.getElementById("pickupDateTime").value

    console.log("🔍 === DEBUG: FORM DATA COLLECTION ===")
    console.log("📝 User Information:")
    console.log("   - Full Name:", fullName)
    console.log("   - Email:", email)
    console.log("   - Course:", course)
    console.log("   - Year:", year)
    console.log("   - Course Year:", courseYear)
    console.log("   - Pickup DateTime:", pickupDateTimeValue)

    // FIX: Add all user data to FormData with consistent field names
    formData.append("fullName", fullName)
    formData.append("email", email)
    formData.append("course", course)
    formData.append("year", year)
    formData.append("courseYear", courseYear)
    formData.append("pickupDateTime", pickupDateTimeValue)

    // Process each print job
    console.log("📦 Processing Print Jobs:")
    document.querySelectorAll(".print-job").forEach((job, i) => {
      const jobId = i + 1
      
      const pageCount = Number.parseInt(job.querySelector(".page-count span").textContent) || 0
      const copies = Number.parseInt(job.querySelector(`input[name="copies_${jobId}"]`).value) || 1
      const paperSize = job.querySelector(`select[name="paper_size_${jobId}"]`).value
      const paperSide = job.querySelector(`select[name="paper_side_${jobId}"]`).value
      const paperType = job.querySelector(`select[name="paper_type_${jobId}"]`).value
      const fileInput = job.querySelector(`input[name="documents"]`)
      const originalFile = fileInput?.files?.[0]
      const notes = job.querySelector(`textarea[name="notes_${jobId}"]`).value
      const isImagePrint = originalFile && originalFile.type.startsWith("image/")
      
      let tokensPerPage = 0
      if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
      else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10

      const totalTokens = tokensPerPage * pageCount * copies

      const jobData = {
        jobId: jobId,
        copies: copies,
        paperSize: paperSize,
        paperSide: paperSide,
        paperType: paperType,
        notes: notes,
        pageCount: pageCount,
        tokensPerPage: tokensPerPage,
        totalTokens: totalTokens,
        isImagePrint: isImagePrint,
      }

      console.log(`   📄 Print Job #${jobId}:`, jobData)

      printJobsData.push(jobData)

      // Apply date formatting to filename when submitting
      if (originalFile) {
        const formattedName = formatFilename(originalFile.name)
        // Create new File object with formatted name
        const formattedFile = new File([originalFile], formattedName, {
          type: originalFile.type,
          lastModified: originalFile.lastModified
        })
        formData.append("documents", formattedFile)
        console.log(`   📎 File: ${originalFile.name} -> ${formattedName}`)
      }
    })

    formData.append("printJobs", JSON.stringify(printJobsData))

    // DEBUG: Log complete FormData before sending
    console.log("🚀 === DEBUG: FINAL FORM DATA ===")
    console.log("FormData entries:")
    for (let [key, value] of formData.entries()) {
      if (key === 'documents') {
        console.log(`   📁 ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`)
      } else {
        console.log(`   📋 ${key}:`, value)
      }
    }

    try {
      console.log("🌐 === DEBUG: SENDING REQUEST TO SERVER ===")
      console.log("Endpoint: http://localhost:3000/submit")
      console.log("Method: POST")
      
      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      })

      console.log("📡 === DEBUG: SERVER RESPONSE ===")
      console.log("Status:", res.status, res.statusText)
      
      const responseText = await res.text()
      console.log("Raw response text:", responseText)

      let result;
      try {
        result = JSON.parse(responseText)
        console.log("Parsed JSON response:", result)
      } catch (parseError) {
        console.error("❌ Failed to parse server response as JSON:", parseError)
        console.error("Raw response that failed to parse:", responseText)
        throw new Error(`Server returned invalid JSON: ${responseText}`)
      }

      if (res.ok) {
        if (result.success || result.requestId) {
          console.log("✅ === DEBUG: SUBMISSION SUCCESSFUL ===")
          console.log("Request ID:", result.requestId)
          console.log("Full Name:", fullName)
          console.log("Course Year:", courseYear)
          console.log("Total Tokens:", result.totalTokens)
          console.log("Remaining Tokens:", result.remainingTokens)
          
          alert(
            `✅ Print request submitted successfully!\n\nRequest ID: ${result.requestId}\nFull Name: ${fullName}\nCourse Year: ${courseYear}\nTotal Tokens: ${result.totalTokens}\nRemaining Tokens: ${result.remainingTokens}\nStatus: ${result.status}`
          )
          setTimeout(() => (location.href = "home.html"), 1500)
        } else {
          console.error("❌ Server responded with unexpected format:", result)
          alert("❌ Submission failed: Server responded with unexpected format")
        }
      } else {
        const errorMsg = result.error || result.message || "Unknown server error"
        console.error("❌ Server error response:", errorMsg)
        alert(`❌ Submission failed: ${errorMsg}`)
      }
    } catch (err) {
      console.error("💥 === DEBUG: SUBMISSION ERROR ===")
      console.error("Error message:", err.message)
      console.error("Error stack:", err.stack)
      alert("⚠️ Error submitting form: " + err.message)
    }
  })

  // Example function to submit a print request
  async function submitPrintRequest({ email, fullName, courseYear, pickupDatetime, jobs, files }) {
    // jobs is an array of job objects (tokensPerPage, totalTokens, copies, etc.)
    // files is an array of File objects corresponding to jobs (can be empty elements)
    const form = new FormData()
    form.append("email", email)
    // append both variants if you want compatibility
    form.append("full_name", fullName)
    form.append("fullName", fullName)
    form.append("course_year", courseYear)
    form.append("courseYear", courseYear)
    form.append("pickup_datetime", pickupDatetime || "")
    form.append("printJobs", JSON.stringify(jobs || []))

    // append files under the same field name used by multer: "documents"
    (files || []).forEach((f) => {
      if (f) form.append("documents", f)
    })

    const res = await fetch("/submit", {
      method: "POST",
      body: form,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err && err.error ? err.error : `Submit failed: ${res.status}`)
    }
    return res.json()
  }
})