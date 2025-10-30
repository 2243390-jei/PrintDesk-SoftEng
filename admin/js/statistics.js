document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Sample Analytics Data with Term Data
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
        data: [1247, 45, 8],
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
    },
    term: {
      prelim: {
        users: 1250,
        prints: 5200,
        leads: 280,
        dailyStats: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
          users: [180, 220, 250, 280, 320],
          prints: [800, 950, 1100, 1250, 1100],
          leads: [40, 55, 65, 70, 50]
        },
        trends: {
          labels: ['Users', 'Prints', 'Leads'],
          data: [1250, 5200, 280],
          colors: ['#4A90E2', '#10B981', '#8B5CF6']
        }
      },
      midterm: {
        users: 1350,
        prints: 6800,
        leads: 320,
        dailyStats: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
          users: [220, 250, 280, 300, 300],
          prints: [1100, 1300, 1450, 1550, 1400],
          leads: [55, 65, 75, 80, 45]
        },
        trends: {
          labels: ['Users', 'Prints', 'Leads'],
          data: [1350, 6800, 320],
          colors: ['#4A90E2', '#10B981', '#8B5CF6']
        }
      },
      finals: {
        users: 1450,
        prints: 8200,
        leads: 380,
        dailyStats: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
          users: [250, 280, 320, 350, 250],
          prints: [1400, 1600, 1800, 2000, 1400],
          leads: [65, 80, 95, 105, 35]
        },
        trends: {
          labels: ['Users', 'Prints', 'Leads'],
          data: [1450, 8200, 380],
          colors: ['#4A90E2', '#10B981', '#8B5CF6']
        }
      }
    }
  };

  // -------------------------
  // DOM references
  // -------------------------
  const curYear = document.getElementById("curYear");
  const timeRange = document.getElementById("timeRange");
  const termFilter = document.getElementById("termFilter");
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
  let currentTerm = 'prelim';
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
    let data;
    
    if (currentTimeRange === 'term') {
      data = analyticsData.term[currentTerm];
    } else {
      data = analyticsData[currentTimeRange];
    }
    
    if (totalUsers) totalUsers.textContent = data.users.toLocaleString();
    if (totalPrints) totalPrints.textContent = data.prints.toLocaleString();
    if (totalLeads) totalLeads.textContent = data.leads.toLocaleString();
    
    // Update percentage changes based on time range
    updatePercentageChanges();
  }

  // -------------------------
  // Update Percentage Changes
  // -------------------------
  function updatePercentageChanges() {
    const changeElements = document.querySelectorAll('.stat-change');
    
    // Simulate different percentage changes based on time range
    const changes = {
      today: ['+12%', '+8%', '+15%'],
      week: ['+5%', '+12%', '+8%'],
      month: ['+18%', '+22%', '+25%'],
      term: ['+8%', '+15%', '+12%']
    };
    
    changeElements.forEach((element, index) => {
      let changeText = changes[currentTimeRange][index];
      
      if (currentTimeRange === 'term') {
        // For term, show comparison with previous term
        const termChanges = {
          prelim: ['New term', 'New term', 'New term'],
          midterm: ['+8% from Prelim', '+31% from Prelim', '+14% from Prelim'],
          finals: ['+7% from Midterm', '+21% from Midterm', '+19% from Midterm']
        };
        changeText = termChanges[currentTerm][index];
      } else {
        changeText += ` from last ${getPreviousTimeRange()}`;
      }
      
      element.textContent = changeText;
    });
  }

  function getPreviousTimeRange() {
    switch(currentTimeRange) {
      case 'today': return 'day';
      case 'week': return 'week';
      case 'month': return 'month';
      default: return 'period';
    }
  }

  // -------------------------
  // Toggle Term Filter
  // -------------------------
  function toggleTermFilter(show) {
    if (termFilter) {
      termFilter.style.display = show ? 'block' : 'none';
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
    let data;
    
    if (currentTimeRange === 'term') {
      data = analyticsData.term[currentTerm].dailyStats;
    } else {
      data = analyticsData[currentTimeRange].dailyStats;
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
    
    if (currentTimeRange === 'term') {
      data = analyticsData.term[currentTerm].trends;
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
        
        // Show/hide term filter based on selection
        toggleTermFilter(currentTimeRange === 'term');
        
        updateStatistics();
        updateCharts();
      });
    }

    // Term filter
    if (termFilter) {
      termFilter.addEventListener('change', (e) => {
        currentTerm = e.target.value;
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