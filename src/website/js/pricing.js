// Pricing Page - Handle subscription selection with placeholder Stripe integration

// Track current billing period
let isYearlyBilling = false;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Initialize billing toggle
  initBillingToggle();
  
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
 * Initialize the billing toggle switch
 */
function initBillingToggle() {
  const toggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('monthly-label');
  const yearlyLabel = document.getElementById('yearly-label');
  
  if (!toggle) return;
  
  // Set initial state
  monthlyLabel.classList.add('active');
  updatePricing(false);
  
  toggle.addEventListener('change', function() {
    isYearlyBilling = this.checked;
    
    // Update label styling
    if (isYearlyBilling) {
      monthlyLabel.classList.remove('active');
      yearlyLabel.classList.add('active');
    } else {
      monthlyLabel.classList.add('active');
      yearlyLabel.classList.remove('active');
    }
    
    updatePricing(isYearlyBilling);
  });
}

/**
 * Update all pricing displays based on billing period
 * @param {boolean} yearly - Whether yearly billing is selected
 */
function updatePricing(yearly) {
  const planCards = document.querySelectorAll('.plan-card[data-plan-key]');
  
  planCards.forEach(card => {
    const planKey = card.getAttribute('data-plan-key');
    
    // Skip enterprise card
    if (planKey === 'enterprise') return;
    
    const priceAmount = card.querySelector('.price-amount');
    const priceInterval = card.querySelector('.price-interval');
    const planSavings = card.querySelector('.plan-savings');
    const subscribeBtn = card.querySelector('.subscribe-btn[data-plan-monthly]');
    
    if (!priceAmount) return;
    
    const monthlyPrice = parseFloat(priceAmount.getAttribute('data-monthly'));
    const yearlyPrice = parseFloat(priceAmount.getAttribute('data-yearly'));
    const savings = parseFloat(planSavings?.getAttribute('data-savings') || 0);
    
    if (yearly) {
      priceAmount.textContent = '$' + yearlyPrice.toFixed(2);
      priceInterval.textContent = '/year';
      if (planSavings) {
        planSavings.textContent = 'Save $' + savings.toFixed(2) + ' per year';
      }
      if (subscribeBtn) {
        subscribeBtn.setAttribute('data-plan', subscribeBtn.getAttribute('data-plan-yearly'));
      }
    } else {
      priceAmount.textContent = '$' + monthlyPrice.toFixed(2);
      priceInterval.textContent = '/month';
      if (planSavings) {
        planSavings.textContent = '';
      }
      if (subscribeBtn) {
        subscribeBtn.setAttribute('data-plan', subscribeBtn.getAttribute('data-plan-monthly'));
      }
    }
  });
}

/**
 * Handle subscription button click
 * @param {string} plan - Plan identifier (e.g., 'trial', 'single-monthly', 'team-yearly')
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
  const priceId = CONFIG.STRIPE_PRICE_IDS[plan];
  
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
 * @param {string} plan - Selected plan identifier
 */
function showPlaceholderMessage(plan) {
  const planDetails = CONFIG.PRICING[plan];
  
  if (!planDetails) {
    alert('Unknown plan selected. Please try again.');
    return;
  }
  
  const name = planDetails.name;
  const amount = planDetails.amount;
  const interval = planDetails.interval;
  const users = planDetails.users;
  
  const priceDisplay = amount === 0 
    ? 'Free' 
    : `$${amount}/${interval}`;
  
  alert(
    `Stripe Integration Coming Soon!\n\n` +
    `You selected: ${name}\n` +
    `Price: ${priceDisplay}\n` +
    `Users: ${users === 'unlimited' ? 'Unlimited' : users}\n\n` +
    `This will redirect to Stripe Checkout when integration is complete.\n\n` +
    `Your selection has been logged for analytics.`
  );
  
  // Log for analytics (placeholder)
  console.log('Analytics: Subscription selected', {
    plan: plan,
    name: name,
    amount: amount,
    interval: interval,
    users: users,
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

