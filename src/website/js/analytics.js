/**
 * Analytics Module
 * Initializes Google Tag Manager and GA4 with environment tagging.
 * Respects user cookie consent preferences before loading tracking scripts.
 * 
 * @author Kahn Wynyard
 * @version 1.1.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Track a custom event (only fires if user has given analytics consent)
 * analytics.trackEvent('button_click', { button_name: 'signup' });
 * 
 * // Check current environment
 * const env = analytics.getEnvironment();
 */

const analytics = (function() {
  'use strict';

  const GTM_ID = 'GTM-NFB2CLVX';
  let isInitialized = false;
  let pendingEvents = [];
  
  /**
   * Determine the current environment based on hostname
   */
  function getEnvironment() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'local';
    if (host.includes('cloudfront.net')) return 'dev';
    if (host.includes('labellight.com')) return 'prod';
    return 'unknown';
  }
  
  /**
   * Initialize analytics - waits for cookie consent
   */
  function init() {
    // Always initialize dataLayer for basic page structure
    window.dataLayer = window.dataLayer || [];
    
    // Check if cookie consent module is available
    if (typeof cookieConsent !== 'undefined') {
      // Listen for consent changes
      cookieConsent.onConsentChange(handleConsentChange);
      
      // Check if consent already given
      if (cookieConsent.hasConsent('analytics')) {
        loadAnalytics();
      } else {
        console.log('[Analytics] Waiting for user consent...');
      }
    } else {
      // Fallback: if no consent manager, check localStorage directly
      console.warn('[Analytics] Cookie consent manager not found, checking localStorage');
      const stored = localStorage.getItem('labellight_cookie_consent');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.consentGiven && data.preferences && data.preferences.analytics) {
            loadAnalytics();
          }
        } catch (e) {
          console.warn('[Analytics] Could not parse stored consent');
        }
      }
    }
  }
  
  /**
   * Handle consent changes from cookie consent manager
   */
  function handleConsentChange(preferences) {
    if (preferences.analytics && !isInitialized) {
      loadAnalytics();
    } else if (!preferences.analytics && isInitialized) {
      console.log('[Analytics] Analytics consent revoked - reload required for full effect');
      // Note: Fully disabling GTM after load requires page reload
      // We can prevent new events but can't fully unload GTM
    }
  }
  
  /**
   * Load analytics scripts (GTM)
   */
  function loadAnalytics() {
    if (isInitialized) return;
    
    loadGTM();
    isInitialized = true;
    console.log('[Analytics] Initialized - Environment:', getEnvironment());
    
    // Process any pending events
    processPendingEvents();
  }
  
  /**
   * Load Google Tag Manager
   */
  function loadGTM() {
    (function(w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', GTM_ID);
  }
  
  /**
   * Process events that were queued before consent was given
   */
  function processPendingEvents() {
    if (pendingEvents.length > 0) {
      console.log('[Analytics] Processing', pendingEvents.length, 'pending events');
      pendingEvents.forEach(function(event) {
        pushEvent(event.eventName, event.params);
      });
      pendingEvents = [];
    }
  }
  
  /**
   * Push event to dataLayer
   */
  function pushEvent(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      environment: getEnvironment(),
      ...params
    });
  }
  
  /**
   * Track a custom event
   * @param {string} eventName - Name of the event
   * @param {object} params - Additional event parameters
   */
  function trackEvent(eventName, params = {}) {
    // Check for analytics consent
    const hasConsent = typeof cookieConsent !== 'undefined' 
      ? cookieConsent.hasConsent('analytics') 
      : false;
    
    if (!hasConsent) {
      // Queue events for when consent is given
      pendingEvents.push({ eventName, params });
      console.log('[Analytics] Event queued (awaiting consent):', eventName);
      return;
    }
    
    if (!isInitialized) {
      pendingEvents.push({ eventName, params });
      console.log('[Analytics] Event queued (not yet initialized):', eventName);
      return;
    }
    
    pushEvent(eventName, params);
    console.log('[Analytics] Event tracked:', eventName, params);
  }
  
  /**
   * Check if analytics is currently active
   */
  function isActive() {
    return isInitialized;
  }
  
  // Initialize when script loads
  // Note: cookie-consent.js should be loaded before analytics.js
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure cookie-consent is initialized first
    setTimeout(init, 10);
  }
  
  return {
    trackEvent: trackEvent,
    getEnvironment: getEnvironment,
    isActive: isActive
  };
})();
