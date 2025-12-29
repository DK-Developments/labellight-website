// Load navbar and update based on auth state
fetch('navbar.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;
    updateNavbarAuth();
  })
  .catch(error => console.error('Error loading navbar:', error));

// Show/hide navbar elements based on auth state
async function updateNavbarAuth() {
  const isLoggedIn = auth.isAuthenticated();
  
  const loginBtn = document.querySelector('.login-btn');
  const logoutBtn = document.querySelector('.logout-btn');
  const userName = document.getElementById('user-display-name');

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (userName) {
      userName.style.display = 'block';
      await loadNavbarUserInfo();
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userName) userName.style.display = 'none';
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
