/**
 * Analytics Module
 * Initializes Google Tag Manager and GA4 with environment tagging.
 */

const analytics = (function() {
  const GTM_ID = 'GTM-NFB2CLVX';
  
  function getEnvironment() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'local';
    if (host.includes('cloudfront.net')) return 'dev';
    if (host.includes('labellight.com')) return 'prod';
    return 'unknown';
  }
  
  function init() {
    window.dataLayer = window.dataLayer || [];
    loadGTM();
    console.log('[Analytics] Initialized - Environment:', getEnvironment());
  }
  
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
  
  function trackEvent(eventName, params = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      environment: getEnvironment(),
      ...params
    });
    console.log('[Analytics] Event tracked:', eventName, params);
  }
  
  init();
  
  return {
    trackEvent,
    getEnvironment
  };
})();
