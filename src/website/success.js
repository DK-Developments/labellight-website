// Success Page - Handle post-purchase confirmation

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const demo = urlParams.get('demo');
  
  // If session_id exists, verify the checkout session
  if (sessionId) {
    verifyCheckoutSession(sessionId);
  } else if (demo) {
    // Demo mode for testing the page
    console.log('Success page in demo mode');
  } else {
    // No session ID and not demo - might be direct access
    console.log('Success page accessed directly');
  }
  
  // Set up event listeners
  setupEventListeners();
  
  console.log('Success page initialized');
});

/**
 * Set up event listeners for buttons
 */
function setupEventListeners() {
  // Download Extension button
  const downloadBtn = document.getElementById('download-extension-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadExtension);
  }
}

/**
 * Verify the Stripe Checkout session (to be implemented)
 * @param {string} sessionId - Stripe session ID
 */
async function verifyCheckoutSession(sessionId) {
  console.log('Verifying checkout session:', sessionId);
  
  try {
    // TODO: Implement when backend API is ready
    /*
    const response = await apiRequest('/subscriptions/verify-session', {
      method: 'POST',
      body: { session_id: sessionId },
      requireAuth: true
    });
    
    if (response.success) {
      console.log('Checkout session verified:', response);
      // Session is valid, subscription is created
      // No action needed, page displays success message
    } else {
      console.error('Checkout session verification failed');
      showError('Unable to verify your purchase. Please contact support.');
    }
    */
    
    // Placeholder
    console.log('Session verification will be implemented when backend API is ready');
    
  } catch (error) {
    console.error('Error verifying session:', error);
    showError('Unable to verify your purchase. Please contact support if you were charged.');
  }
}

/**
 * Handle Download Extension button click
 */
function handleDownloadExtension() {
  // TODO: Replace with actual Chrome Web Store link when extension is published
  const extensionUrl = '#'; // Placeholder
  
  console.log('Extension download requested from success page');
  
  // Track extension download click
  if (typeof gtag !== 'undefined') {
    gtag('event', 'extension_download_click', {
      'event_category': 'engagement',
      'event_label': 'success_page'
    });
  }
  
  alert(
    'Extension Download\n\n' +
    'The DYMO Label Printing extension will be available in the Chrome Web Store.\n\n' +
    'Installation Steps:\n' +
    '1. Click "Add to Chrome" in the Web Store\n' +
    '2. Confirm the installation\n' +
    '3. The extension will automatically integrate with Lightspeed\n\n' +
    'Chrome Web Store link coming soon.'
  );
  
  // When extension is published:
  // window.open(extensionUrl, '_blank');
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  // Create error banner
  const errorBanner = document.createElement('div');
  errorBanner.style.cssText = `
    background-color: #f8d7da;
    color: #721c24;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    border: 1px solid #f5c6cb;
  `;
  errorBanner.textContent = message;
  
  // Insert at top of success container
  const container = document.querySelector('.success-container');
  container.insertBefore(errorBanner, container.firstChild);
}

/**
 * Track conversion (analytics)
 */
function trackConversion() {
  console.log('Tracking conversion');
  
  // Get plan details from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan') || 'unknown';
  
  // Send purchase event to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'purchase', {
      'event_category': 'ecommerce',
      'event_label': 'subscription',
      'transaction_id': urlParams.get('session_id') || 'demo',
      'value': plan === 'monthly' ? 9.99 : 99.00,
      'currency': 'USD',
      'items': [{
        'item_name': `DYMO Label Printing - ${plan} Plan`,
        'item_category': 'subscription',
        'price': plan === 'monthly' ? 9.99 : 99.00,
        'quantity': 1
      }]
    });
    
    // Also track as a conversion event
    gtag('event', 'conversion', {
      'send_to': 'G-J8VPZ7FWEW',
      'event_category': 'ecommerce',
      'event_label': 'subscription_completed'
    });
  }
}

// Track conversion on page load
trackConversion();

