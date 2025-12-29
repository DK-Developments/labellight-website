// Load navbar from external file
fetch('navbar.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;
    // After navbar is loaded, populate user info
    loadNavbarUserInfo();
  })
  .catch(error => {
    console.error('Error loading navbar:', error);
  });

// Load user profile info for navbar
async function loadNavbarUserInfo() {
  try {
    const profile = await getProfile();
    
    if (profile) {
      const displayNameElement = document.getElementById('user-display-name');
      if (displayNameElement) {
        displayNameElement.textContent = profile.display_name;
      }
    }
  } catch (error) {
    console.error('Error loading navbar user info:', error);
    const displayNameElement = document.getElementById('user-display-name');
    if (displayNameElement) {
      displayNameElement.textContent = 'User';
    }
  }
}

// Handle logout button click
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    auth.logout();
  }
}

