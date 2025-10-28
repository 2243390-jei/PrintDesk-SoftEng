document.addEventListener("DOMContentLoaded", () => {
  const orgs = [
    {
      name: "ICON",
      email: "icon@slu.edu.ph",
      school: "SAMCIS",
      programs: "BSIT, BSCS, BMMA",
      image: "/Images/orgs/ICON.jpg",
      status: "Active",
      role: "Organization",
      lastActive: "Oct 10, 2025",
    },
    {
      name: "JPIA",
      email: "jpia@slu.edu.ph",
      school: "SAMCIS",
      programs: "BSBA, BSAC",
      image: "/Images/orgs/JPIA.jpg",
      status: "Inactive",
      role: "Organization",
      lastActive: "Oct 5, 2025",
    },
    {
      name: "RPG",
      email: "rpg@slu.edu.ph",
      school: "SAMCIS",
      programs: "BSIT",
      image: "/Images/orgs/RPG.jpg",
      status: "Active",
      role: "Organization",
      lastActive: "Oct 12, 2025",
    },
    {
      name: "SONA",
      email: "sona@slu.edu.ph",
      school: "SON",
      programs: "BSN",
      image: "/Images/orgs/SONA.jpg",
      status: "Active",
      role: "Organization",
      lastActive: "Oct 14, 2025",
    },
  ];

  const tableBody = document.getElementById("orgTableBody");
  const searchInput = document.getElementById("searchInput");
  const schoolFilter = document.getElementById("schoolFilter");
  const statusFilter = document.getElementById("statusFilter");
  const rowsPerPageSelect = document.getElementById("rowsPerPage");
  const pagination = document.getElementById("pagination");
  const curYear = document.getElementById("curYear");
  const toggleFilters = document.getElementById("toggleFilters");
  const filterSection = document.getElementById("filterSection");

  let filteredOrgs = [...orgs];
  let currentPage = 1;
  let rowsPerPage = parseInt(rowsPerPageSelect.value);

  // Update footer year
  curYear.textContent = new Date().getFullYear();

  function displayOrgs(list) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginated = list.slice(start, end);

    paginated.forEach((org) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox"></td>
        <td><img src="${org.image}" alt="${org.name}" class="org-logo" /></td>
        <td>${org.name}</td>
        <td>${org.email}</td>
        <td>${org.status}</td>
        <td>${org.role}</td>
        <td>${org.school}</td>
        <td>${org.programs}</td>
        <td>${org.lastActive}</td>
        <td>
          <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    updatePagination(list);
  }

  function updatePagination(list) {
    pagination.innerHTML = "";
    const totalPages = Math.ceil(list.length / rowsPerPage);
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "";
      btn.addEventListener("click", () => {
        currentPage = i;
        displayOrgs(filteredOrgs);
      });
      pagination.appendChild(btn);
    }
  }

  function filterAndSearch() {
    const query = searchInput.value.toLowerCase();
    const school = schoolFilter.value;
    const status = statusFilter.value;

    filteredOrgs = orgs.filter((org) => {
      const matchQuery = org.name.toLowerCase().includes(query);
      const matchSchool = school ? org.school === school : true;
      const matchStatus = status ? org.status === status : true;
      return matchQuery && matchSchool && matchStatus;
    });

    currentPage = 1;
    displayOrgs(filteredOrgs);
  }

  // Event listeners
  searchInput.addEventListener("input", filterAndSearch);
  schoolFilter.addEventListener("change", filterAndSearch);
  statusFilter.addEventListener("change", filterAndSearch);
  rowsPerPageSelect.addEventListener("change", (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPage = 1;
    displayOrgs(filteredOrgs);
  });

  // Hide/Show filter section
  toggleFilters.addEventListener("click", () => {
    filterSection.classList.toggle("hidden");
    if (filterSection.classList.contains("hidden")) {
      toggleFilters.innerHTML = '<i class="fa-solid fa-filter"></i> Show Filters';
    } else {
      toggleFilters.innerHTML = '<i class="fa-solid fa-filter"></i> Hide Filters';
    }
  });

  // Initialize
  displayOrgs(filteredOrgs);

  
  const addFilterBtn = document.getElementById('addFilterBtn');
  const extraFilters = document.getElementById('extraFilters');

  // These are the table columns you want to offer as extra filters
  const availableFilters = [
    'Organization',
    'Email',
    'Role',
    'Programs',
    'Last Active'
  ];

  addFilterBtn.addEventListener('click', () => {
    // Create a container for a new filter
    const filterWrap = document.createElement('div');
    filterWrap.className = 'filter-item';

    // Dropdown for selecting which filter type
    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Select filter...';
    defaultOption.value = '';
    select.appendChild(defaultOption);

    // Populate dropdown
    availableFilters.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.toLowerCase().replace(/\s+/g, '-');
      opt.textContent = f;
      select.appendChild(opt);
    });

    // Input for filter value
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter value';

    // Remove filter button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.className = 'remove-filter';
    removeBtn.title = 'Remove filter';

    removeBtn.addEventListener('click', () => filterWrap.remove());

    // Append everything
    filterWrap.appendChild(select);
    filterWrap.appendChild(input);
    filterWrap.appendChild(removeBtn);
    extraFilters.appendChild(filterWrap);
  });
});
