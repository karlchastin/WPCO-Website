document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = "https://api.worldpeacecontrol.org/v1/dashboard";
  
  // Elements
  const profileName = document.getElementById('profile-name');
  const profileStatus = document.getElementById('profile-status');
  const profileAvatar = document.getElementById('profile-avatar-img');
  const jobBoardGrid = document.getElementById('job-board-grid');
  const historyTableBody = document.getElementById('history-table-body');
  const logoutBtn = document.getElementById('logout-btn');
  const historyModal = document.getElementById('history-modal');
  
  // Get Session ID from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get('session');
  
  if (sessionId) {
    localStorage.setItem('wpco_dashboard_session', sessionId);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    sessionId = localStorage.getItem('wpco_dashboard_session');
  }
  
  if (!sessionId) {
    window.location.href = "https://api.worldpeacecontrol.org/v1/discord/login?redirect=dashboard";
    return;
  }
  
  // Navigation Logic
  const navLinks = document.querySelectorAll('.nav-link[data-target]');
  const views = document.querySelectorAll('.view');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  let historyLoaded = false;

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Remove active class from all links
      navLinks.forEach(nav => nav.classList.remove('active'));
      // Add active to clicked link
      link.classList.add('active');
      
      // Hide all views
      views.forEach(view => view.classList.remove('active'));
      
      // Show target view
      const targetId = link.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
      
      // Update Title
      if (targetId === 'view-operations') {
        pageTitle.textContent = "OPERATIONS";
        pageSubtitle.textContent = "View and apply for active operations";
      } else if (targetId === 'view-history') {
        pageTitle.textContent = "MY HISTORY";
        pageSubtitle.textContent = "Your past operation deployments";
        if (!historyLoaded) {
          loadHistory();
          historyLoaded = true;
        }
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
      profileAvatar.onerror = () => { profileAvatar.src = 'assets/logo.webp'; };
      
      profileStatus.classList.remove('loading');
      if (data.is_verified) {
        profileStatus.textContent = data.rank || "Unknown Rank";
        profileStatus.classList.add('verified');
      } else {
        profileStatus.textContent = "Unverified";
        profileStatus.classList.add('unverified');
      }
    }
  }
  
  // Load Job Board
  async function loadJobBoard() {
    jobBoardGrid.innerHTML = `
      <div class="event-banner skeleton" style="height: 160px;"></div>
      <div class="event-banner skeleton" style="height: 160px;"></div>
      <div class="event-banner skeleton" style="height: 160px;"></div>
    `;
    const data = await fetchAPI('/operations/active');
    
    if (data && data.operations) {
      if (data.operations.length === 0) {
        jobBoardGrid.innerHTML = '<div class="loading-spinner" style="color: var(--text-muted)">No active operations currently. Check back later!</div>';
        return;
      }
      
      jobBoardGrid.innerHTML = '';
      data.operations.forEach(op => {
        const date = new Date(op.start_time).toLocaleString();
        
        let typeColor = 'var(--accent-neon)';
        let typeBorder = 'rgba(58, 134, 255, 0.3)';
        let typeBg = 'rgba(58, 134, 255, 0.15)';
        let typeShadow = 'rgba(58, 134, 255, 0.2)';
        let bgPatternClass = 'standard';
        
        if (op.operation_type.toLowerCase().includes('combat')) {
          typeColor = '#fca5a5';
          typeBorder = 'rgba(239, 68, 68, 0.3)';
          typeBg = 'rgba(239, 68, 68, 0.15)';
          typeShadow = 'rgba(239, 68, 68, 0.2)';
          bgPatternClass = 'combat';
        } else if (op.operation_type.toLowerCase().includes('recon')) {
          typeColor = '#fde047';
          typeBorder = 'rgba(234, 179, 8, 0.3)';
          typeBg = 'rgba(234, 179, 8, 0.15)';
          typeShadow = 'rgba(234, 179, 8, 0.2)';
          bgPatternClass = 'recon';
        }
        
        const card = document.createElement('div');
        card.className = 'event-banner';
        card.innerHTML = `
          <div class="event-bg-pattern ${bgPatternClass}"></div>
          <div class="event-content">
            <span class="event-type-badge" style="color: ${typeColor}; background: ${typeBg}; border: 1px solid ${typeBorder}; box-shadow: 0 0 10px ${typeShadow};">${op.operation_type}</span>
            <h3 class="event-title">${op.operation_name}</h3>
            <p class="event-brief">${op.briefing || "No briefing provided."}</p>
            <div class="event-meta">
              <div class="event-meta-item" title="Host">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${op.host_name}
              </div>
              <div class="event-meta-item" title="Operatives">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                ${op.current_count}/${op.required_count}
              </div>
              <div class="event-meta-item" title="Time Started">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${date}
              </div>
            </div>
            <div class="event-action">
              Deploy
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        `;
        jobBoardGrid.appendChild(card);
      });
    }
  }
  
  // Load History
  async function loadHistory() {
    historyTableBody.innerHTML = `
      <div class="match-row skeleton" style="height: 70px;"></div>
      <div class="match-row skeleton" style="height: 70px;"></div>
      <div class="match-row skeleton" style="height: 70px;"></div>
      <div class="match-row skeleton" style="height: 70px;"></div>
    `;
    const data = await fetchAPI('/operations/history');
    
    if (data && data.history) {
      if (data.history.length === 0) {
        historyTableBody.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No matches in history.</div>';
        return;
      }
      
      historyTableBody.innerHTML = '';
      data.history.forEach(op => {
        const date = new Date(op.end_time).toLocaleString();
        
        let typeClass = 'standard';
        if (op.operation_type.toLowerCase().includes('combat')) typeClass = 'combat';
        else if (op.operation_type.toLowerCase().includes('recon')) typeClass = 'recon';
        
        const row = document.createElement('div');
        row.className = `match-row ${typeClass}`;
        row.innerHTML = `
          <div class="match-info">
            <span class="match-title">${op.operation_name}</span>
            <span class="match-type">${op.operation_type}</span>
          </div>
          <div class="match-stats">
            <span class="match-label">Host</span>
            <span class="match-host">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              ${op.host_name}
            </span>
          </div>
          <div class="match-time">
            <span class="match-date">${date}</span>
            <span class="match-status">Concluded</span>
          </div>
        `;
        historyTableBody.appendChild(row);
      });
    }
  }
  
  // Initialization
  loadUser();
  loadJobBoard(); // Default view
});
