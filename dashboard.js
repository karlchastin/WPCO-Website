document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = "https://api.worldpeacecontrol.org/v1/dashboard";
  
  // Elements
  const profileName = document.getElementById('profile-name');
  const profileStatus = document.getElementById('profile-status');
  const profileAvatar = document.getElementById('profile-avatar-img');
  
  const navLinks = document.querySelectorAll('.nav-links li');
  const views = document.querySelectorAll('.view');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  
  const jobBoardGrid = document.getElementById('job-board-grid');
  const historyTableBody = document.getElementById('history-table-body');
  
  const logoutBtn = document.getElementById('logout-btn');
  
  // Get Session ID from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session');
  
  if (sessionId) {
    localStorage.setItem('wpco_dashboard_session', sessionId);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    sessionId = localStorage.getItem('wpco_dashboard_session');
  }
  
  if (!sessionId) {
    // Redirect to login
    window.location.href = "https://api.worldpeacecontrol.org/v1/discord/login?redirect=dashboard";
    return;
  }
  
  // Setup Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Remove active class from all
      navLinks.forEach(l => l.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      // Add active to clicked
      link.classList.add('active');
      const target = link.getAttribute('data-target');
      document.getElementById(`view-${target}`).classList.add('active');
      
      // Update Headers
      if (target === 'job-board') {
        pageTitle.textContent = "Job Board";
        pageSubtitle.textContent = "View and apply for active operations.";
        loadJobBoard();
      } else if (target === 'history') {
        pageTitle.textContent = "Operations History";
        pageSubtitle.textContent = "Review your past operations.";
        loadHistory();
      }
    });
  });
  
  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('wpco_dashboard_session');
    window.location.href = "/";
  });
  
  // API Fetch Helper
  async function fetchAPI(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      if (response.status === 401) {
        localStorage.removeItem('wpco_dashboard_session');
        window.location.href = "https://api.worldpeacecontrol.org/v1/discord/login?redirect=dashboard";
        return null;
      }
      if (response.status === 403) {
        alert("Access Denied: You do not have permission to view the dashboard at this time.");
        window.location.href = "/";
        return null;
      }
      return await response.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  
  // Load User Data
  async function loadUser() {
    const data = await fetchAPI('/me');
    if (data) {
      profileName.textContent = data.discord_username;
      profileAvatar.src = `https://cdn.discordapp.com/avatars/${data.discord_id}/avatar.webp?size=128`;
      // Avatar might fail if user has no avatar, fallback is handled by discord CDN or we can catch error
      profileAvatar.onerror = () => { profileAvatar.src = 'assets/logo.webp'; };
      
      profileStatus.classList.remove('loading');
      if (data.is_verified) {
        profileStatus.textContent = "Verified";
        profileStatus.classList.add('verified');
      } else {
        profileStatus.textContent = "Unverified";
        profileStatus.classList.add('unverified');
      }
    }
  }
  
  // Load Job Board
  async function loadJobBoard() {
    jobBoardGrid.innerHTML = '<div class="loading-spinner">Loading Operations...</div>';
    const data = await fetchAPI('/operations/active');
    
    if (data && data.operations) {
      if (data.operations.length === 0) {
        jobBoardGrid.innerHTML = '<div class="loading-spinner" style="color: var(--text-muted)">No active operations currently. Check back later!</div>';
        return;
      }
      
      jobBoardGrid.innerHTML = '';
      data.operations.forEach(op => {
        const date = new Date(op.start_time).toLocaleString();
        
        const card = document.createElement('div');
        card.className = 'op-card';
        card.innerHTML = `
          <div class="op-header">
            <h3 class="op-title">${op.operation_name}</h3>
            <span class="op-type">${op.operation_type}</span>
          </div>
          <p class="op-brief">${op.briefing || "No briefing provided."}</p>
          <div class="op-meta">
            <div title="Host">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              ${op.host_name}
            </div>
            <div title="Operatives">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              ${op.current_count}/${op.required_count}
            </div>
            <div title="Time Started">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${date}
            </div>
          </div>
        `;
        jobBoardGrid.appendChild(card);
      });
    }
  }
  
  // Load History
  async function loadHistory() {
    historyTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading History...</td></tr>';
    const data = await fetchAPI('/operations/history');
    
    if (data && data.history) {
      if (data.history.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: var(--text-muted)">You have not participated in any operations yet.</td></tr>';
        return;
      }
      
      historyTableBody.innerHTML = '';
      data.history.forEach(op => {
        const date = new Date(op.end_time).toLocaleString();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${op.operation_name}</strong></td>
          <td><span class="status-badge" style="background: rgba(255,255,255,0.1); border:none">${op.operation_type}</span></td>
          <td>${op.host_name}</td>
          <td>${date}</td>
        `;
        historyTableBody.appendChild(tr);
      });
    }
  }
  
  // Initialization
  loadUser();
  loadJobBoard(); // Default view
});
