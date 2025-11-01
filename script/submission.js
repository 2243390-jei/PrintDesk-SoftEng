document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printRequestForm");
  const printJobs = document.getElementById("printJobs");
  const addPrintJobBtn = document.getElementById("addPrintJob");
  let jobCount = 1;

  // =============================
  // 🧠 Auto-fill user info
  // =============================
  const googleUser = JSON.parse(localStorage.getItem("googleUser"));
  const manualUser = JSON.parse(localStorage.getItem("manualUser"));

  if (googleUser) {
    // Extract name and email from Google login
    document.querySelector('input[name="full_name"]').value = googleUser.name || "";
    document.querySelector('input[name="email"]').value = googleUser.email || "";

  } else if (manualUser) {
    // For manual login (dummy users)
    document.querySelector('input[name="email"]').value = manualUser.email || "";

    if (manualUser.role === "student") {
      document.querySelector('input[name="full_name"]').value = "Student User";
    } else if (manualUser.role === "admin") {
      document.querySelector('input[name="full_name"]').value = "Administrator";
      document.querySelector('input[name="course_year"]').value = "N/A";
    }
  }

  // =============================
  // Token calculation
  // =============================
  function calculateTokens(jobElement) {
    const paperType = jobElement.querySelector(`select[name^="paper_type_"]`).value;
    const pageCount = parseInt(jobElement.querySelector(".page-count span").textContent) || 0;
    const copies = parseInt(jobElement.querySelector(`input[name^="copies_"]`).value) || 1;
    const dropZoneInput = jobElement.querySelector(".drop-zone-input");
    const file = dropZoneInput?.files?.[0];

    let isImagePrint = false;
    let tokensPerPage = 0;

    if (file && file.type.startsWith("image/")) isImagePrint = true;

    if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1;
    else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10;

    const totalTokens = tokensPerPage * pageCount * copies;

    let tokenDisplay = jobElement.querySelector(".token-cost");
    if (!tokenDisplay) {
      tokenDisplay = document.createElement("div");
      tokenDisplay.className = "token-cost";
      tokenDisplay.style.marginTop = "8px";
      tokenDisplay.style.color = "#333";
      tokenDisplay.style.fontWeight = "bold";
      jobElement.appendChild(tokenDisplay);
    }
    tokenDisplay.textContent = `🪙 Tokens for this job: ${totalTokens}`;
    updateTotalTokens();
  }

  function updateTotalTokens() {
    const allJobTokens = Array.from(document.querySelectorAll(".token-cost"))
      .map(div => parseInt(div.textContent.replace(/\D/g, "")) || 0);
    const total = allJobTokens.reduce((a, b) => a + b, 0);

    let totalDisplay = document.getElementById("totalTokens");
    if (!totalDisplay) {
      totalDisplay = document.createElement("div");
      totalDisplay.id = "totalTokens";
      totalDisplay.style.textAlign = "right";
      totalDisplay.style.marginTop = "15px";
      totalDisplay.style.fontWeight = "bold";
      form.appendChild(totalDisplay);
    }
    totalDisplay.textContent = `💰 Total Tokens Required: ${total}`;
  }

  // =============================
  // Drop Zone Logic
  // =============================
  function initializeDropZone(dropZone) {
    const fileInput = dropZone.querySelector(".drop-zone-input");
    const pageCountSpan = dropZone.closest(".form-group").querySelector(".page-count span");
    const jobElement = dropZone.closest(".print-job");

    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        const file = fileInput.files[0];
        updateDropZone(dropZone, file);
        countPages(file, pageCountSpan).then(() => calculateTokens(jobElement));
      }
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drop-zone--active");
      dropZone.style.borderColor = "#3d2ee7";
      dropZone.style.backgroundColor = "#f0f0ff";
    });

    ["dragleave", "dragend"].forEach((type) => {
      dropZone.addEventListener(type, () => {
        dropZone.classList.remove("drop-zone--active");
        dropZone.style.borderColor = "#a8a8ff";
        dropZone.style.backgroundColor = "#f9f9ff";
      });
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        fileInput.files = e.dataTransfer.files;
        updateDropZone(dropZone, file);
        countPages(file, pageCountSpan).then(() => calculateTokens(jobElement));
      }
      dropZone.classList.remove("drop-zone--active");
    });
  }

  function updateDropZone(dropZone, file) {
    const inputName = "documents";
    dropZone.innerHTML = "";
    const fileDetails = document.createElement("div");
    fileDetails.classList.add("file-details");
    fileDetails.innerHTML = `<p><strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</p>`;
    const input = document.createElement("input");
    input.type = "file";
    input.name = inputName;
    input.className = "drop-zone-input";
    input.required = true;
    input.style.display = "none";
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    dropZone.appendChild(fileDetails);
    dropZone.appendChild(input);
  }

  async function countPages(file, pageCountSpan) {
    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        pageCountSpan.textContent = pdf.numPages;
      } catch (err) {
        console.error("Error counting PDF pages:", err);
        pageCountSpan.textContent = "?";
      }
    } else pageCountSpan.textContent = 1;
  }

  // =============================
  // Add / Remove Print Jobs
  // =============================
  addPrintJobBtn.addEventListener("click", () => {
    jobCount++;
    const newJob = document.createElement("div");
    newJob.className = "print-job";
    newJob.dataset.jobId = jobCount;
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
        <div class="drop-zone">
          <p>Browse File</p>
          <span>Drag & Drop files here</span>
          <input type="file" name="documents" class="drop-zone-input" required />
        </div>
        <div class="page-count" style="margin-top: 8px; color: #666;">Pages: <span>0</span></div>
      </div>

      <div class="form-group">
        <label>Additional Notes:</label>
        <textarea name="notes_${jobCount}" placeholder="Specify printing preferences or remarks..."></textarea>
      </div>
    `;
    printJobs.appendChild(newJob);
    initializeDropZone(newJob.querySelector(".drop-zone"));
  });

  // =============================
  // Token recalculation when settings change
  // =============================
  printJobs.addEventListener("change", (e) => {
    const job = e.target.closest(".print-job");
    if (job) calculateTokens(job);
  });

  // =============================
  // Initialize for first job
  // =============================
  initializeDropZone(document.querySelector(".drop-zone"));

  // =============================
  // Form Submission
  // =============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      alert("Please fill all required fields.");
      return;
    }

    const formData = new FormData(form);
    const printJobsData = [];

document.querySelectorAll(".print-job").forEach((job, i) => {
  const pageCount = parseInt(job.querySelector(".page-count span").textContent) || 0;
  const copies = parseInt(formData.get(`copies_${i + 1}`)) || 1;
  const paperType = formData.get(`paper_type_${i + 1}`) || "Black & White";
  const dropZoneInput = job.querySelector(".drop-zone-input");
  const file = dropZoneInput?.files?.[0];
  const isImagePrint = file && file.type.startsWith("image/");

  // 🧮 Token rules
  let tokensPerPage = 0;
  if (paperType === "Black & White") tokensPerPage = isImagePrint ? 10 : 1;
  else if (paperType === "Colored") tokensPerPage = isImagePrint ? 15 : 10;

  const totalTokens = tokensPerPage * pageCount * copies;

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
    isImagePrint
  });
});


    formData.append("printJobs", JSON.stringify(printJobsData));

    try {
      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      if (res.ok) {
        alert("✅ Print request submitted successfully!");
        location.reload();
      } else {
        alert("❌ Submission failed: " + result.error);
      }
    } catch (err) {
      alert("⚠️ Error submitting form: " + err.message);
    }
  });
});
