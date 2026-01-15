const analytics = (function() {
  const GTM_ID = 'GTM-NFB2CLVX';
  const PRODUCTION_HOSTS = ['d104hl1uvuv9ge.cloudfront.net', 'www.d104hl1uvuv9ge.cloudfront.net'];
  
  function isProduction() {
    return PRODUCTION_HOSTS.includes(window.location.hostname);
  }
  
  function init() {
    // TODO: Re-enable production check before go-live
    // if (!isProduction()) {
    //   console.log('[Analytics] Skipped - not in production environment');
    //   return;
    // }
    
    window.dataLayer = window.dataLayer || [];
    loadGTM();
    console.log('[Analytics] Initialized');
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
    // TODO: Re-enable production check before go-live
    // if (!isProduction()) return;
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params
    });
    console.log('[Analytics] Event tracked:', eventName, params);
  }
  
  // Auto-initialize
  init();
  
  return {
    trackEvent,
    isProduction
  };
})();
