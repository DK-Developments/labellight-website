/**
 * Cookie Consent Manager
 * Manages user consent for cookies and analytics tracking.
 * Provides a flexible, extensible system for managing different consent categories.
 * 
 * @author Kahn Wynyard
 * @version 1.0.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Check if user has given consent for analytics
 * if (cookieConsent.hasConsent('analytics')) {
 *   // Load analytics scripts
 * }
 * 
 * // Listen for consent changes
 * cookieConsent.onConsentChange(function(preferences) {
 *   console.log('Consent updated:', preferences);
 * });
 * 
 * // Add new consent category
 * cookieConsent.addCategory('marketing', { default: false, required: false });
 */

const cookieConsent = (function() {
  'use strict';

  // Use config if available, otherwise use defaults
  const config = (typeof CONFIG !== 'undefined' && CONFIG.COOKIE_CONSENT) 
    ? CONFIG.COOKIE_CONSENT 
    : {};

  // Consent storage key
  const CONSENT_STORAGE_KEY = config.STORAGE_KEY || 'labellight_cookie_consent';
  const CONSENT_VERSION = config.VERSION || '1.0';
  const PRIVACY_POLICY_URL = config.PRIVACY_POLICY_URL || 'privacy-policy.html';

  // Default consent categories - easily extensible
  const defaultCategories = config.CATEGORIES || {
    essential: {
      name: 'Essential',
      description: 'Required for the website to function properly.',
      required: true,
      default: true
    },
    analytics: {
      name: 'Analytics',
      description: 'Help us understand how visitors use our website.',
      required: false,
      default: false
    }
    // Future categories can be added here:
    // marketing: { name: 'Marketing', description: '...', required: false, default: false },
    // personalization: { name: 'Personalization', description: '...', required: false, default: false }
  };

  let categories = { ...defaultCategories };
  let preferences = {};
  let consentGiven = false;
  let listeners = [];

  /**
   * Initialize the consent manager
   */
  function init() {
    loadPreferences();
    
    // Only show banner if consent hasn't been given yet
    if (!consentGiven) {
      showBanner();
    } else {
      // Notify listeners of existing preferences
      notifyListeners();
    }
  }

  /**
   * Load preferences from localStorage
   */
  function loadPreferences() {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if consent version matches
        if (data.version === CONSENT_VERSION) {
          preferences = data.preferences || {};
          consentGiven = data.consentGiven || false;
          return;
        }
      }
    } catch (e) {
      console.warn('[CookieConsent] Failed to load preferences:', e);
    }
    
    // Set defaults if no valid stored preferences
    preferences = {};
    Object.keys(categories).forEach(function(key) {
      preferences[key] = categories[key].default;
    });
    consentGiven = false;
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences() {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        preferences: preferences,
        consentGiven: consentGiven,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[CookieConsent] Failed to save preferences:', e);
    }
  }

  /**
   * Show the consent banner
   */
  function showBanner() {
    // Create banner element
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.className = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cookie-consent-title');
    banner.setAttribute('aria-describedby', 'cookie-consent-description');

    banner.innerHTML = getBannerHTML();
    document.body.appendChild(banner);

    // Add event listeners
    setupBannerEvents(banner);

    // Animate in
    requestAnimationFrame(function() {
      banner.classList.add('cookie-consent-banner--visible');
    });
  }

  /**
   * Get the banner HTML content
   */
  function getBannerHTML() {
    return '' +
      '<div class="cookie-consent-content">' +
        '<div class="cookie-consent-text">' +
          '<h3 id="cookie-consent-title" class="cookie-consent-title">Cookie Preferences</h3>' +
          '<p id="cookie-consent-description" class="cookie-consent-description">' +
            'We use cookies to enhance your experience and analyze site usage. ' +
            'You can choose which cookies to allow. ' +
            '<a href="' + PRIVACY_POLICY_URL + '" class="cookie-consent-link">Learn more</a>' +
          '</p>' +
        '</div>' +
        '<div class="cookie-consent-actions">' +
          '<button type="button" class="btn btn-secondary cookie-consent-btn" id="cookie-consent-customize">' +
            'Customize' +
          '</button>' +
          '<button type="button" class="btn btn-secondary cookie-consent-btn" id="cookie-consent-decline">' +
            'Decline All' +
          '</button>' +
          '<button type="button" class="btn btn-primary cookie-consent-btn" id="cookie-consent-accept">' +
            'Accept All' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="cookie-consent-details" id="cookie-consent-details" hidden>' +
        '<div class="cookie-consent-categories">' +
          getCategoriesHTML() +
        '</div>' +
        '<div class="cookie-consent-details-actions">' +
          '<button type="button" class="btn btn-primary cookie-consent-btn" id="cookie-consent-save">' +
            'Save Preferences' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  /**
   * Generate HTML for consent categories
   */
  function getCategoriesHTML() {
    var html = '';
    Object.keys(categories).forEach(function(key) {
      var cat = categories[key];
      var isChecked = preferences[key] || cat.required;
      var isDisabled = cat.required;
      
      html += '' +
        '<div class="cookie-consent-category">' +
          '<label class="cookie-consent-category-label">' +
            '<input type="checkbox" ' +
              'name="cookie-category" ' +
              'value="' + key + '" ' +
              (isChecked ? 'checked ' : '') +
              (isDisabled ? 'disabled ' : '') +
            '/>' +
            '<span class="cookie-consent-category-info">' +
              '<span class="cookie-consent-category-name">' + cat.name + '</span>' +
              '<span class="cookie-consent-category-desc">' + cat.description + '</span>' +
              (cat.required ? '<span class="cookie-consent-category-required">(Required)</span>' : '') +
            '</span>' +
          '</label>' +
        '</div>';
    });
    return html;
  }

  /**
   * Setup event listeners for the banner
   */
  function setupBannerEvents(banner) {
    var acceptBtn = banner.querySelector('#cookie-consent-accept');
    var declineBtn = banner.querySelector('#cookie-consent-decline');
    var customizeBtn = banner.querySelector('#cookie-consent-customize');
    var saveBtn = banner.querySelector('#cookie-consent-save');
    var detailsSection = banner.querySelector('#cookie-consent-details');

    acceptBtn.addEventListener('click', function() {
      acceptAll();
      hideBanner(banner);
    });

    declineBtn.addEventListener('click', function() {
      declineAll();
      hideBanner(banner);
    });

    customizeBtn.addEventListener('click', function() {
      var isHidden = detailsSection.hidden;
      detailsSection.hidden = !isHidden;
      customizeBtn.textContent = isHidden ? 'Hide Options' : 'Customize';
    });

    saveBtn.addEventListener('click', function() {
      saveCustomPreferences(banner);
      hideBanner(banner);
    });
  }

  /**
   * Hide and remove the banner
   */
  function hideBanner(banner) {
    banner.classList.remove('cookie-consent-banner--visible');
    banner.addEventListener('transitionend', function() {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    });
  }

  /**
   * Accept all cookies
   */
  function acceptAll() {
    Object.keys(categories).forEach(function(key) {
      preferences[key] = true;
    });
    consentGiven = true;
    savePreferences();
    notifyListeners();
    console.log('[CookieConsent] All cookies accepted');
  }

  /**
   * Decline all non-essential cookies
   */
  function declineAll() {
    Object.keys(categories).forEach(function(key) {
      preferences[key] = categories[key].required;
    });
    consentGiven = true;
    savePreferences();
    notifyListeners();
    console.log('[CookieConsent] Non-essential cookies declined');
  }

  /**
   * Save custom preferences from the banner
   */
  function saveCustomPreferences(banner) {
    var checkboxes = banner.querySelectorAll('input[name="cookie-category"]');
    checkboxes.forEach(function(checkbox) {
      var category = checkbox.value;
      if (categories[category]) {
        preferences[category] = checkbox.checked || categories[category].required;
      }
    });
    consentGiven = true;
    savePreferences();
    notifyListeners();
    console.log('[CookieConsent] Custom preferences saved:', preferences);
  }

  /**
   * Notify all registered listeners of consent changes
   */
  function notifyListeners() {
    listeners.forEach(function(callback) {
      try {
        callback({ ...preferences });
      } catch (e) {
        console.error('[CookieConsent] Listener error:', e);
      }
    });
  }

  /**
   * Check if consent has been given for a specific category
   * @param {string} category - The category to check
   * @returns {boolean} - Whether consent is given
   */
  function hasConsent(category) {
    // Essential cookies are always allowed
    if (category === 'essential') return true;
    
    // If no consent given yet, return false for non-essential
    if (!consentGiven) return false;
    
    return preferences[category] === true;
  }

  /**
   * Register a callback for consent changes
   * @param {function} callback - Function to call when consent changes
   */
  function onConsentChange(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
      
      // If consent already given, notify immediately
      if (consentGiven) {
        callback({ ...preferences });
      }
    }
  }

  /**
   * Add a new consent category (for extensibility)
   * @param {string} key - Category identifier
   * @param {object} config - Category configuration
   */
  function addCategory(key, config) {
    categories[key] = {
      name: config.name || key,
      description: config.description || '',
      required: config.required || false,
      default: config.default || false
    };
    
    // Set default preference if not already set
    if (preferences[key] === undefined) {
      preferences[key] = categories[key].default;
    }
  }

  /**
   * Get all current preferences
   * @returns {object} - Current consent preferences
   */
  function getPreferences() {
    return { ...preferences };
  }

  /**
   * Check if any consent has been given
   * @returns {boolean} - Whether user has made a choice
   */
  function hasUserConsented() {
    return consentGiven;
  }

  /**
   * Reset all preferences and show banner again
   */
  function resetPreferences() {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    loadPreferences();
    consentGiven = false;
    
    // Remove existing banner if present
    var existingBanner = document.getElementById('cookie-consent-banner');
    if (existingBanner) {
      existingBanner.parentNode.removeChild(existingBanner);
    }
    
    showBanner();
  }

  /**
   * Show preferences manager (for use in footer link or settings)
   */
  function showPreferencesManager() {
    // Remove existing banner
    var existingBanner = document.getElementById('cookie-consent-banner');
    if (existingBanner) {
      existingBanner.parentNode.removeChild(existingBanner);
    }
    
    // Reset consent flag temporarily to show banner
    var wasConsented = consentGiven;
    showBanner();
    
    // Auto-expand the customize section
    setTimeout(function() {
      var banner = document.getElementById('cookie-consent-banner');
      if (banner) {
        var customizeBtn = banner.querySelector('#cookie-consent-customize');
        var detailsSection = banner.querySelector('#cookie-consent-details');
        if (customizeBtn && detailsSection) {
          detailsSection.hidden = false;
          customizeBtn.textContent = 'Hide Options';
        }
      }
    }, 100);
  }

  // Public API
  return {
    init: init,
    hasConsent: hasConsent,
    onConsentChange: onConsentChange,
    addCategory: addCategory,
    getPreferences: getPreferences,
    hasUserConsented: hasUserConsented,
    resetPreferences: resetPreferences,
    showPreferencesManager: showPreferencesManager
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cookieConsent.init);
} else {
  cookieConsent.init();
}
