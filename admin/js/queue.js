// Queue data object literal
const queueData = [
    {
        id: 1,
        name: "Piamonte, Malech",
        course: "BSIT 3",
        date: "10/10/25",
        details: {
            submittedOn: "October 10, 2025",
            totalCost: "15 tokens",
            status: "Pending",
            requestId: "ROBF2D7B",
            fileName: "Automobile_Anatomy.pdf",
            pageCount: 1,
            numberOfCopies: 1,
            paperSize: "A4",
            printType: "Colored",
            printingSide: "Single-Sided",
            pickupDate: "October 20, 2025"
        }
    },
    {
        id: 2,
        name: "Argao, Jelloyd",
        course: "BSIT 3",
        date: "10/10/25",
        details: {
            submittedOn: "October 10, 2025",
            totalCost: "18 tokens",
            status: "Pending",
            requestId: "RABF207B",
            fileName: "Data_Structures_Assignment.pdf",
            pageCount: 3,
            numberOfCopies: 2,
            paperSize: "Letter",
            printType: "Black & White",
            printingSide: "Double-Sided",
            pickupDate: "October 18, 2025"
        }
    },
    {
        id: 3,
        name: "Aguilan, Jecquar",
        course: "BSIT 3",
        date: "10/10/25",
        details: {
            submittedOn: "October 10, 2025",
            totalCost: "8 tokens",
            status: "Pending",
            requestId: "R45B8D3F",
            fileName: "Web_Development_Project.pdf",
            pageCount: 5,
            numberOfCopies: 1,
            paperSize: "A4",
            printType: "Colored",
            printingSide: "Single-Sided",
            pickupDate: "October 15, 2025"
        }
    }
];

// DOM Elements
const queueTableBody = document.getElementById('queueTableBody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('detailsModal');
const backBtn = document.getElementById('backBtn');
const rejectBtn = document.getElementById('rejectBtn');
const acceptBtn = document.getElementById('acceptBtn');

// Detail elements
const submittedDate = document.getElementById('submittedDate');
const totalCost = document.getElementById('totalCost');
const statusBadge = document.getElementById('statusBadge');
const requestId = document.getElementById('requestId');
const fileName = document.getElementById('fileName');
const pageCount = document.getElementById('pageCount');
const copiesCount = document.getElementById('copiesCount');
const paperSize = document.getElementById('paperSize');
const printType = document.getElementById('printType');
const printingSide = document.getElementById('printingSide');
const pickupDate = document.getElementById('pickupDate');

// Initialize the queue table
function initializeQueueTable() {
    renderQueueTable(queueData);
    
    // Add search functionality
    searchInput.addEventListener('input', searchQueue);
}

// Render queue table with data
function renderQueueTable(data) {
    queueTableBody.innerHTML = '';
    
    if (data.length === 0) {
        queueTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    No queue entries found.
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.course}</td>
            <td>${item.date}</td>
            <td>
                <button class="view-details-btn" data-id="${item.id}">View Details</button>
            </td>
        `;
        queueTableBody.appendChild(row);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            showDetails(id);
        });
    });
}

// Show document details in modal
function showDetails(id) {
    const request = queueData.find(item => item.id === id);
    
    if (request) {
        // Update all detail elements
        submittedDate.textContent = request.details.submittedOn;
        totalCost.textContent = request.details.totalCost;
        statusBadge.textContent = request.details.status;
        statusBadge.className = `status-badge status-${request.details.status.toLowerCase()}`;
        requestId.textContent = request.details.requestId;
        fileName.textContent = request.details.fileName;
        pageCount.textContent = request.details.pageCount;
        copiesCount.textContent = request.details.numberOfCopies;
        paperSize.textContent = request.details.paperSize;
        printType.textContent = request.details.printType;
        printingSide.textContent = request.details.printingSide;
        pickupDate.textContent = request.details.pickupDate;
        
        // Set up action buttons with current request ID
        rejectBtn.setAttribute('data-id', request.id);
        acceptBtn.setAttribute('data-id', request.id);
        
        // Show modal
        modal.style.display = 'block';
    }
}

// Handle back button
backBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

// Handle accept/reject actions
function handleRequest(id, action) {
    const request = queueData.find(item => item.id === id);
    
    if (request) {
        // Update the status
        request.details.status = action === 'Accepted' ? 'Completed' : 'Rejected';
        
        // Show confirmation message
        alert(`Request ${request.details.requestId} has been ${action.toLowerCase()}.`);
        
        // Close the modal
        modal.style.display = 'none';
        
        // Refresh the table to reflect changes
        renderQueueTable(queueData);
    }
}

// Add event listeners to action buttons
rejectBtn.addEventListener('click', function() {
    const requestId = parseInt(this.getAttribute('data-id'));
    handleRequest(requestId, 'Rejected');
});

acceptBtn.addEventListener('click', function() {
    const requestId = parseInt(this.getAttribute('data-id'));
    handleRequest(requestId, 'Accepted');
});

// Search functionality
function searchQueue() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderQueueTable(queueData);
        return;
    }
    
    const filteredData = queueData.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.course.toLowerCase().includes(searchTerm) ||
        item.date.includes(searchTerm)
    );
    
    renderQueueTable(filteredData);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeQueueTable);