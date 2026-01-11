/**
 * Device API Client
 * Provides functions for managing user devices and device limits
 * 
 * @author Eprouvez
 * @version 1.0.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Get all registered devices
 * const devices = await getDevices();
 * 
 * // Register current device
 * const device = await registerDevice({ name: 'My Laptop', browser: 'Chrome' });
 * 
 * // Remove a device
 * await removeDevice('device-id-123');
 */

/**
 * Get all registered devices for the current user
 * @returns {Promise<Object>} Object containing devices array and limit info
 */
async function getDevices() {
  return apiGet('/devices');
}

/**
 * Register a new device
 * @param {Object} deviceData - Device information
 * @param {string} deviceData.name - Device name/identifier
 * @param {string} [deviceData.browser] - Browser name
 * @param {string} [deviceData.os] - Operating system
 * @param {string} [deviceData.device_type] - Device type (desktop, laptop, tablet, etc.)
 * @returns {Promise<Object>} Registered device data
 */
async function registerDevice(deviceData) {
  return apiPost('/devices', deviceData);
}

/**
 * Update device information
 * @param {string} deviceId - Device ID to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - Device name
 * @returns {Promise<Object>} Updated device data
 */
async function updateDevice(deviceId, updates) {
  return apiPut('/devices/' + deviceId, updates);
}

/**
 * Remove/deauthorize a device
 * @param {string} deviceId - Device ID to remove
 * @returns {Promise<Object>} Removal confirmation
 */
async function removeDevice(deviceId) {
  return apiDelete('/devices/' + deviceId);
}

/**
 * Get device limits based on subscription
 * @returns {Promise<Object>} Object containing current count and max allowed
 */
async function getDeviceLimits() {
  return apiGet('/devices/limits');
}

/**
 * Check if current device is registered
 * @returns {Promise<Object|null>} Current device data or null if not registered
 */
async function getCurrentDevice() {
  return apiGet('/devices/current');
}

/**
 * Update device last active timestamp (heartbeat)
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Updated device data
 */
async function updateDeviceActivity(deviceId) {
  return apiPost('/devices/' + deviceId + '/heartbeat');
}

/**
 * Generate a device fingerprint based on browser characteristics
 * This is used to identify returning devices
 * @returns {string} Device fingerprint hash
 */
function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform
  ];
  
  // Simple hash function
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get device type icon based on user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Emoji icon for the device type
 */
function getDeviceIcon(userAgent) {
  const ua = (userAgent || navigator.userAgent).toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return '📱';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return '📱';
  } else if (ua.includes('mac')) {
    return '💻';
  } else if (ua.includes('win')) {
    return '🖥️';
  } else if (ua.includes('linux')) {
    return '🐧';
  }
  return '💻';
}

/**
 * Get device type name based on user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Human-readable device type
 */
function getDeviceType(userAgent) {
  const ua = (userAgent || navigator.userAgent).toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('iphone')) {
    return 'Mobile';
  } else if (ua.includes('android')) {
    return 'Android';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  } else if (ua.includes('mac')) {
    return 'Mac';
  } else if (ua.includes('win')) {
    return 'Windows';
  } else if (ua.includes('linux')) {
    return 'Linux';
  }
  return 'Desktop';
}

/**
 * Get browser name from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Browser name
 */
function getBrowserName(userAgent) {
  const ua = (userAgent || navigator.userAgent).toLowerCase();
  
  if (ua.includes('edg/')) {
    return 'Microsoft Edge';
  } else if (ua.includes('chrome')) {
    return 'Google Chrome';
  } else if (ua.includes('firefox')) {
    return 'Mozilla Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    return 'Opera';
  }
  return 'Unknown Browser';
}
