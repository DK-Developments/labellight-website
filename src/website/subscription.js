// Subscription Management Page - Handle subscription display and actions with mock data

// Mock subscription data (placeholder until backend API is ready)
const MOCK_SUBSCRIPTION = {
  status: 'active',
  plan: 'annual',
  amount: 99,
  currency: 'USD',
  current_period_end: '2026-01-29',
  cancel_at_period_end: false,
  customer_id: 'cus_mock_123'
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Check if user is authenticated
  if (!auth.isAuthenticated()) {
    // Redirect to home page if not logged in
    window.location.href = 'index.html';
    return;
  }

  // Load subscription data
  loadSubscriptionData();

  // Set up event listeners
  setupEventListeners();

  console.log('Subscription page initialized');
});

/**
 * Load and display subscription data
 */
async function loadSubscriptionData() {
  try {
    // TODO: Replace with real API call when backend is ready
    // const subscription = await fetchSubscriptionStatus();
    
    // For now, use mock data
    const subscription = MOCK_SUBSCRIPTION;
    
    displaySubscriptionData(subscription);
    
  } catch (error) {
    console.error('Error loading subscription:', error);
    showError('Failed to load subscription data. Using demo data.');
    
    // Fall back to mock data
    displaySubscriptionData(MOCK_SUBSCRIPTION);
  }
}

/**
 * Display subscription data in the UI
 * @param {Object} subscription - Subscription data object
 */
function displaySubscriptionData(subscription) {
  // Update status badge
  const statusBadge = document.getElementById('status-badge');
  const statusText = subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  statusBadge.textContent = statusText;
  statusBadge.className = `status-badge ${subscription.status}`;
  
  // Update plan name
  const planName = subscription.plan === 'monthly' ? 'Monthly Plan' : 'Annual Plan';
  document.getElementById('plan-name').textContent = planName;
  
  // Update amount
  const amount = subscription.plan === 'monthly' 
    ? `$${CONFIG.PRICING.monthly.amount.toFixed(2)} / month`
    : `$${CONFIG.PRICING.annual.amount.toFixed(2)} / year`;
  document.getElementById('plan-amount').textContent = amount;
  
  // Update next billing date
  const nextBilling = formatDate(subscription.current_period_end);
  document.getElementById('next-billing').textContent = nextBilling;
  
  // Update status text
  document.getElementById('subscription-status').textContent = statusText;
  
  // Show/hide cancel warning if subscription is set to cancel
  if (subscription.cancel_at_period_end) {
    const statusEl = document.getElementById('subscription-status');
    statusEl.innerHTML = statusText + '<br><small style="color: #856404;">Cancels on ' + nextBilling + '</small>';
  }
}

/**
 * Set up event listeners for buttons
 */
function setupEventListeners() {
  // Manage Billing button
  document.getElementById('manage-billing-btn').addEventListener('click', handleManageBilling);
  
  // Cancel Subscription button
  document.getElementById('cancel-subscription-btn').addEventListener('click', handleCancelSubscription);
  
  // Download Extension button
  document.getElementById('download-extension-btn').addEventListener('click', handleDownloadExtension);
  
  // Invoice download links (mock)
  document.querySelectorAll('.download-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Invoice download will be available when Stripe integration is complete.');
    });
  });
}

/**
 * Handle Manage Billing button click
 */
async function handleManageBilling() {
  const button = document.getElementById('manage-billing-btn');
  const originalText = button.textContent;
  
  button.disabled = true;
  button.textContent = 'Loading...';
  
  try {
    // TODO: Replace with real API call when backend is ready
    // const portalSession = await createCustomerPortalSession();
    // window.location.href = portalSession.url;
    
    // Placeholder
    setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
      
      alert(
        'Stripe Customer Portal Coming Soon!\n\n' +
        'This will redirect you to Stripe\'s secure billing portal where you can:\n' +
        '• Update payment methods\n' +
        '• View invoices\n' +
        '• Change subscription plans\n' +
        '• Update billing information\n\n' +
        'Feature available after Stripe integration is complete.'
      );
    }, 500);
    
  } catch (error) {
    console.error('Error creating portal session:', error);
    button.disabled = false;
    button.textContent = originalText;
    alert('Failed to open billing portal. Please try again.');
  }
}

/**
 * Handle Cancel Subscription button click
 */
function handleCancelSubscription() {
  const confirmed = confirm(
    'Are you sure you want to cancel your subscription?\n\n' +
    'You will retain access until the end of your current billing period.\n\n' +
    'Note: This is a demo. Real cancellation will be available when Stripe integration is complete.'
  );
  
  if (confirmed) {
    console.log('Subscription cancellation requested (demo mode)');
    
    // TODO: Implement real cancellation when backend is ready
    // await cancelSubscription();
    
    alert('Subscription cancellation will be processed when Stripe integration is complete.');
  }
}

/**
 * Handle Download Extension button click
 */
function handleDownloadExtension() {
  // TODO: Replace with actual Chrome Web Store link when extension is published
  const extensionUrl = '#'; // Placeholder
  
  console.log('Extension download requested');
  
  alert(
    'Extension Download\n\n' +
    'The DYMO Label Printing extension will be available in the Chrome Web Store.\n\n' +
    'After installation:\n' +
    '1. Navigate to Lightspeed Retail\n' +
    '2. The extension will automatically integrate\n' +
    '3. Start printing labels with one click!\n\n' +
    'Chrome Web Store link coming soon.'
  );
  
  // When extension is published:
  // window.open(extensionUrl, '_blank');
}

/**
 * Fetch subscription status from API (to be implemented)
 * @returns {Promise<Object>} Subscription data
 */
async function fetchSubscriptionStatus() {
  // TODO: Implement when backend API is ready
  /*
  const response = await apiRequest('/subscriptions', {
    method: 'GET',
    requireAuth: true
  });
  
  return response;
  */
  
  // Placeholder
  return Promise.resolve(MOCK_SUBSCRIPTION);
}

/**
 * Create Stripe Customer Portal session (to be implemented)
 * @returns {Promise<Object>} Portal session with URL
 */
async function createCustomerPortalSession() {
  // TODO: Implement when backend API is ready
  /*
  const response = await apiRequest('/subscriptions/portal', {
    method: 'POST',
    requireAuth: true
  });
  
  return response;
  */
  
  // Placeholder
  return Promise.reject(new Error('Backend API not implemented yet'));
}

/**
 * Cancel subscription (to be implemented)
 * @returns {Promise<Object>} Updated subscription data
 */
async function cancelSubscription() {
  // TODO: Implement when backend API is ready
  /*
  const response = await apiRequest('/subscriptions/cancel', {
    method: 'POST',
    requireAuth: true
  });
  
  return response;
  */
  
  // Placeholder
  return Promise.reject(new Error('Backend API not implemented yet'));
}

/**
 * Format date string for display
 * @param {string} dateString - ISO date string or 'YYYY-MM-DD'
 * @returns {string} Formatted date (e.g., "January 29, 2026")
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  console.error(message);
  // Could add a toast notification or error banner here
}

