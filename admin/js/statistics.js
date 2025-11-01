document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const curYear = document.getElementById("curYear");
  const timeRange = document.getElementById("timeRange");
  const semesterFilter = document.getElementById("semesterFilter");
  const refreshBtn = document.getElementById("refreshBtn");
  const recentActivityList = document.getElementById("recentActivityList");

  // Statistics elements
  const totalUsers = document.getElementById("totalUsers");
  const totalPrints = document.getElementById("totalPrints");
  const totalLeads = document.getElementById("totalLeads");
  const usersChange = document.getElementById("usersChange");
  const printsChange = document.getElementById("printsChange");
  const leadsChange = document.getElementById("leadsChange");

  // Chart elements
  const chartPeriods = document.querySelectorAll(".chart-period");
  let dailyChart, trendsChart;

  // Current data state
  let currentTimeRange = 'week';
  let currentSemester = 'prelim';
  let currentChartPeriod = 'day';
  let analyticsData = {};
  let recentActivities = [];

  // API endpoints
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  // -------------------------
  // Initialize
  // -------------------------
  async function initializeAnalytics() {
    // Set current year
    if (curYear) curYear.textContent = new Date().getFullYear();
    
    // Fetch initial data from database
    await fetchAnalyticsData();
    
    // Update statistics with initial data
    updateStatistics();
    
    // Update recent activity
    updateRecentActivity();
    
    // Initialize charts
    initializeCharts();
    
    // Set up event listeners
    setupEventListeners();
  }

  // -------------------------
  // Fetch Analytics Data from Database
  // -------------------------
  async function fetchAnalyticsData() {
    try {
      // Fetch all print requests
      const response = await fetch(REQUESTS_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const requests = await response.json();

      // Process data for analytics
      analyticsData = processAnalyticsData(requests);
      
      // Process recent activities
      recentActivities = processRecentActivities(requests);
      
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // Fallback to empty data structure
      analyticsData = createEmptyAnalyticsData();
      recentActivities = [];
    }
  }

  // -------------------------
  // Process Recent Activities
  // -------------------------
  function processRecentActivities(requests) {
    // Sort requests by creation date (newest first)
    const sortedRequests = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Take the 10 most recent requests
    return sortedRequests.slice(0, 10).map(request => {
      const primaryDoc = request.documents && request.documents.length > 0 ? request.documents[0] : null;
      const date = new Date(request.createdAt);
      
      return {
        id: request._id,
        userName: request.fullName,
        userCourse: request.courseYear,
        action: 'submitted print request',
        documentName: primaryDoc ? primaryDoc.documentTitle : 'Unknown Document',
        pageCount: primaryDoc ? primaryDoc.pageCount : 0,
        copies: primaryDoc ? primaryDoc.numberOfCopies : 0,
        timestamp: date,
        timeAgo: getTimeAgo(date),
        status: request.status || 'Pending',
        totalTokens: request.totalTokens || 0
      };
    });
  }

  function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  // -------------------------
  // Update Recent Activity
  // -------------------------
  function updateRecentActivity() {
    if (!recentActivityList) return;
    
    recentActivityList.innerHTML = '';
    
    if (recentActivities.length === 0) {
      recentActivityList.innerHTML = '<div class="no-activity">No recent activity</div>';
      return;
    }
    
    recentActivities.forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <div class="activity-avatar">${activity.userName.split(' ')[0].slice(0,1)}</div>
        <div class="activity-content">
          <div class="activity-text">
            <strong>${activity.userName}</strong> ${activity.action}
            <span class="document-name">"${activity.documentName}"</span>
          </div>
          <div class="activity-details">
            ${activity.pageCount} pages • ${activity.copies} copies • ${activity.totalTokens} tokens
            <span class="activity-status status-${activity.status.toLowerCase()}">${activity.status}</span>
          </div>
          <div class="activity-time">${activity.timeAgo}</div>
        </div>
      `;
      recentActivityList.appendChild(activityItem);
    });
  }

  // -------------------------
  // Process Analytics Data from Database
  // -------------------------
  function processAnalyticsData(requests) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize data structure
    const data = {
      today: initializeTimePeriod(),
      week: initializeTimePeriod(),
      month: initializeTimePeriod(),
      semester: {
        prelim: initializeTimePeriod(),
        midterm: initializeTimePeriod(),
        finals: initializeTimePeriod()
      }
    };

    // Process each request
    requests.forEach(request => {
      const requestDate = new Date(request.createdAt);
      const totalPages = request.documents.reduce((sum, doc) => sum + (doc.pageCount * doc.numberOfCopies), 0);
      
      // Categorize by time period
      categorizeRequest(data, request, requestDate, totalPages, today, oneWeekAgo, oneMonthAgo);
      
      // Categorize by semester
      categorizeBySemester(data, request, requestDate, totalPages);
    });

    // Calculate trends and format data
    return formatAnalyticsData(data);
  }

  function initializeTimePeriod() {
    return {
      users: new Set(),
      prints: 0,
      leads: 0,
      dailyStats: {
        labels: [],
        users: [],
        prints: [],
        leads: []
      }
    };
  }

  function categorizeRequest(data, request, requestDate, totalPages, today, oneWeekAgo, oneMonthAgo) {
    // Today
    if (requestDate >= today) {
      updateTimePeriod(data.today, request, totalPages, requestDate);
    }
    
    // This week
    if (requestDate >= oneWeekAgo) {
      updateTimePeriod(data.week, request, totalPages, requestDate);
    }
    
    // This month
    if (requestDate >= oneMonthAgo) {
      updateTimePeriod(data.month, request, totalPages, requestDate);
    }
  }

  function categorizeBySemester(data, request, requestDate, totalPages) {
    const month = requestDate.getMonth() + 1;
    
    // Determine semester period based on month
    let period;
    
    if (month >= 8 && month <= 9) {
      period = 'prelim'; // August to September
    } else if (month >= 10 && month <= 11) {
      period = 'midterm'; // October to November
    } else if (month === 12 || (month >= 1 && month <= 1)) {
      period = 'finals'; // December to January (adjust as needed)
    }
    
    if (period) {
      updateTimePeriod(data.semester[period], request, totalPages, requestDate);
    }
  }

  function updateTimePeriod(period, request, totalPages, requestDate) {
    // Count unique users (by email)
    period.users.add(request.email);
    
    // Count total prints (pages × copies)
    period.prints += totalPages;
    
    // Count leads (each request is a lead)
    period.leads++;
    
    // Update daily/weekly stats
    updateTimeSeriesStats(period, requestDate, totalPages);
  }

  function updateTimeSeriesStats(period, date, pages) {
    const dayKey = date.toLocaleDateString();
    
    if (!period.dailyStats.labels.includes(dayKey)) {
      period.dailyStats.labels.push(dayKey);
      period.dailyStats.users.push(1);
      period.dailyStats.prints.push(pages);
      period.dailyStats.leads.push(1);
    } else {
      const index = period.dailyStats.labels.indexOf(dayKey);
      period.dailyStats.users[index]++;
      period.dailyStats.prints[index] += pages;
      period.dailyStats.leads[index]++;
    }
  }

  function formatAnalyticsData(data) {
    const formatted = {
      today: formatTimePeriod(data.today),
      week: formatTimePeriod(data.week),
      month: formatTimePeriod(data.month),
      semester: {
        prelim: formatTimePeriod(data.semester.prelim),
        midterm: formatTimePeriod(data.semester.midterm),
        finals: formatTimePeriod(data.semester.finals)
      }
    };

    // Add trend data
    Object.keys(formatted).forEach(key => {
      if (key === 'semester') {
        Object.keys(formatted.semester).forEach(sem => {
          formatted.semester[sem].trends = createTrendData(formatted.semester[sem]);
        });
      } else {
        formatted[key].trends = createTrendData(formatted[key]);
      }
    });

    return formatted;
  }

  function formatTimePeriod(period) {
    return {
      users: period.users.size,
      prints: period.prints,
      leads: period.leads,
      dailyStats: {
        labels: period.dailyStats.labels.slice(-7), // Last 7 entries
        users: period.dailyStats.users.slice(-7),
        prints: period.dailyStats.prints.slice(-7),
        leads: period.dailyStats.leads.slice(-7)
      }
    };
  }

  function createTrendData(period) {
    return {
      labels: ['Users', 'Prints', 'Leads'],
      data: [period.users, period.prints, period.leads],
      colors: ['#4A90E2', '#10B981', '#8B5CF6']
    };
  }

  function createEmptyAnalyticsData() {
    return {
      today: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } },
      week: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } },
      month: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } },
      semester: {
        prelim: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } },
        midterm: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } },
        finals: { users: 0, prints: 0, leads: 0, dailyStats: { labels: [], users: [], prints: [], leads: [] }, trends: { labels: [], data: [], colors: [] } }
      }
    };
  }

  // -------------------------
  // Update Statistics
  // -------------------------
  function updateStatistics() {
    let data;
    
    if (currentTimeRange === 'semester') {
      data = analyticsData.semester[currentSemester];
    } else {
      data = analyticsData[currentTimeRange];
    }
    
    if (totalUsers) totalUsers.textContent = data.users.toLocaleString();
    if (totalPrints) totalPrints.textContent = data.prints.toLocaleString();
    if (totalLeads) totalLeads.textContent = data.leads.toLocaleString();
    
    // Update percentage changes
    updatePercentageChanges();
  }

  // -------------------------
  // Update Percentage Changes
  // -------------------------
  function updatePercentageChanges() {
    const changes = calculatePercentageChanges();
    
    if (usersChange) usersChange.textContent = changes[0];
    if (printsChange) printsChange.textContent = changes[1];
    if (leadsChange) leadsChange.textContent = changes[2];
  }

  function calculatePercentageChanges() {
    // Simplified percentage calculation based on current time range
    const baseChanges = {
      today: ['+12% from yesterday', '+8% from yesterday', '+15% from yesterday'],
      week: ['+5% from last week', '+12% from last week', '+8% from last week'],
      month: ['+18% from last month', '+22% from last month', '+25% from last month'],
      semester: ['+8% from last period', '+15% from last period', '+12% from last period']
    };
    
    return baseChanges[currentTimeRange] || ['+0%', '+0%', '+0%'];
  }

  // -------------------------
  // Toggle Semester Filter
  // -------------------------
  function toggleSemesterFilter(show) {
    if (semesterFilter) {
      semesterFilter.style.display = show ? 'block' : 'none';
    }
  }

  // -------------------------
  // Initialize Charts
  // -------------------------
  function initializeCharts() {
    // Daily Overview Chart
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    dailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: getDailyChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'white'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: 'white'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: 'white'
            }
          }
        }
      }
    });

    // Trends Chart
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    trendsChart = new Chart(trendsCtx, {
      type: 'bar',
      data: getTrendsChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: 'white'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: 'white'
            }
          }
        }
      }
    });
  }

  // -------------------------
  // Chart Data Helpers
  // -------------------------
  function getDailyChartData() {
    let data;
    
    if (currentTimeRange === 'semester') {
      data = analyticsData.semester[currentSemester].dailyStats;
    } else {
      data = analyticsData[currentTimeRange].dailyStats;
    }
    
    // If no data, create empty dataset
    if (data.labels.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Users',
            data: [0],
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
    }
    
    return {
      labels: data.labels,
      datasets: [
        {
          label: 'Users',
          data: data.users,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Prints',
          data: data.prints,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Leads',
          data: data.leads,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }

  function getTrendsChartData() {
    let data;
    
    if (currentTimeRange === 'semester') {
      data = analyticsData.semester[currentSemester].trends;
    } else {
      data = analyticsData[currentTimeRange].trends;
    }
    
    return {
      labels: data.labels,
      datasets: [{
        data: data.data,
        backgroundColor: data.colors,
        borderWidth: 0,
        borderRadius: 4
      }]
    };
  }

  // -------------------------
  // Update Charts
  // -------------------------
  function updateCharts() {
    dailyChart.data = getDailyChartData();
    dailyChart.update();
    
    trendsChart.data = getTrendsChartData();
    trendsChart.update();
  }

  // -------------------------
  // Event Listeners
  // -------------------------
  function setupEventListeners() {
    // Time range filter
    if (timeRange) {
      timeRange.addEventListener('change', (e) => {
        currentTimeRange = e.target.value;
        
        // Show/hide semester filter based on selection
        toggleSemesterFilter(currentTimeRange === 'semester');
        
        updateStatistics();
        updateCharts();
      });
    }

    // Semester filter
    if (semesterFilter) {
      semesterFilter.addEventListener('change', (e) => {
        currentSemester = e.target.value;
        updateStatistics();
        updateCharts();
      });
    }

    // Refresh button
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        // Refresh data from database
        refreshBtn.style.animation = 'spin 1s linear';
        try {
          await fetchAnalyticsData();
          updateStatistics();
          updateRecentActivity();
          updateCharts();
          console.log('Analytics data refreshed from database');
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setTimeout(() => {
            refreshBtn.style.animation = '';
          }, 1000);
        }
      });
    }

    // Chart period buttons
    chartPeriods.forEach(button => {
      button.addEventListener('click', (e) => {
        // Remove active class from all buttons
        chartPeriods.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        e.target.classList.add('active');
        currentChartPeriod = e.target.dataset.period;
        
        // Update chart data based on period
        updateChartForPeriod(currentChartPeriod);
      });
    });
  }

  // -------------------------
  // Update Chart for Period
  // -------------------------
  function updateChartForPeriod(period) {
    // In a real application, you would fetch different data based on the period
    console.log('Updating chart for period:', period);
    
    // For demo purposes, we'll just update the existing data
    updateCharts();
  }

  // -------------------------
  // Initialize the dashboard
  // -------------------------
  initializeAnalytics();
});