// Use configuration from config.js
const REDIRECT_URI = window.location.origin + '/callback.html';
const LOGOUT_REDIRECT_URI = window.location.origin + '/index.html';

// Auth helper functions
const auth = {
  // Build Cognito sign in URL with optional identity provider
  getSignInUrl(provider = null) {
    let url = `https://${CONFIG.COGNITO_DOMAIN}/oauth2/authorize?` +
      `client_id=${CONFIG.CLIENT_ID}&` +
      `response_type=token&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    // If provider specified, go directly to that provider
    if (provider) {
      url += `&identity_provider=${encodeURIComponent(provider)}`;
    }
    
    return url;
  },

  // Build Cognito sign up URL
  getSignUpUrl() {
    return `https://${CONFIG.COGNITO_DOMAIN}/signup?` +
      `client_id=${CONFIG.CLIENT_ID}&` +
      `response_type=token&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  },

  // Build Cognito logout URL
  getLogoutUrl() {
    return `https://${CONFIG.COGNITO_DOMAIN}/logout?` +
      `client_id=${CONFIG.CLIENT_ID}&` +
      `logout_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  },

  // Function that checks if there are OAuth tokens in the current page URL. 
  parseTokensFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');
    
    if (idToken && accessToken) {
      this.saveTokens(idToken, accessToken);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
    return false;
  },

  // Save tokens to localStorage
  saveTokens(idToken, accessToken) {
    localStorage.setItem('id_token', idToken);
    localStorage.setItem('access_token', accessToken);
  },

  // Get stored tokens
  getTokens() {
    return {
      idToken: localStorage.getItem('id_token'),
      accessToken: localStorage.getItem('access_token')
    };
  },

  // Check if user is authenticated
  isAuthenticated() {
    const { idToken } = this.getTokens();
    return isTokenValid(idToken);
  },

  // Get user info from token
  getUserInfo() {
    const { idToken } = this.getTokens();
    const payload = decodeJwtToken(idToken);
    
    if (!payload) return null;
    
    return {
      email: payload.email,
      name: payload.name,
      sub: payload.sub
    };
  },

  // Clear tokens and logout
  logout() {
    localStorage.removeItem('id_token');
    localStorage.removeItem('access_token');
    window.location.href = this.getLogoutUrl();
  },

  // Redirect to sign in
  signIn(provider = null) {
    window.location.href = this.getSignInUrl(provider);
  },

  // Redirect to sign up
  signUp() {
    window.location.href = this.getSignUpUrl();
  },

  // Check profile and redirect appropriately after sign in
  async handlePostSignInRedirect() {
    try {
      // Check if profile-api.js is loaded
      if (typeof getProfile === 'undefined') {
        console.error('profile-api.js not loaded');
        window.location.href = 'profile.html';
        return;
      }

      const profile = await getProfile();
      
      if (!profile) {
        // No profile, redirect to onboarding
        window.location.href = 'onboarding.html';
      } else {
        // Profile exists, go to profile
        window.location.href = 'profile.html';
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // Default to profile page on error
      window.location.href = 'profile.html';
    }
  }
};

