document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // DOM references
  // -------------------------
  const curYear = document.getElementById("curYear");
  const refreshBtn = document.getElementById("refreshBtn");
  const recentActivityList = document.getElementById("recentActivityList");
  const totalUsers = document.getElementById("totalUsers");
  const totalPrints = document.getElementById("totalPrints");
  const totalLeads = document.getElementById("totalLeads");
  const usersChange = document.getElementById("usersChange");
  const printsChange = document.getElementById("printsChange");
  const leadsChange = document.getElementById("leadsChange");
  const statsContent = document.getElementById("statsContent");

  // filters UI
  const semesterSelect = document.getElementById('semesterSelect');
  const termSelect = document.getElementById('termSelect');
  const timeRangeSelect = document.getElementById('timeRangeSelect');
  const activeFilterLabel = document.getElementById('activeFilterLabel');

  // Charts state
  let analyticsData = { daily: null, trends: null };
  let lastFetchedRequests = [];     // raw requests for client-side filtering
  let currentSemester = 'All';
  let currentTerm = 'All';
  let currentTimeRange = 'All';
  const API_BASE = "http://localhost:3000";
  const REQUESTS_ENDPOINT = `${API_BASE}/requests`;

  // Modal elements
  const logoutModal = document.getElementById('logoutModal');
  const cancelLogout = document.getElementById('cancelLogout');
  const confirmLogout = document.getElementById('confirmLogout');

  // init
  if (curYear) curYear.textContent = new Date().getFullYear();
  initialize();

  // -------------------------
  // Initialize everything
  // -------------------------
  async function initialize() {
    await fetchAnalyticsData();
    setupEventListeners();
    initializeCharts();
    updateCharts();
    await fetchQueueCount();
    buildSemesterOptions();
    buildTermOptions();
    updateFilterLabel();
  }

  // -------------------------
  // Fetch analytics / requests
  // -------------------------
  async function fetchAnalyticsData() {
    try {
      const res = await fetch(REQUESTS_ENDPOINT);
      if (!res.ok) {
        console.warn('requests fetch failed', res.status);
        analyticsData = createEmptyAnalyticsData();
        updateStatistics();
        updateRecentActivity([]);
        return;
      }
      const data = await res.json();
      lastFetchedRequests = Array.isArray(data) ? data : [];
      buildSemesterOptions();
      buildTermOptions();
      const filtered = applyFilters(lastFetchedRequests);
      processAnalyticsData(filtered);
    } catch (err) {
      console.error('fetchAnalyticsData error', err);
      analyticsData = createEmptyAnalyticsData();
      updateStatistics();
      updateRecentActivity([]);
    }
  }

  // -------------------------
  // Semester / Term derivation & builders - FIXED VERSION
  // -------------------------
  function getSemesterFromDate(date) {
    const month = date.getMonth() + 1; // 1-12
    
    // Semester 1: August (8) to December (12)
    // Semester 2: January (1) to June (6)
    // July (7) can be considered as break or part of Semester 2
    if (month >= 8 && month <= 12) {
      return 'Semester 1';
    } else if (month >= 1 && month <= 7) {
      return 'Semester 2';
    }
    return 'Unknown';
  }

  function getTermFromDate(date) {
    const month = date.getMonth() + 1;
    
    // Semester 1 (Aug-Dec)
    if (month >= 8 && month <= 12) {
      if (month >= 8 && month <= 9) return 'Prelims';
      if (month >= 10 && month <= 11) return 'Midterms';
      if (month === 12) return 'Finals';
    }
    // Semester 2 (Jan-Jun)
    else if (month >= 1 && month <= 6) {
      if (month >= 1 && month <= 2) return 'Prelims';
      if (month >= 3 && month <= 4) return 'Midterms';
      if (month >= 5 && month <= 6) return 'Finals';
    }
    // July (7) - treat as Finals or break
    return 'Finals';
  }

  function deriveSemesterLabel(req) {
    if (!req) return 'Unknown';
    
    // First check if semester is explicitly defined in request
    if (req.semester) {
      return String(req.semester).includes('1') ? 'Semester 1' : 
             String(req.semester).includes('2') ? 'Semester 2' : 
             String(req.semester);
    }
    if (req.details && req.details.semester) {
      return String(req.details.semester).includes('1') ? 'Semester 1' : 
             String(req.details.semester).includes('2') ? 'Semester 2' : 
             String(req.details.semester);
    }
    
    // Derive from date
    const requestDate = req.createdAt ? new Date(req.createdAt) : new Date();
    return getSemesterFromDate(requestDate);
  }

  function deriveTermLabel(req) {
    if (!req) return 'Unknown';
    
    // First check if term is explicitly defined in request
    if (req.term) return String(req.term);
    if (req.details && req.details.term) return String(req.details.term);

    // Derive from date
    const requestDate = req.createdAt ? new Date(req.createdAt) : new Date();
    return getTermFromDate(requestDate);
  }

  function buildSemesterOptions() {
    if (!semesterSelect) return;
    
    // Predefined semesters - don't derive from data
    const semesters = ['All', 'Semester 1', 'Semester 2'];
    
    semesterSelect.innerHTML = '';
    semesters.forEach(semester => {
      const opt = document.createElement('option');
      opt.value = semester;
      opt.textContent = semester;
      semesterSelect.appendChild(opt);
    });
    
    // Set current selection
    semesterSelect.value = currentSemester || 'All';
  }

  function buildTermOptions() {
    if (!termSelect) return;
    
    // Predefined terms
    const allTerms = ['All', 'Prelims', 'Midterms', 'Finals'];
    
    termSelect.innerHTML = '';
    allTerms.forEach(term => {
      const opt = document.createElement('option');
      opt.value = term;
      opt.textContent = term;
      termSelect.appendChild(opt);
    });
    
    // Set current selection
    termSelect.value = currentTerm || 'All';
  }

  function applyFilters(requests) {
    let out = requests.slice();
    
    // Filter by semester
    if (currentSemester && currentSemester !== 'All') {
      out = out.filter(r => {
        const requestSemester = deriveSemesterLabel(r);
        return requestSemester === currentSemester;
      });
    }
    
    // Filter by term
    if (currentTerm && currentTerm !== 'All') {
      out = out.filter(r => {
        const requestTerm = deriveTermLabel(r);
        return requestTerm === currentTerm;
      });
    }

    // Filter by time range (This Week / This Month / All)
    if (currentTimeRange && currentTimeRange !== 'All') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let startDate = new Date();
      
      if (currentTimeRange === 'This Week') {
        // Start of current week (Monday)
        startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1));
        startDate.setHours(0, 0, 0, 0);
      } else if (currentTimeRange === 'This Month') {
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      }
      
      out = out.filter(r => {
        const reqDate = new Date(r.createdAt);
        return reqDate >= startDate && reqDate <= now;
      });
    }
    
    return out;
  }

  function updateFilterLabel() {
    if (!activeFilterLabel) return;
    const sem = currentSemester || 'All';
    const term = currentTerm || 'All';
    const time = currentTimeRange || 'All';
    activeFilterLabel.textContent = `Showing: ${sem} / ${term} / ${time}`;
  }

  // -------------------------
  // Process analytics uses the passed-in (already filtered) requests
  // -------------------------
  function processAnalyticsData(requests) {
    // recent activities (most recent 8)
    const recent = requests
      .slice()
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
    updateRecentActivity(recent);

    // Determine chart period based on time range
    let days = [];
    let dayFullDates = []; // Store full dates for tooltip
    const now = new Date();
    let chartTitle = 'Overview';
    
    if (currentTimeRange === 'This Week') {
      chartTitle = 'This Week Overview';
      // Last 7 days (or current week)
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(formatDayLabelShort(d)); // short label (just day number)
        dayFullDates.push(formatDayLabel(d)); // full label for tooltip
      }
    } else if (currentTimeRange === 'This Month') {
      chartTitle = 'This Month Overview';
      // Days in current month (1 to current day or end of month)
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        days.push(String(i)); // just day number (1, 2, 3, ... 30/31)
        dayFullDates.push(formatDayLabel(d)); // full date for tooltip
      }
    } else {
      // All: use all semesters (show by month number)
      chartTitle = 'Semester Overview';
      // Show month labels (1-12)
      for (let m = 1; m <= 12; m++) {
        days.push(String(m)); // just month number
        dayFullDates.push(`Month ${m}`); // label for tooltip
      }
    }

    const dayTotals = days.map(() => 0);
    const dayUsers = days.map(() => 0);
    // map date->index
    const dayIndex = {};
    days.forEach((lbl, i) => dayIndex[i] = i);

    // trends: counts by status
    const statusCounts = {};
    requests.forEach(r => {
      const created = new Date(r.createdAt);
      let idx = -1;

      if (currentTimeRange === 'This Week') {
        // Match by M/D
        const createdLbl = formatDayLabel(created);
        const matchIdx = dayFullDates.indexOf(createdLbl);
        if (matchIdx >= 0) idx = matchIdx;
      } else if (currentTimeRange === 'This Month') {
        // Match by day of month
        if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) {
          idx = created.getDate() - 1; // 0-indexed
        }
      } else {
        // All: match by month
        idx = created.getMonth(); // 0-indexed (0=Jan, 1=Feb, ..., 11=Dec)
      }

      if (idx >= 0 && idx < dayTotals.length) {
        const pages = (r.documents || []).reduce((s, doc) => s + (doc.pageCount || 0) * (doc.numberOfCopies || 1), 0);
        dayTotals[idx] += pages;
        dayUsers[idx] += 1;
      }

      const st = String(r.status || 'unknown');
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    analyticsData.daily = {
      labels: days,
      fullLabels: dayFullDates, // Store full labels for tooltip
      series: [
        { label: 'Users', data: dayUsers, color: '#4A90E2' },
        { label: 'Prints', data: dayTotals, color: '#10B981' }
      ],
      title: chartTitle
    };

    analyticsData.trends = {
      labels: Object.keys(statusCounts).length ? Object.keys(statusCounts) : ['Pending','Accepted','Completed'],
      data: Object.keys(statusCounts).length ? Object.values(statusCounts) : [0,0,0],
      colors: ['#F59E0B','#10B981','#6EE7B7']
    };

    updateStatistics(requests);
  }

  function createEmptyAnalyticsData() {
    return {
      daily: { labels: ['No Data'], series: [{label:'Users', data:[0], color:'#4A90E2'},{label:'Prints', data:[0], color:'#10B981'}] },
      trends: { labels:['No Data'], data:[0], colors:['#999'] }
    };
  }

  function formatDayLabel(date) {
    const d = new Date(date);
    return `${d.getMonth()+1}/${d.getDate()}`; // M/D label
  }

  function formatDayLabelShort(date) {
    const d = new Date(date);
    return String(d.getDate()); // just day number
  }

  // -------------------------
  // Update the stat cards
  // -------------------------
  function updateStatistics(requests = []) {
    // simple totals
    const totalReq = Array.isArray(requests) ? requests.length : 0;
    const pending = requests.filter(r => String(r.status).toLowerCase() === 'pending').length;
    const accepted = requests.filter(r => String(r.status).toLowerCase() === 'accepted').length;
    
    // Count unique users (by email)
    const uniqueUsers = new Set();
    requests.forEach(r => {
      if (r.email) uniqueUsers.add(r.email);
    });
    
    if (totalUsers) totalUsers.textContent = String(uniqueUsers.size || 0);
    if (totalPrints) totalPrints.textContent = String(requests.reduce((s, r) => s + ((r.documents || []).reduce((a,d)=>(a + (d.pageCount||0)*(d.numberOfCopies||1)),0)), 0) || 0);
    if (totalLeads) totalLeads.textContent = String(accepted || 0);

    // simple percent changes placeholders
    if (usersChange) usersChange.textContent = '';
    if (printsChange) printsChange.textContent = '';
    if (leadsChange) leadsChange.textContent = '';

    // ensure analyticsData has values
    if (!analyticsData.daily) analyticsData = createEmptyAnalyticsData();
  }

  // -------------------------
  // Recent Activity DOM
  // -------------------------
  function updateRecentActivity(requests = []) {
    if (!recentActivityList) return;
    recentActivityList.innerHTML = '';
    if (!requests || requests.length === 0) {
      recentActivityList.innerHTML = `<div class="no-activity">No recent activity</div>`;
      return;
    }
    requests.forEach(r => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      const avatar = document.createElement('div');
      avatar.className = 'activity-avatar';
      avatar.textContent = (r.fullName || r.email || 'U').slice(0,1).toUpperCase();
      const content = document.createElement('div');
      content.className = 'activity-content';
      const name = document.createElement('div');
      name.className = 'activity-text';
      name.textContent = r.fullName || r.email || 'Unknown';
      const details = document.createElement('div');
      details.className = 'activity-details muted';
      details.textContent = `${r.status || 'Pending'} • ${new Date(r.createdAt).toLocaleString()}`;
      content.appendChild(name);
      content.appendChild(details);
      item.appendChild(avatar);
      item.appendChild(content);
      recentActivityList.appendChild(item);
    });
  }

  // -------------------------
  // Charts: initialize, resize, draw, hover
  // -------------------------
  function initializeCharts() {
    // remove existing
    const existing = document.getElementById('chartsContainer');
    if (existing) existing.remove();

    const chartsContainer = document.createElement('div');
    chartsContainer.id = 'chartsContainer';
    chartsContainer.className = 'charts-container';

    // tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.display = 'none';
    tooltip.style.position = 'absolute';
    chartsContainer.appendChild(tooltip);

    // daily
    const dailyCard = document.createElement('div');
    dailyCard.className = 'chart-card';
    const dailyTitle = document.createElement('div');
    dailyTitle.className = 'chart-header';
    dailyTitle.innerHTML = `<h3 id="dailyChartTitle">Overview</h3>`;
    dailyCard.appendChild(dailyTitle);
    const dailyCanvas = document.createElement('canvas');
    dailyCanvas.id = 'dailyChart';
    dailyCard.appendChild(dailyCanvas);
    chartsContainer.appendChild(dailyCard);

    // trends
    const trendsCard = document.createElement('div');
    trendsCard.className = 'chart-card';
    trendsCard.innerHTML = `<div class="chart-header"><h3>Trends</h3></div>`;
    const trendsCanvas = document.createElement('canvas');
    trendsCanvas.id = 'trendsChart';
    trendsCard.appendChild(trendsCanvas);
    chartsContainer.appendChild(trendsCard);

    statsContent.parentNode.insertBefore(chartsContainer, statsContent.nextSibling);

    // responsive canvases
    rescaleCanvases();
    updateCharts();

    attachChartHoverHandlers(document.getElementById('dailyChart'), lineHover, tooltip);
    attachChartHoverHandlers(document.getElementById('trendsChart'), barHover, tooltip);
  }

  function rescaleCanvasToDisplay(canvas) {
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const style = getComputedStyle(canvas);
    const cssHeight = parseFloat(style.height) || 220;
    canvas.width = Math.max(300, Math.floor(width * ratio));
    canvas.height = Math.max(120, Math.floor(cssHeight * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${cssHeight}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function rescaleCanvases() {
    rescaleCanvasToDisplay(document.getElementById('dailyChart'));
    rescaleCanvasToDisplay(document.getElementById('trendsChart'));
  }

  function updateCharts() {
    if (!analyticsData.daily) analyticsData = createEmptyAnalyticsData();
    rescaleCanvases();
    
    // Update daily chart title
    const dailyTitle = document.getElementById('dailyChartTitle');
    if (dailyTitle && analyticsData.daily.title) {
      dailyTitle.textContent = analyticsData.daily.title;
    }
    
    const daily = document.getElementById('dailyChart');
    const trends = document.getElementById('trendsChart');
    if (daily) animateLineChart(daily, analyticsData.daily);
    if (trends) animateBarChart(trends, analyticsData.trends);
  }

  function animateLineChart(canvas, chartData) {
    const ctx = canvas.getContext('2d');
    const padding = 30;
    const w = canvas.clientWidth;
    const h = parseFloat(getComputedStyle(canvas).height);
    const labels = chartData.labels || ['No Data'];
    const series = chartData.series || [];
    const max = Math.max(1, ...series.flatMap(s => s.data || [0]));
    const xStep = (w - padding*2) / Math.max(1, labels.length - 1);
    const yScale = (h - padding*2) / max;

    let animationProgress = 0;
    const animationDuration = 800; // ms
    const startTime = Date.now();

    function drawFrame() {
      const elapsed = Date.now() - startTime;
      animationProgress = Math.min(1, elapsed / animationDuration);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // grid
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (h - padding*2) * (i/4);
        ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
      }

      // Animate series
      series.forEach(seriesItem => {
        const data = seriesItem.data || [];
        
        // Animate line with gradient effect
        ctx.beginPath();
        ctx.strokeStyle = seriesItem.color || '#4A90E2';
        ctx.lineWidth = 2;
        
        data.forEach((val, i) => {
          // Only draw points up to the current animation progress
          const animationIndex = animationProgress * (data.length - 1);
          if (i <= animationIndex) {
            const x = padding + i * xStep;
            const y = h - padding - (val * yScale);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Animate points
        ctx.fillStyle = seriesItem.color || '#4A90E2';
        data.forEach((val, i) => {
          const animationIndex = animationProgress * (data.length - 1);
          if (i <= animationIndex) {
            const x = padding + i * xStep;
            const y = h - padding - (val * yScale);
            
            // Pulse effect on points
            const pointRadius = 3 + Math.sin(animationProgress * Math.PI * 2) * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });

      // x labels (always show)
      ctx.fillStyle = '#333';
      ctx.font = '12px system-ui, Arial';
      ctx.textAlign = 'center';
      labels.forEach((lbl, i) => {
        const x = padding + i * xStep;
        ctx.fillText(lbl, x, h - 6);
      });

      if (animationProgress < 1) {
        requestAnimationFrame(drawFrame);
      }
    }

    drawFrame();
  }

  function animateBarChart(canvas, chartData) {
    const ctx = canvas.getContext('2d');
    const padding = 30;
    const w = canvas.clientWidth;
    const h = parseFloat(getComputedStyle(canvas).height);
    const labels = chartData.labels || ['No Data'];
    const data = chartData.data || [0];
    const colors = chartData.colors || ['#999'];
    const max = Math.max(1, ...data);
    const slot = (w - padding*2) / data.length;
    const barW = slot * 0.6;
    const gap = slot - barW;
    const yScale = (h - padding*2) / max;

    let animationProgress = 0;
    const animationDuration = 800; // ms
    const startTime = Date.now();

    function drawFrame() {
      const elapsed = Date.now() - startTime;
      animationProgress = Math.min(1, elapsed / animationDuration);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // grid
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (h - padding*2) * (i/4);
        ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
      }

      // Animate bars with staggered effect
      data.forEach((val, i) => {
        const x = padding + i * slot + gap/2;
        const barH = val * yScale;
        
        // Stagger animation: each bar starts slightly after the previous
        const staggerDelay = (i / data.length) * 0.3; // 30% of total animation is stagger
        const barAnimProgress = Math.max(0, Math.min(1, (animationProgress - staggerDelay) / (1 - staggerDelay)));
        
        // Ease-out animation (bars grow upward)
        const easeProgress = 1 - Math.pow(1 - barAnimProgress, 3); // cubic ease-out
        const animatedBarH = barH * easeProgress;
        
        const y = h - padding - animatedBarH;
        ctx.fillStyle = colors[i] || '#999';
        ctx.fillRect(x, y, barW, animatedBarH);

        // Show value when bar is mostly visible
        if (barAnimProgress > 0.5) {
          ctx.fillStyle = '#333';
          ctx.font = '12px system-ui, Arial';
          ctx.textAlign = 'center';
          ctx.fillText(String(val), x + barW/2, y - 6);
        }
      });

      // x labels (always show)
      ctx.fillStyle = '#333';
      ctx.font = '12px system-ui, Arial';
      ctx.textAlign = 'center';
      labels.forEach((lbl, i) => {
        const x = padding + i * slot + gap/2;
        ctx.fillText(lbl, x + barW/2, h - 8);
      });

      if (animationProgress < 1) {
        requestAnimationFrame(drawFrame);
      }
    }

    drawFrame();
  }

  // Keep old draw functions for reference (optional - can remove if not needed)
  function drawLineChart(canvas, chartData) {
    // This is now replaced by animateLineChart
    animateLineChart(canvas, chartData);
  }

  function drawBarChart(canvas, chartData) {
    // This is now replaced by animateBarChart
    animateBarChart(canvas, chartData);
  }

  // Hover helpers
  function attachChartHoverHandlers(canvas, hoverFn, tooltipEl) {
    if (!canvas) return;
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const info = hoverFn(canvas, mx, my);
      if (info && info.show) {
        tooltipEl.style.display = 'block';
        tooltipEl.innerHTML = info.html;
        // position tooltip relative to chartsContainer
        const container = canvas.parentElement.parentElement;
        const crect = container.getBoundingClientRect();
        let left = e.clientX - crect.left + 10;
        let top = e.clientY - crect.top + 10;
        if (left + 240 > crect.width) left = crect.width - 250;
        if (top + 120 > crect.height) top = crect.height - 130;
        tooltipEl.style.left = `${left}px`; tooltipEl.style.top = `${top}px`;
      } else {
        tooltipEl.style.display = 'none';
      }
    });
    canvas.addEventListener('mouseleave', () => tooltipEl.style.display = 'none');
  }

  function lineHover(canvas, mx, my) {
    const padding = 30;
    const w = canvas.clientWidth;
    const h = parseFloat(getComputedStyle(canvas).height);
    const data = analyticsData.daily || createEmptyAnalyticsData().daily;
    const labels = data.labels || [];
    const fullLabels = data.fullLabels || labels; // use full labels for display
    const xStep = (w - padding*2) / Math.max(1, labels.length - 1);
    let found = null;
    data.series.forEach(series => {
      (series.data || []).forEach((val,i) => {
        const x = padding + i * xStep;
        const y = h - padding - (val * ((h - padding*2) / Math.max(1, ...data.series.flatMap(s=>s.data))));
        if (Math.abs(mx - x) < 8 && Math.abs(my - y) < 10) {
          found = { label: series.label, value: val, index: i, color: series.color };
        }
      });
    });
    if (found) {
      const displayLabel = fullLabels[found.index] || labels[found.index] || '?';
      return { show: true, html: `<div style="min-width:120px"><strong style="color:${found.color}">${found.label}</strong><div>${displayLabel} — <strong>${found.value}</strong></div></div>`};
    }
    return { show: false };
  }

  function barHover(canvas, mx, my) {
    const padding = 30;
    const w = canvas.clientWidth;
    const h = parseFloat(getComputedStyle(canvas).height);
    const data = analyticsData.trends || createEmptyAnalyticsData().trends;
    const labels = data.labels || [];
    const vals = data.data || [];
    const max = Math.max(1, ...vals);
    const slot = (w - padding*2) / vals.length;
    const barW = slot * 0.6;
    const gap = slot - barW;
    const yScale = (h - padding*2) / max;
    for (let i=0;i<vals.length;i++){
      const x = padding + i * slot + gap/2;
      const barH = vals[i] * yScale;
      const y = h - padding - barH;
      if (mx >= x && mx <= x + barW && my >= y && my <= h - padding) {
        return { show: true, html: `<div style="min-width:140px"><strong style="color:${(data.colors||[])[i]||'#444'}">${labels[i]}</strong><div>Count: <strong>${vals[i]}</strong></div></div>` };
      }
    }
    return { show: false };
  }

  // -------------------------
  // Event listeners & logout + semester select
  // -------------------------
  function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && logoutModal) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(logoutModal);
      });
    }
    // close modal when clicking backdrop(s)
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => closeModal(logoutModal));
    });
    // allow ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal(logoutModal);
    });

    if (cancelLogout) cancelLogout.addEventListener('click', () => closeModal(logoutModal));
    if (confirmLogout) confirmLogout.addEventListener('click', () => {
      closeModal(logoutModal);
      window.location.href = '/index.html';
    });
    if (refreshBtn) refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.style.opacity = '0.6';
      
      try {
        // Re-fetch all data
        await fetchAnalyticsData();
        // Reapply current filters
        const filtered = applyFilters(lastFetchedRequests);
        processAnalyticsData(filtered);
        updateCharts();
        // Update queue count in sidebar
        await fetchQueueCount();
        console.log('Refresh complete');
      } catch (err) {
        console.error('Refresh error:', err);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
      }
    });

    if (semesterSelect) {
      semesterSelect.addEventListener('change', () => {
        currentSemester = semesterSelect.value || 'All';
        updateFilterLabel();
        const filtered = applyFilters(lastFetchedRequests);
        processAnalyticsData(filtered);
        updateCharts();
      });
    }
    if (termSelect) {
      termSelect.addEventListener('change', () => {
        currentTerm = termSelect.value || 'All';
        updateFilterLabel();
        const filtered = applyFilters(lastFetchedRequests);
        processAnalyticsData(filtered);
        updateCharts();
      });
    }
    if (timeRangeSelect) {
      timeRangeSelect.addEventListener('change', () => {
        currentTimeRange = timeRangeSelect.value || 'All';
        updateFilterLabel();
        const filtered = applyFilters(lastFetchedRequests);
        processAnalyticsData(filtered);
        updateCharts();
      });
    }

    window.addEventListener('resize', () => {
      clearTimeout(window._statsResizeTimer);
      window._statsResizeTimer = setTimeout(()=> {
        rescaleCanvases();
        updateCharts();
      }, 120);
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('open');
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden','true');
    modal.classList.remove('open');
  }

  async function fetchQueueCount() {
    try {
      const res = await fetch(REQUESTS_ENDPOINT);
      if (!res.ok) return;
      const data = await res.json();
      const pending = Array.isArray(data) ? data.filter(r => String(r.status).toLowerCase() === 'pending').length : 0;
      const sidebarCount = document.getElementById('sidebarQueueCount');
      if (sidebarCount) {
        sidebarCount.textContent = pending;
        sidebarCount.classList.toggle('has-count', pending > 0);
      }
    } catch (err) {
      console.warn('fetchQueueCount err', err);
    }
  }
});