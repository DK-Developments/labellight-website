// Pricing Page - Handle subscription selection with placeholder Stripe integration

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Get all subscribe buttons
  const subscribeButtons = document.querySelectorAll('.subscribe-btn');
  
  subscribeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const plan = this.getAttribute('data-plan');
      handleSubscribe(plan);
    });
  });

  // FAQ accordion functionality (reuse from index.js)
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', function() {
      const isActive = item.classList.contains('active');
      
      // Close all FAQ items
      faqItems.forEach(faq => faq.classList.remove('active'));
      
      // If item wasn't active, open it
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  console.log('Pricing page initialized');
});

/**
 * Handle subscription button click
 * @param {string} plan - 'monthly' or 'annual'
 */
function handleSubscribe(plan) {
  console.log('Subscribe button clicked:', plan);
  
  // Check if user is authenticated
  if (!auth.isAuthenticated()) {
    // User not logged in - redirect to login
    if (confirm('You need to be logged in to subscribe. Would you like to log in now?')) {
      auth.login();
    }
    return;
  }

  // Get button element
  const button = document.querySelector(`.subscribe-btn[data-plan="${plan}"]`);
  
  // Show loading state
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Processing...';

  // TODO: Real Stripe integration
  // When Stripe is available, uncomment and implement:
  /*
  // Initialize Stripe
  const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
  
  // Get the appropriate price ID
  const priceId = plan === 'monthly' 
    ? CONFIG.STRIPE_PRICE_ID_MONTHLY 
    : CONFIG.STRIPE_PRICE_ID_ANNUAL;
  
  // Create checkout session via backend API
  createCheckoutSession(priceId)
    .then(session => {
      // Redirect to Stripe Checkout
      return stripe.redirectToCheckout({ sessionId: session.id });
    })
    .catch(error => {
      console.error('Stripe checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      button.disabled = false;
      button.textContent = originalText;
    });
  */

  // PLACEHOLDER: Show message that Stripe integration is coming
  setTimeout(() => {
    button.disabled = false;
    button.textContent = originalText;
    
    showPlaceholderMessage(plan);
  }, 500);
}

/**
 * Show placeholder message (to be removed when Stripe is integrated)
 * @param {string} plan - Selected plan
 */
function showPlaceholderMessage(plan) {
  const planDetails = CONFIG.PRICING[plan];
  const amount = planDetails.amount;
  const interval = planDetails.interval;
  
  alert(
    `Stripe Integration Coming Soon!\n\n` +
    `You selected: ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan\n` +
    `Price: $${amount}/${interval}\n\n` +
    `This will redirect to Stripe Checkout when integration is complete.\n\n` +
    `Your selection has been logged for analytics.`
  );
  
  // Log for analytics (placeholder)
  console.log('Analytics: Subscription selected', {
    plan: plan,
    amount: amount,
    interval: interval,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create Stripe Checkout Session (to be implemented)
 * @param {string} priceId - Stripe price ID
 * @returns {Promise<Object>} Session object with id
 */
async function createCheckoutSession(priceId) {
  // TODO: Implement when backend API is ready
  /*
  const response = await apiRequest('/subscriptions/checkout', {
    method: 'POST',
    body: { price_id: priceId },
    requireAuth: true
  });
  
  return response;
  */
  
  // Placeholder
  return Promise.reject(new Error('Backend API not implemented yet'));
}

/**
 * Mock function to check authentication
 * Uses the auth object from auth.js
 */
function mockCheckAuth() {
  return auth.isAuthenticated();
}

