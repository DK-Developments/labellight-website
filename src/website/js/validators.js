/**
 * Validation utilities for Goal Pyramid frontend
 * Provides reusable validation functions matching backend validation
 */

// Validation constants (must match backend)
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 20;
const BIO_MAX_LENGTH = 500;

function validateDisplayName(displayName) {
  if (!displayName || !displayName.trim()) {
    return { isValid: false, error: 'Display name is required' };
  }

  const name = displayName.trim();

  if (name.length < DISPLAY_NAME_MIN_LENGTH) {
    return { isValid: false, error: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters` };
  }

  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return { isValid: false, error: `Display name must not exceed ${DISPLAY_NAME_MAX_LENGTH} characters` };
  }

  return { isValid: true, error: null };
}

function validateBio(bio) {
  if (!bio) {
    return { isValid: true, error: null };
  }

  if (bio.length > BIO_MAX_LENGTH) {
    return { isValid: false, error: `Bio must not exceed ${BIO_MAX_LENGTH} characters` };
  }

  return { isValid: true, error: null };
}

function validateProfileData(displayName, bio) {
  let result = validateDisplayName(displayName);
  if (!result.isValid) {
    return result;
  }

  result = validateBio(bio);
  if (!result.isValid) {
    return result;
  }

  return { isValid: true, error: null };
}

function getValidationConstants() {
  return {
    DISPLAY_NAME_MIN_LENGTH,
    DISPLAY_NAME_MAX_LENGTH,
    BIO_MAX_LENGTH
  };
}

