// Index page - Handle login and routing

// Handle OAuth callback (tokens in URL)
if (auth.parseTokensFromUrl()) {
  // New login - check if user needs onboarding
  auth.handlePostLoginRedirect();
}
// Check if user is already logged in
else if (auth.isAuthenticated()) {
  // Returning user - check if they have a profile
  auth.handlePostLoginRedirect();
}

