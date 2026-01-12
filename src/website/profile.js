// Home page - Authenticated area

// Check if user is authenticated
requireAuth();

// Load and display user profile
loadUserProfile();

// Load and display subscription status
loadSubscriptionStatus();

async function loadUserProfile() {
  try {
    const profile = await getProfile();
    
    if (!profile) {
      // No profile found, redirect to onboarding
      window.location.href = 'onboarding.html';
      return;
    }
    
    // Display user's name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = profile.display_name;
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    // Show default message on error
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = 'there';
    }
  }
}

/**
 * Load and display subscription status
 */
async function loadSubscriptionStatus() {
  const subscriptionContent = document.getElementById('subscription-content');
  const extensionSection = document.getElementById('extension-section');
  const noSubscriptionSection = document.getElementById('no-subscription-section');
  
  try {
    // TODO: Replace with real API call when backend is ready
    // const subscription = await fetchSubscription();
    
    // For now, use mock data to demonstrate the UI
    const subscription = {
      status: 'active',
      plan: 'annual',
      amount: 99,
      current_period_end: '2026-01-29'
    };
    
    if (subscription && subscription.status === 'active') {
      // User has active subscription
      displayActiveSubscription(subscription, subscriptionContent);
      extensionSection.style.display = 'block';
      noSubscriptionSection.style.display = 'none';
    } else {
      // No active subscription
      displayNoSubscription(subscriptionContent);
      extensionSection.style.display = 'none';
      noSubscriptionSection.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error loading subscription:', error);
    // Show error or no subscription state
    displayNoSubscription(subscriptionContent);
    extensionSection.style.display = 'none';
    noSubscriptionSection.style.display = 'block';
  }
}

/**
 * Display active subscription information
 */
function displayActiveSubscription(subscription, container) {
  const planName = subscription.plan === 'monthly' ? 'Monthly' : 'Annual';
  // Hardcoded pricing (matches pricing.html values)
  const amount = subscription.plan === 'monthly' ? 9.99 : 99;
  const nextBilling = new Date(subscription.current_period_end).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
      <div>
        <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 5px;">
          ${planName} Plan
        </div>
        <div style="font-size: 24px; font-weight: 700; color: #1a73e8;">
          $${amount.toFixed(2)} / ${subscription.plan === 'monthly' ? 'month' : 'year'}
        </div>
      </div>
      <span class="status-badge active">Active</span>
    </div>
    <div style="padding: 15px; background-color: #f5f5f5; border-radius: 4px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Next billing date:</div>
      <div style="font-size: 16px; font-weight: 600; color: #333;">${nextBilling}</div>
    </div>
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <a href="subscription.html" class="btn btn-primary">Manage Subscription</a>
      <a href="subscription.html" class="btn btn-secondary">View Billing History</a>
    </div>
    <p style="margin-top: 15px; font-size: 13px; color: #666;">
      <strong>Note:</strong> This is demo data. Real subscription details will be displayed when Stripe integration is complete.
    </p>
  `;
}

/**
 * Display no subscription state
 */
function displayNoSubscription(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <p style="font-size: 16px; color: #666; margin-bottom: 15px;">
        You don't have an active subscription yet.
      </p>
      <p style="font-size: 14px; color: #666;">
        Subscribe to access the DYMO Label Printing extension and start saving hours every week.
      </p>
    </div>
  `;
}

/**
 * Fetch subscription from API (to be implemented)
 */
async function fetchSubscription() {
  // TODO: Implement when backend API is ready
  /*
  const response = await apiRequest('/subscriptions', {
    method: 'GET',
    requireAuth: true
  });
  
  return response;
  */
  
  // Placeholder - return null to simulate no subscription
  return null;
}

// Set up download extension button
document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('download-extension-btn-profile');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      // Track extension download click
      if (typeof gtag !== 'undefined') {
        gtag('event', 'extension_download_click', {
          'event_category': 'engagement',
          'event_label': 'profile_page'
        });
      }
      
      alert(
        'Extension Download\n\n' +
        'The DYMO Label Printing extension will be available in the Chrome Web Store.\n\n' +
        'Chrome Web Store link coming soon.'
      );
    });
  }
});
