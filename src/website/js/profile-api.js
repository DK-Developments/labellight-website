// Profile API Client

async function getProfile(userId = null) {
  const queryParams = buildQueryParams({ user_id: userId });
  return apiGet('/profile', queryParams);
}

async function createProfile(profileData) {
  return apiPost('/profile', profileData);
}

async function updateProfile(updates) {
  return apiPut('/profile', updates);
}

async function hasProfile() {
  try {
    const profile = await getProfile();
    return profile !== null;
  } catch (error) {
    console.error('Profile check error:', error);
    return false;
  }
}

