document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("printForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Stop the default GET form submission

    const formData = new FormData(form);

    try {
      console.log("📤 Sending form data to backend...");

      const res = await fetch("http://localhost:3000/submit", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      console.log("✅ Server response:", result);

      document.getElementById("statusMessage").innerText =
        result.message || result.error;
    } catch (err) {
      console.error("❌ Error:", err);
      document.getElementById("statusMessage").innerText =
        "❌ Error submitting form";
    }
  });
});