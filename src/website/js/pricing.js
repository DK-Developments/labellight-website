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

  // Parse plan identifier (e.g., 'team-monthly' -> planKey='team', billingPeriod='monthly')
  const parts = plan.split('-');
  const planKey = parts[0];
  const billingPeriod = parts[1] || 'monthly';
  
  // Handle enterprise separately (contact sales)
  if (planKey === 'enterprise') {
    button.disabled = false;
    button.textContent = originalText;
    window.location.href = 'mailto:sales@printerapp.com?subject=Enterprise%20Pricing%20Inquiry';
    return;
  }
  
  // Create checkout session via backend API
  createCheckoutSession(planKey, billingPeriod)
    .then(response => {
      // Redirect to Stripe Checkout
      window.location.href = response.checkout_url;
    })
    .catch(error => {
      console.error('Stripe checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      button.disabled = false;
      button.textContent = originalText;
    });
}

/**
 * Create Stripe Checkout Session
 * @param {string} plan - Plan key (e.g., 'single', 'team', 'business')
 * @param {string} billingPeriod - Billing period ('monthly' or 'yearly')
 * @returns {Promise<Object>} Response with checkout_url
 */
async function createCheckoutSession(plan, billingPeriod) {
  const response = await apiRequest('/subscription', {
    method: 'POST',
    body: {
      plan: plan,
      billing_period: billingPeriod,
      owner_type: 'user'  // TODO: Support organisation subscriptions
    },
    requireAuth: true
  });
  
  return response;
}
