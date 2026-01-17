/**
 * Base API Client
 * Provides centralized request handling with authentication, error handling, and logging
 */

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path (e.g., '/posts', '/profile')
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.queryParams] - URL query parameters
 * @param {boolean} [options.requireAuth=true] - Whether authentication is required
 * @returns {Promise<Object|null>} Response data or null
 * @throws {Error} If request fails or authentication is required but missing
 */
async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    queryParams = null,
    requireAuth = true
  } = options;

  try {
    // Check authentication if required
    if (requireAuth) {
      const token = auth.getTokens().accessToken;
      if (!token) {
        throw new Error('Not authenticated');
      }
    }

    // Build URL with query parameters
    let url = `${CONFIG.API_URL}${endpoint}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    // Build request configuration
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authorization header if authenticated
    if (requireAuth) {
      const token = auth.getTokens().accessToken;
      config.headers['Authorization'] = token ? `Bearer ${token}` : '';
    }

    // Add body if present
    if (body) {
      config.body = JSON.stringify(body);
    }

    // Make request
    const response = await fetch(url, config);

    // Handle 404 specially - return null instead of throwing
    if (response.status === 404) {
      return null;
    }

    // Handle other error status codes
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If error parsing fails, use default message
      }
      throw new Error(errorMessage);
    }

    // Parse and return response
    return await response.json();

  } catch (error) {
    // Log error with context
    console.error(`API Error [${method} ${endpoint}]:`, error.message || error);
    throw error;
  }
}

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint path
 * @param {Object} [queryParams] - URL query parameters
 * @returns {Promise<Object|null>} Response data or null
 */
async function apiGet(endpoint, queryParams = null) {
  return apiRequest(endpoint, {
    method: 'GET',
    queryParams
  });
}

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPost(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'POST',
    body
  });
}

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPut(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body
  });
}

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint path
 * @returns {Promise<Object>} Response data
 */
async function apiDelete(endpoint) {
  return apiRequest(endpoint, {
    method: 'DELETE'
  });
}

/**
 * Build query parameters object for optional parameters
 * Only includes parameters that are not null/undefined
 * @param {Object} params - Parameters to filter
 * @returns {Object|null} Filtered parameters or null if empty
 */
function buildQueryParams(params) {
  const filtered = {};
  let hasParams = false;

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
      hasParams = true;
    }
  }

  return hasParams ? filtered : null;
}

