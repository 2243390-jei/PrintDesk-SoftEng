document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample Analytics Data
  // -------------------------
  const analyticsData = {
    today: {
      users: 1247,
      prints: 45,
      leads: 8,
      dailyStats: {
        labels: ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM'],
        users: [15, 28, 42, 35, 22, 18],
        prints: [5, 12, 18, 15, 8, 6],
        leads: [1, 3, 5, 4, 2, 1]
      },
      trends: {
        labels: ['Users', 'Prints', 'Leads'],
        data: [1247, 3845, 156],
        colors: ['#4A90E2', '#10B981', '#8B5CF6']
      }
    },
    week: {
      users: 1247,
      prints: 3845,
      leads: 156,
      dailyStats: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        users: [120, 145, 130, 160, 155, 140, 125],
        prints: [450, 520, 480, 610, 580, 490, 420],
        leads: [12, 18, 15, 22, 20, 16, 14]
      },
      trends: {
        labels: ['Users', 'Prints', 'Leads'],
        data: [1247, 3845, 156],
        colors: ['#4A90E2', '#10B981', '#8B5CF6']
      }
    },
    month: {
      users: 1247,
      prints: 15420,
      leads: 625,
      dailyStats: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        users: [280, 310, 295, 320],
        prints: [3500, 3850, 4000, 3900],
        leads: [145, 160, 155, 165]
      },
      trends: {
        labels: ['Users', 'Prints', 'Leads'],
        data: [1247, 15420, 625],
        colors: ['#4A90E2', '#10B981', '#8B5CF6']
      }
    }
  };

  // -------------------------
  // DOM references
  // -------------------------
  const curYear = document.getElementById("curYear");
  const timeRange = document.getElementById("timeRange");
  const refreshBtn = document.getElementById("refreshBtn");

  // Statistics elements
  const totalUsers = document.getElementById("totalUsers");
  const totalPrints = document.getElementById("totalPrints");
  const totalLeads = document.getElementById("totalLeads");

  // Chart elements
  const chartPeriods = document.querySelectorAll(".chart-period");
  let dailyChart, trendsChart;

  // Current data state
  let currentTimeRange = 'week';
  let currentChartPeriod = 'day';

  // -------------------------
  // Initialize
  // -------------------------
  function initializeAnalytics() {
    // Set current year
    if (curYear) curYear.textContent = new Date().getFullYear();
    
    // Update statistics with initial data
    updateStatistics();
    
    // Initialize charts
    initializeCharts();
    
    // Set up event listeners
    setupEventListeners();
  }

  // -------------------------
  // Update Statistics
  // -------------------------
  function updateStatistics() {
    const data = analyticsData[currentTimeRange];
    
    if (totalUsers) totalUsers.textContent = data.users.toLocaleString();
    if (totalPrints) totalPrints.textContent = data.prints.toLocaleString();
    if (totalLeads) totalLeads.textContent = data.leads.toLocaleString();
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
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
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
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
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
    const data = analyticsData[currentTimeRange].dailyStats;
    
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
    const data = analyticsData[currentTimeRange].trends;
    
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
        updateStatistics();
        updateCharts();
      });
    }

    // Refresh button
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Simulate data refresh
        refreshBtn.style.animation = 'spin 1s linear';
        setTimeout(() => {
          refreshBtn.style.animation = '';
          // In a real app, you would fetch new data here
          console.log('Refreshing analytics data...');
        }, 1000);
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

  // Add spin animation for refresh button
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Expose to global scope for debugging
  window.analyticsData = analyticsData;
});