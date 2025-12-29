/**
 * General utility functions for Goal Pyramid
 * Provides reusable helper functions for auth, JWT, HTML, etc.
 */

function decodeJwtToken(token) {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

function isTokenValid(token) {
  const payload = decodeJwtToken(token);
  if (!payload || !payload.exp) return false;
  
  const expirationTime = payload.exp * 1000;
  return Date.now() < expirationTime;
}

function requireAuth(loginPage = 'index.html') {
  if (!auth.isAuthenticated()) {
    window.location.href = loginPage;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getUrlParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
}

function toggleLoading(element, show) {
  if (element) {
    element.style.display = show ? 'block' : 'none';
  }
}

function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function hideError(element) {
  if (element) {
    element.style.display = 'none';
  }
}

