/**
 * Profile API Client
 * Provides functions for managing user profiles
 * 
 * @author Eprouvez
 * @version 1.1.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Get current user's profile
 * const profile = await getProfile();
 * 
 * // Update profile
 * const updated = await updateProfile({ display_name: 'John Doe', phone: '+1234567890' });
 */

/**
 * Get user profile
 * @param {string} [userId] - Optional user ID to get another user's profile
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
async function getProfile(userId = null) {
  const queryParams = buildQueryParams({ user_id: userId });
  return apiGet('/profile', queryParams);
}

/**
 * Create a new profile (typically called during onboarding)
 * @param {Object} profileData - Profile data
 * @param {string} profileData.display_name - Display name (required)
 * @param {string} [profileData.bio] - User bio
 * @param {string} [profileData.phone] - Phone number
 * @param {string} [profileData.company] - Company name
 * @param {string} [profileData.address] - Street address
 * @param {string} [profileData.city] - City
 * @param {string} [profileData.state] - State/Province
 * @param {string} [profileData.country] - Country
 * @returns {Promise<Object>} Created profile data
 */
async function createProfile(profileData) {
  return apiPost('/profile', profileData);
}

/**
 * Update user profile
 * @param {Object} updates - Fields to update
 * @param {string} [updates.display_name] - Display name
 * @param {string} [updates.bio] - User bio
 * @param {string} [updates.phone] - Phone number
 * @param {string} [updates.company] - Company name
 * @param {string} [updates.address] - Street address
 * @param {string} [updates.city] - City
 * @param {string} [updates.state] - State/Province
 * @param {string} [updates.country] - Country
 * @returns {Promise<Object>} Updated profile data
 */
async function updateProfile(updates) {
  return apiPut('/profile', updates);
}

/**
 * Check if the current user has a profile
 * @returns {Promise<boolean>} True if profile exists
 */
async function hasProfile() {
  try {
    const profile = await getProfile();
    return profile !== null;
  } catch (error) {
    console.error('Profile check error:', error);
    return false;
  }
}


