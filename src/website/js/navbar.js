// Determine the base path based on current page location
const navbarBasePath = window.location.pathname.includes('/docs/') ? '../' : '';
const isInDocs = window.location.pathname.includes('/docs/');

// Load navbar and update based on auth state
fetch(navbarBasePath + 'navbar.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;
    fixNavbarLinks();
    updateNavbarAuth();
  })
  .catch(error => console.error('Error loading navbar:', error));

// Fix navbar links based on current page location
function fixNavbarLinks() {
  if (isInDocs) {
    // When in docs folder, adjust relative links
    const navLinks = document.querySelectorAll('.navbar a.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === 'docs/index.html') {
        // Already in docs, just go to index.html
        link.setAttribute('href', 'index.html');
      } else if (href && !href.startsWith('../') && !href.startsWith('http')) {
        // Add ../ prefix for links to root-level pages
        link.setAttribute('href', '../' + href);
      }
    });
    // Fix profile link too
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
      const href = profileLink.getAttribute('href');
      if (href && !href.startsWith('../') && !href.startsWith('http')) {
        profileLink.setAttribute('href', '../' + href);
      }
    }
  }
}

// Show/hide navbar elements based on auth state
async function updateNavbarAuth() {
  let isLoggedIn = false;
  
  try {
    isLoggedIn = auth.isAuthenticated();
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
  
  const loginBtn = document.querySelector('.login-btn');
  const logoutBtn = document.querySelector('.logout-btn');
  const userName = document.getElementById('user-display-name');
  const profileLink = document.getElementById('profile-link');

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (userName) {
      userName.style.display = 'block';
      await loadNavbarUserInfo();
    }
    if (profileLink) profileLink.style.display = 'block';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userName) userName.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
  }
}

// Load user profile info for navbar
async function loadNavbarUserInfo() {
  try {
    const profile = await getProfile();
    const displayNameElement = document.getElementById('user-display-name');
    if (displayNameElement && profile) {
      displayNameElement.textContent = profile.display_name;
    }
  } catch (error) {
    console.error('Error loading navbar user info:', error);
  }
}

// Handle logout button click
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    auth.logout();
  }
}
