// Google Analytics 4 (GA4) initialization and helper functions
// This file should be loaded in the <head> of all HTML pages

// Configuration
const GA_MEASUREMENT_ID = 'G-J8VPZ7FWEW';

// Load Google Analytics script dynamically
(function() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
})();

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID);

// Helper function to track events with consistent structure
window.trackEvent = function(eventName, params = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, params);
    console.log('Analytics event tracked:', eventName, params);
  } else {
    console.warn('gtag is not defined. Event not tracked:', eventName);
  }
};

// Helper function to track page views
window.trackPageView = function(pageTitle, pagePath) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath
    });
  }
};

// Helper function to track conversions
window.trackConversion = function(conversionData) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'conversion', {
      'send_to': 'G-J8VPZ7FWEW',
      ...conversionData
    });
  }
};

// Helper function to track purchases
window.trackPurchase = function(transactionData) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'purchase', {
      'event_category': 'ecommerce',
      'event_label': 'subscription',
      ...transactionData
    });
  }
};
