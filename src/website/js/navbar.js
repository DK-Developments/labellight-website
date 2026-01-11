// Determine the base path based on current page location
const navbarBasePath = window.location.pathname.includes('/docs/') ? '../' : '';

// Load navbar and update based on auth state
fetch(navbarBasePath + 'navbar.html')
  .then(response => response.text())
  .then(html => {
    // Adjust all relative href and src attributes by prepending the base path
    const adjustedHtml = html
      .replace(/href="(?!http|#|\.\.\/)/g, 'href="' + navbarBasePath)
      .replace(/src="(?!http|data:|\.\.\/)/g, 'src="' + navbarBasePath);
    document.getElementById('navbar-container').innerHTML = adjustedHtml;
    updateNavbarAuth();
    initializeProfileDropdown();
  })
  .catch(error => console.error('Error loading navbar:', error));

// Initialize profile dropdown functionality
function initializeProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  const trigger = document.getElementById('profile-dropdown-trigger');
  const logoutBtn = document.getElementById('dropdown-logout-btn');
  
  if (trigger) {
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      dropdown.classList.remove('open');
      handleLogout();
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
  
  // Close dropdown on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && dropdown) {
      dropdown.classList.remove('open');
    }
  });
  
  // Close dropdown when clicking any menu item
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', function() {
      dropdown.classList.remove('open');
      
      // Handle tab navigation
      const tab = this.dataset.tab;
      if (tab) {
        sessionStorage.setItem('profileActiveTab', tab);
      }
    });
  });
}

// Show/hide navbar elements based on auth state
async function updateNavbarAuth() {
  let isLoggedIn = false;
  
  try {
    isLoggedIn = auth.isAuthenticated();
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
  
  const loginBtn = document.getElementById('login-btn');
  const profileDropdown = document.getElementById('profile-dropdown');

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (profileDropdown) {
      profileDropdown.style.display = 'block';
      await loadNavbarUserInfo();
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (profileDropdown) profileDropdown.style.display = 'none';
  }
}

// Load user profile info for navbar dropdown
async function loadNavbarUserInfo() {
  const navbarAvatar = document.getElementById('navbar-avatar');
  const navbarUserName = document.getElementById('navbar-user-name');
  const dropdownDisplayName = document.getElementById('dropdown-display-name');
  const dropdownEmail = document.getElementById('dropdown-email');
  
  try {
    const userInfo = auth.getUserInfo();
    
    if (!userInfo) {
      showNavbarError('Unable to load user info');
      return;
    }
    
    // Use auth token info as base
    let displayName = userInfo.name || userInfo.email?.split('@')[0] || 'Account';
    let email = userInfo.email || '';
    
    // Try to load full profile if getProfile function exists
    if (typeof getProfile === 'function') {
      try {
        const profile = await getProfile();
        if (profile && profile.display_name) {
          displayName = profile.display_name;
        }
      } catch (profileError) {
        console.debug('Profile API not available, using auth info');
      }
    }
    
    const initials = getInitials(displayName);
    
    if (navbarAvatar) navbarAvatar.textContent = initials;
    if (navbarUserName) navbarUserName.textContent = displayName;
    if (dropdownDisplayName) dropdownDisplayName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = email;
    
  } catch (error) {
    console.error('Error loading navbar user info:', error);
    showNavbarError('Error loading account');
  }
}

// Show error state in navbar dropdown
function showNavbarError(message) {
  const navbarAvatar = document.getElementById('navbar-avatar');
  const navbarUserName = document.getElementById('navbar-user-name');
  const dropdownDisplayName = document.getElementById('dropdown-display-name');
  const dropdownEmail = document.getElementById('dropdown-email');
  
  if (navbarAvatar) {
    navbarAvatar.textContent = '!';
    navbarAvatar.classList.add('error');
  }
  if (navbarUserName) navbarUserName.textContent = 'Error';
  if (dropdownDisplayName) dropdownDisplayName.textContent = message;
  if (dropdownEmail) dropdownEmail.textContent = 'Please try refreshing the page';
}

// Get initials from display name
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Handle logout button click
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    auth.logout();
  }
}
