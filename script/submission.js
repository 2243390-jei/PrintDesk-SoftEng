document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printRequestForm")
  const printJobs = document.getElementById("printJobs")
  const addPrintJobBtn = document.getElementById("addPrintJob")
  const logoRefresh = document.getElementById("logoRefresh")
  let jobCount = 1
  const initializedDropZones = new Set()

  // Import pdfjsLib or declare it before using it
  const pdfjsLib = window["pdfjs-dist/build/pdf"]

  if (logoRefresh) {
    logoRefresh.addEventListener("click", () => {
      location.reload()
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
          document.getElementById("fullNameInput").value = user.fullName || ""
          document.getElementById("emailInput").value = user.email || ""
        })
        .catch((err) => console.error("Failed to fetch user:", err))
    }
  }

  loadUserData()

  // =============================
  // Token calculation
  // =============================
  function calculateTokens(jobElement) {
    const paperType = jobElement.querySelector(`select[name^="paper_type_"]`).value
    const pageCount = Number.parseInt(jobElement.querySelector(".page-count span").textContent) || 0
    const copies = Number.parseInt(jobElement.querySelector(`input[name^="copies_"]`).value) || 1
    const dropZoneInput = jobElement.querySelector(".drop-zone-input")
    const file = dropZoneInput?.files?.[0]

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
      totalDisplay.style.textAlign = "right"
      totalDisplay.style.marginTop = "15px"
      totalDisplay.style.fontWeight = "bold"
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
            remainingDisplay.style.textAlign = "right"
            remainingDisplay.style.marginTop = "5px"
            remainingDisplay.style.fontWeight = "bold"
            form.appendChild(remainingDisplay)
          }
          remainingDisplay.style.color = remainingTokens > 0 ? "#2e7d32" : "#c62828"
          remainingDisplay.textContent = `🪙 Remaining Tokens After Transaction: ${remainingTokens}`
        })
        .catch((err) => console.error("Failed to fetch token balance:", err))
    }
  }

  // =============================
  // Drop Zone Logic with file preview
  // =============================
  function initializeDropZone(dropZone) {
    const zoneId = dropZone.id || dropZone.dataset.jobId
    if (initializedDropZones.has(zoneId)) return
    initializedDropZones.add(zoneId)

    const fileInput = dropZone.querySelector(".drop-zone-input")
    const pageCountSpan = dropZone.closest(".form-group").querySelector(".page-count span")
    const jobElement = dropZone.closest(".print-job")
    const filePreview = dropZone.closest(".form-group").querySelector(".file-preview")

    dropZone.addEventListener("click", (e) => {
      if (e.target === dropZone || !e.target.closest(".remove-file-btn")) {
        fileInput.click()
      }
    })

    const handleFileChange = () => {
      if (fileInput.files.length) {
        const file = fileInput.files[0]
        const formattedName = formatFilename(file.name)
        updateDropZone(dropZone, file, formattedName)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan)
        countPages(file, pageCountSpan).then(() => calculateTokens(jobElement))
      }
    }

    // Only add listener once
    fileInput.addEventListener("change", handleFileChange, { once: false })

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
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0]
        const formattedName = formatFilename(file.name)
        fileInput.files = e.dataTransfer.files
        updateDropZone(dropZone, file, formattedName)
        showFilePreview(filePreview, formattedName, file.size, pageCountSpan)
        countPages(file, pageCountSpan).then(() => calculateTokens(jobElement))
      }
      dropZone.classList.remove("drop-zone--active")
    })
  }

  function formatFilename(originalName) {
    const date = new Date()
    const dateStr = date.toISOString().split("T")[0] // YYYY-MM-DD
    const ext = originalName.substring(originalName.lastIndexOf("."))
    const name = originalName.substring(0, originalName.lastIndexOf("."))
    return `${name}_${dateStr}${ext}`
  }

  function showFilePreview(preview, filename, filesize, pageCountSpan) {
    if (preview) {
      preview.style.display = "block"
      preview.querySelector(".preview-filename").textContent = filename
      preview.querySelector(".preview-size").textContent = (filesize / 1024).toFixed(1) + " KB"
      preview.querySelector(".preview-pages").textContent = pageCountSpan.textContent || "0"
    }
  }

  function updateDropZone(dropZone, file, formattedName) {
    const inputName = "documents"
    dropZone.innerHTML = ""
    const fileDetails = document.createElement("div")
    fileDetails.classList.add("file-details")
    fileDetails.style.display = "flex"
    fileDetails.style.justifyContent = "space-between"
    fileDetails.style.alignItems = "center"
    fileDetails.innerHTML = `
      <p style="margin: 0;"><strong>${formattedName}</strong> (${(file.size / 1024).toFixed(1)} KB)</p>
      <button type="button" class="remove-file-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Remove</button>
    `

    const removeBtn = fileDetails.querySelector(".remove-file-btn")
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      // Reset dropzone to original state
      dropZone.innerHTML = `
        <p>Browse File</p>
        <span>Drag & Drop files here</span>
      `
      const newInput = document.createElement("input")
      newInput.type = "file"
      newInput.name = inputName
      newInput.className = "drop-zone-input"
      newInput.required = true
      newInput.style.display = "none"
      dropZone.appendChild(newInput)

      // Reinitialize the drop zone with the new input
      const pageCountSpan = dropZone.closest(".form-group").querySelector(".page-count span")
      pageCountSpan.textContent = "0"
      const filePreview = dropZone.closest(".form-group").querySelector(".file-preview")
      filePreview.style.display = "none"

      const zoneId = dropZone.id || dropZone.dataset.jobId
      initializedDropZones.delete(zoneId)

      const jobElement = dropZone.closest(".print-job")
      initializeDropZone(dropZone)
      updateTotalTokens()
    })

    const input = document.createElement("input")
    input.type = "file"
    input.name = inputName
    input.className = "drop-zone-input"
    input.required = true
    input.style.display = "none"
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    dropZone.appendChild(fileDetails)
    dropZone.appendChild(input)
  }

  async function countPages(file, pageCountSpan) {
    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
        pageCountSpan.textContent = pdf.numPages
      } catch (err) {
        console.error("Error counting PDF pages:", err)
        pageCountSpan.textContent = "?"
      }
    } else pageCountSpan.textContent = 1
  }

  // =============================
  // Add / Remove Print Jobs
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
        <div class="drop-zone" id="dropZone_${jobCount}" data-job-id="${jobCount}">
          <p>Browse File</p>
          <span>Drag & Drop files here</span>
          <input type="file" name="documents" class="drop-zone-input" required />
        </div>
        <div class="page-count" style="margin-top: 8px; color: #666;">Pages: <span>0</span></div>
        <div class="file-preview" style="margin-top: 12px; display: none;">
          <div style="padding: 10px; background: #f0f0ff; border-radius: 8px; border-left: 4px solid #3d2ee7;">
            <p style="margin: 0; font-weight: 600; color: #1e1362;">
              <span class="preview-filename"></span>
            </p>
            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #666;">
              <span class="preview-size"></span> • <span class="preview-pages"></span> pages
            </p>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Additional Notes:</label>
        <textarea name="notes_${jobCount}" placeholder="Specify printing preferences or remarks..."></textarea>
      </div>
    `
    printJobs.appendChild(newJob)
    initializeDropZone(newJob.querySelector(".drop-zone"))

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
  // Token recalculation when settings change
  // =============================
  printJobs.addEventListener("change", (e) => {
    const job = e.target.closest(".print-job")
    if (job) calculateTokens(job)
  })

  // =============================
  // Initialize for first job
  // =============================
  const firstDropZone = document.querySelector(".drop-zone")
  if (firstDropZone) {
    firstDropZone.id = firstDropZone.id || "dropZone_1"
    firstDropZone.dataset.jobId = 1
    initializeDropZone(firstDropZone)
  }

  // =============================
  // Form Submission with confirmation
  // =============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (!form.checkValidity()) {
      alert("Please fill all required fields.")
      return
    }

    const formData = new FormData(form)
    const printJobsData = []

    document.querySelectorAll(".print-job").forEach((job, i) => {
      const pageCount = Number.parseInt(job.querySelector(".page-count span").textContent) || 0
      const copies = Number.parseInt(formData.get(`copies_${i + 1}`)) || 1
      const paperType = formData.get(`paper_type_${i + 1}`) || "Black & White"
      const dropZoneInput = job.querySelector(".drop-zone-input")
      const file = dropZoneInput?.files?.[0]
      const isImagePrint = file && file.type.startsWith("image/")

      let tokensPerPage = 0
      if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1
      else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10

      const totalTokens = tokensPerPage * pageCount * copies

      printJobsData.push({
        jobId: i + 1,
        copies,
        paperSize: formData.get(`paper_size_${i + 1}`),
        paperSide: formData.get(`paper_side_${i + 1}`),
        paperType,
        notes: formData.get(`notes_${i + 1}`),
        pageCount,
        tokensPerPage,
        totalTokens,
        isImagePrint,
      })
    })

    formData.append("printJobs", JSON.stringify(printJobsData))

    try {
      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()
      if (res.ok) {
        alert(
          `✅ Print request submitted successfully!\n\nRequest ID: ${result.requestId}\nTotal Tokens: ${result.totalTokens}\nRemaining Tokens: ${result.remainingTokens}\nStatus: ${result.status}`,
        )
        setTimeout(() => (location.href = "home.html"), 1500)
      } else {
        alert("❌ Submission failed: " + result.error)
      }
    } catch (err) {
      alert("⚠️ Error submitting form: " + err.message)
    }
  })
})
