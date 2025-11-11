(() => {

const API_URL = "http://localhost:3000/requests";
let allRequests = [];
let filteredRequests = [];
let currentUserEmail = sessionStorage.getItem("userEmail") || null;
let currentViewedRequestId = null;

// Helper: fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Ensure DOM elements we need exist (create if not)
function ensureContainers() {
  let submissionList = document.getElementById("submissionList");
  if (!submissionList) {
    submissionList = document.createElement("div");
    submissionList.id = "submissionList";
    submissionList.className = "submission-cards";
    // insert after filter section, if present
    const filterSection = document.querySelector(".history-filter-section");
    if (filterSection && filterSection.parentNode) {
      filterSection.parentNode.insertBefore(submissionList, filterSection.nextSibling);
    } else {
      document.body.appendChild(submissionList);
    }
  }

  // create modal for viewing a request if doesn't exist
  let requestModal = document.getElementById("requestModal");
  if (!requestModal) {
    requestModal = document.createElement("div");
    requestModal.id = "requestModal";
    requestModal.className = "modal";
    requestModal.setAttribute("aria-hidden", "true");
    document.body.appendChild(requestModal);
  }
}

// Initialize page: attach handlers and fetch requests
document.addEventListener("DOMContentLoaded", async () => {
  ensureContainers();
  attachFilterHandlers();
  await initialize();
});

async function initialize() {
  const submissionList = document.getElementById("submissionList");

  if (!currentUserEmail) {
    submissionList.innerHTML = `
      <div class="no-data">
        <img src="../images/student_img/no-data.png" alt="No Data" style="width:120px;margin-bottom:1rem;">
        <p>Please log in to view your print history.</p>
      </div>`;
    return;
  }

  try {
    const resp = await fetchWithTimeout(API_URL);
    const data = await resp.json();
    // data is array of print requests
    allRequests = Array.isArray(data) ? data : [];
    // filter by logged-in email (case-insensitive)
    filteredRequests = allRequests.filter(r => (r.email || "").toLowerCase() === currentUserEmail.toLowerCase());
    renderCards(filteredRequests);
  } catch (err) {
    submissionList.innerHTML = `<div class="error-message"><p>Error loading requests: ${err.message}</p></div>`;
    console.error("history init error:", err);
  }
}

// Render request cards into #submissionList
function renderCards(requests) {
  const submissionList = document.getElementById("submissionList");
  if (!submissionList) return;

  if (!requests || requests.length === 0) {
    submissionList.innerHTML = `
      <div class="no-data">
        <img src="../images/student_img/no-data.png" alt="No Data" style="width:120px;margin-bottom:1rem;">
        <p>No print requests found</p>
      </div>`;
    return;
  }

  submissionList.innerHTML = "";
  requests.forEach(r => {
    const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
    const pickup = r.pickupDateTime ? new Date(r.pickupDateTime).toLocaleString() : "-";
    const docsCount = Array.isArray(r.documents) ? r.documents.length : 0;
    const status = r.status || "Pending";

    const card = document.createElement("div");
    card.className = "submission-card";

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
            <span class="icon-token">Tokens: ${r.totalTokens ?? 0}</span>
            <span class="icon-status">Status: ${status}</span>
          </div>
        </div>
        <div class="submission-footer">
          <button class="view-btn" data-id="${r._id}"><span class="icon-eye">View Details</span></button>
        </div>
      </div>
    `;
    submissionList.appendChild(card);
  });
}

// Attach click handlers for "View Details" buttons + modal behavior
document.body.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".view-btn");
  if (viewBtn) {
    const id = viewBtn.dataset.id;
    const req = filteredRequests.find(x => x._id === id);
    if (req) openRequestModal(req);
    return;
  }

  // close modal when clicking overlay
  const modal = document.getElementById("requestModal");
  if (modal && e.target === modal) modal.style.display = "none";

  // delegated close button
  if (e.target.matches(".request-modal-close, .request-modal-close *")) {
    const m = document.getElementById("requestModal");
    if (m) m.style.display = "none";
  }
});

// Build and show the modal for a single request
function openRequestModal(req) {
  currentViewedRequestId = req._id;
  const modal = document.getElementById("requestModal");
  const created = req.createdAt ? new Date(req.createdAt).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "-";
  const pickup = req.pickupDateTime ? new Date(req.pickupDateTime).toLocaleString() : "-";
  const docsHtml = (req.documents || []).map((d, i) => {
    const filename = d.documentTitle || (d.filePath ? d.filePath.split("/").pop() : `Document-${i+1}`);
    const link = d.filePath ? `${d.filePath}` : "#";
    const pages = d.pageCount ?? "-";
    const copies = d.numberOfCopies ?? "-";
    const tpp = d.tokensPerPage ?? "-";
    return `
      <div class="doc-item" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #eef2f6">
        <img src="../images/student_img/history/file_empty.png" alt="Doc" width="36" height="36">
        <div style="flex:1;min-width:0">
          <a class="doc-link" href="${link}" target="_blank" style="display:block;text-decoration:none;color:#1e1362">
            <div class="doc-name">${filename}</div>
          </a>
          <div style="font-size:0.85rem;color:#64748b">Pages: ${pages} • Copies: ${copies} • Tokens/page: ${tpp}</div>
        </div>
        <div style="font-weight:600;color:#1e1362">${d.totalTokens ?? 0} tokens</div>
      </div>
    `;
  }).join("");

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

          <div class="detail-group"><label class="detail-label">Pickup</label><div class="detail-input">${pickup}</div></div>
          <div class="detail-group"><label class="detail-label">Total Tokens</label><div class="detail-input">${req.totalTokens ?? 0}</div></div>
          <div class="detail-group"><label class="detail-label">Number of Documents</label><div class="detail-input">${(req.documents || []).length}</div></div>
        </div>

        <div class="modal-section">
          <h3>Documents</h3>
          ${docsHtml || `<div class="detail-input">No documents attached</div>`}
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary request-modal-close">
            <img src="../images/student_img/history/close_modal.png" alt="Close" width="16" height="16" class="icon">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

// ----------------------
// Filters: status buttons + time range
// ----------------------
function attachFilterHandlers() {
  // Status buttons (delegated)
  const filterContainer = document.querySelector(".filter-buttons");
  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      // toggle active class
      Array.from(filterContainer.querySelectorAll(".filter-btn")).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyStatusAndTimeFilters();
    });
  }

  // Time dropdown
  const timeSelect = document.getElementById("timeFilter");
  if (timeSelect) {
    timeSelect.addEventListener("change", () => applyStatusAndTimeFilters());
  }
}

// Apply both status & time filters to allRequests (and user email filter)
function applyStatusAndTimeFilters() {
  if (!allRequests) return;
  const filterContainer = document.querySelector(".filter-buttons");
  let selectedStatus = "All";
  if (filterContainer) {
    const active = filterContainer.querySelector(".filter-btn.active");
    if (active) selectedStatus = active.textContent.trim();
  }

  const timeSelect = document.getElementById("timeFilter");
  const selectedTime = timeSelect ? timeSelect.value : "";

  // start from requests belonging to current user
  const userRequests = allRequests.filter(r => (r.email || "").toLowerCase() === (currentUserEmail || "").toLowerCase());

  let result = userRequests.slice();

  // status mapping
  if (selectedStatus === "Completed") result = result.filter(r => (r.status || "").toLowerCase() === "completed");
  else if (selectedStatus === "Pending") result = result.filter(r => (r.status || "").toLowerCase() === "pending");
  else if (selectedStatus === "Cancelled") result = result.filter(r => (r.status || "").toLowerCase() === "rejected" || (r.status || "").toLowerCase() === "cancelled");
  // "All Jobs" -> no filtering

  // time filtering
  if (selectedTime && selectedTime !== "") {
    const now = new Date();
    result = result.filter(r => {
      if (!r.createdAt) return false;
      const created = new Date(r.createdAt);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedTime === "This Week") {
        // week starts Monday
        const diff = (created - startOfToday) / (1000 * 60 * 60 * 24);
        // find current weekday index (0 Sunday .. 6 Saturday) convert to Monday-based
        const day = (startOfToday.getDay() + 6) % 7;
        const weekStart = new Date(startOfToday);
        weekStart.setDate(startOfToday.getDate() - day);
        return created >= weekStart && created <= now;
      } else if (selectedTime === "Last Week") {
        const day = (startOfToday.getDay() + 6) % 7;
        const thisWeekStart = new Date(startOfToday); thisWeekStart.setDate(startOfToday.getDate() - day);
        const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart); lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
        return created >= lastWeekStart && created <= lastWeekEnd;
      } else if (selectedTime === "This Month") {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return created >= firstOfMonth && created <= now;
      } else if (selectedTime === "Last Month") {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstOfLastMonth = new Date(firstOfThisMonth); firstOfLastMonth.setMonth(firstOfThisMonth.getMonth() - 1);
        const lastOfLastMonth = new Date(firstOfThisMonth); lastOfLastMonth.setDate(0);
        return created >= firstOfLastMonth && created <= lastOfLastMonth;
      }
      return true;
    });
  }

  filteredRequests = result;
  renderCards(filteredRequests);
}

})();