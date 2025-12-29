// Home page - Authenticated area

// Check if user is authenticated
requireAuth();

// Load and display user profile
loadUserProfile();

async function loadUserProfile() {
  try {
    const profile = await getProfile();
    
    if (!profile) {
      // No profile found, redirect to onboarding
      window.location.href = 'onboarding.html';
      return;
    }
    
    // Display user's name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = profile.display_name;
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    // Show default message on error
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = 'there';
    }
  }
}

