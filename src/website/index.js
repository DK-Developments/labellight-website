// Index page - Handle OAuth callback

// Handle OAuth callback (tokens in URL)
if (auth.parseTokensFromUrl()) {
  // New login - check if user needs onboarding
  auth.handlePostLoginRedirect();
}
// Otherwise, user stays on the home page (navbar shows login/logout based on auth state)

