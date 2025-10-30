document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printRequestForm");
  const dropZone = document.querySelector(".drop-zone");
  const fileInput = document.querySelector(".drop-zone-input");

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      updateDropZone(dropZone, fileInput.files[0]);
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
      fileInput.files = e.dataTransfer.files;
      updateDropZone(dropZone, e.dataTransfer.files[0]);
    }
    dropZone.classList.remove("drop-zone--active");
  });

  function updateDropZone(dropZone, file) {
    const prompt = dropZone.querySelector("p, span");
    dropZone.innerHTML = "";
    const fileDetails = document.createElement("div");
    fileDetails.classList.add("file-details");
    fileDetails.innerHTML = `
      <p><strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</p>
    `;
    dropZone.appendChild(fileDetails);
  }

  // 🔹 Handle form submission and send to backend
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const isValid = form.checkValidity();
    if (!isValid) {
      alert("Please complete all required fields before submitting.");
      return;
    }

    const formData = new FormData(form);

    try {
      console.log("📤 Sending form data to backend...");

      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      console.log("✅ Server response:", result);

      if (res.ok) {
        alert("✅ Print request submitted successfully!");
      } else {
        alert("❌ " + (result.error || "Failed to submit form."));
      }

      form.reset();
      dropZone.innerHTML = `
        <p>Browse File</p>
        <span>Drag & Drop files here</span>
        <input type="file" name="document" class="drop-zone-input" required />
      `;
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("⚠️ Error submitting form. Please try again.");
    }
  });

  form.addEventListener("reset", (e) => {
    const confirmReset = confirm("Are you sure you want to reset the form?");
    if (!confirmReset) e.preventDefault();
    else {
      dropZone.innerHTML = `
        <p>Browse File</p>
        <span>Drag & Drop files here</span>
        <input type="file" name="document" class="drop-zone-input" required />
      `;
    }
  });
});


// =============================
// Keep the second DOMContentLoaded for other forms
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printForm");
  const statusMessage = document.getElementById("statusMessage");

  if (!form) return; // prevent errors if printForm doesn't exist

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Stop the default form submission

    const formData = new FormData(form);

    try {
      console.log("📤 Sending form data to backend...");

      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      console.log("✅ Server response:", result);

      if (res.ok) {
        statusMessage.textContent = "Your document request has been submitted successfully!";
        statusMessage.style.color = "green";
      } else {
        statusMessage.textContent = (result.error || "Failed to submit form.");
        statusMessage.style.color = "red";
      }

      // 🕒 Optional: Hide message after 5 seconds
      setTimeout(() => {
        statusMessage.textContent = "";
      }, 5000);

    } catch (err) {
      console.error("Error:", err);
      statusMessage.textContent = "Error submitting form. Please try again.";
      statusMessage.style.color = "red";
    }
  });
});
