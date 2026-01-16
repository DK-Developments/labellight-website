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
 * Verify the Stripe Checkout session
 * Note: The webhook handles subscription creation. This just confirms the session was successful
 * by fetching the user's current subscription status.
 * @param {string} sessionId - Stripe session ID (for logging/tracking)
 */
async function verifyCheckoutSession(sessionId) {
  console.log('Verifying checkout session:', sessionId);
  
  try {
    // Fetch current subscription status
    // The webhook should have already created the subscription record
    const response = await apiRequest('/subscription', {
      method: 'GET',
      requireAuth: true
    });
    
    if (response && response.status === 'active' || response.status === 'trialing') {
      console.log('Subscription confirmed:', response);
      // Subscription is active, page displays success message
    } else {
      // Subscription not found yet - webhook may still be processing
      console.log('Subscription pending, webhook may still be processing');
      // Still show success - Stripe confirmed payment, webhook will process shortly
    }
    
  } catch (error) {
    console.error('Error verifying session:', error);
    // Don't show error to user - Stripe already confirmed payment
    // Webhook will process the subscription shortly
    console.log('Unable to verify subscription status, but payment was successful');
  }
}

/**
 * Handle Download Extension button click
 */
function handleDownloadExtension() {
  // TODO: Replace with actual Chrome Web Store link when extension is published
  const extensionUrl = '#'; // Placeholder
  
  console.log('Extension download requested from success page');
  
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
 * Track conversion (analytics placeholder)
 */
function trackConversion() {
  // TODO: Implement analytics tracking when available
  console.log('Conversion tracked (placeholder)', {
    timestamp: new Date().toISOString(),
    page: 'success'
  });
  
  // When analytics is integrated:
  // gtag('event', 'purchase', { ... });
  // or
  // analytics.track('Subscription Created', { ... });
}

// Track conversion on page load
trackConversion();

