// Pricing Page - Handle subscription selection with Stripe integration
// Uses PricingConfig from stripe-pricing.js for centralized pricing data

// Track current billing period
let isYearlyBilling = false;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Initialize pricing from PricingConfig
  initPricingFromConfig();
  
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
 * Initialize pricing display from PricingConfig
 * Populates plan prices and features from the centralized config
 */
function initPricingFromConfig() {
  if (typeof PricingConfig === 'undefined') {
    console.warn('PricingConfig not loaded - using fallback prices from HTML');
    return;
  }

  // Update plan card prices from Stripe data
  const planCards = document.querySelectorAll('.plan-card[data-plan-key]');
  planCards.forEach(card => {
    const planKey = card.getAttribute('data-plan-key');
    if (planKey === 'enterprise') return;

    const monthlyPlan = PricingConfig.plans[planKey + '_month'];
    const yearlyPlan = PricingConfig.plans[planKey + '_year'];

    if (monthlyPlan || yearlyPlan) {
      const priceAmount = card.querySelector('.price-amount');
      const subscribeBtn = card.querySelector('.subscribe-btn[data-plan-monthly]');

      if (priceAmount) {
        // Update data attributes with Stripe prices
        if (monthlyPlan) {
          priceAmount.setAttribute('data-monthly', monthlyPlan.price);
          priceAmount.setAttribute('data-price-id-monthly', monthlyPlan.priceId);
        }
        if (yearlyPlan) {
          priceAmount.setAttribute('data-yearly', yearlyPlan.price);
          priceAmount.setAttribute('data-price-id-yearly', yearlyPlan.priceId);
        }

        // Calculate savings
        if (monthlyPlan && yearlyPlan) {
          const annualCostMonthly = monthlyPlan.price * 12;
          const savings = annualCostMonthly - yearlyPlan.price;
          const planSavings = card.querySelector('.plan-savings');
          if (planSavings) {
            planSavings.setAttribute('data-savings', savings.toFixed(2));
          }
        }
      }
    }
  });

  // Calculate and update savings badge
  updateSavingsBadge();

  console.log('Pricing initialized from PricingConfig');
}

/**
 * Calculate and update the savings percentage badge
 */
function updateSavingsBadge() {
  if (typeof PricingConfig === 'undefined') return;

  // Calculate average savings percentage across plans
  let totalMonthly = 0;
  let totalYearly = 0;
  let planCount = 0;

  ['single', 'team', 'business'].forEach(planKey => {
    const monthly = PricingConfig.plans[planKey + '_month'];
    const yearly = PricingConfig.plans[planKey + '_year'];
    if (monthly && yearly) {
      totalMonthly += monthly.price * 12;
      totalYearly += yearly.price;
      planCount++;
    }
  });

  if (planCount > 0) {
    const avgSavingsPercent = Math.round((1 - (totalYearly / totalMonthly)) * 100);
    const savingsBadge = document.querySelector('.savings-badge');
    if (savingsBadge) {
      savingsBadge.textContent = 'Save ' + avgSavingsPercent + '%';
    }
  }
}

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
 * Uses prices from PricingConfig (populated from Stripe)
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
    
    // Get Stripe price IDs if available
    const monthlyPriceId = priceAmount.getAttribute('data-price-id-monthly');
    const yearlyPriceId = priceAmount.getAttribute('data-price-id-yearly');
    
    if (yearly) {
      priceAmount.textContent = '$' + yearlyPrice.toFixed(2);
      priceInterval.textContent = '/year';
      if (planSavings) {
        planSavings.textContent = 'Save $' + savings.toFixed(2) + ' per year';
      }
      if (subscribeBtn) {
        const planValue = yearlyPriceId || subscribeBtn.getAttribute('data-plan-yearly');
        subscribeBtn.setAttribute('data-plan', planValue);
      }
    } else {
      priceAmount.textContent = '$' + monthlyPrice.toFixed(2);
      priceInterval.textContent = '/month';
      if (planSavings) {
        planSavings.textContent = '';
      }
      if (subscribeBtn) {
        const planValue = monthlyPriceId || subscribeBtn.getAttribute('data-plan-monthly');
        subscribeBtn.setAttribute('data-plan', planValue);
      }
    }
  });
}

/**
 * Handle subscription button click
 * @param {string} plan - Plan identifier (Stripe price ID like 'price_xxx' or legacy format like 'single-monthly')
 */
function handleSubscribe(plan) {
  console.log('Subscribe button clicked:', plan);
  
  // Check if user is authenticated
  if (!auth.isAuthenticated()) {
    // User not signed in - redirect to sign in
    if (confirm('You need to be signed in to subscribe. Would you like to sign in now?')) {
      auth.signIn();
    }
    return;
  }

  // Get button element
  const button = document.querySelector('.subscribe-btn[data-plan="' + plan + '"]');
  
  // Show loading state
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Processing...';

  // Check if plan is a Stripe price ID (starts with 'price_')
  const isStripePriceId = plan.startsWith('price_');
  
  // Handle enterprise separately (contact sales)
  if (plan === 'enterprise') {
    button.disabled = false;
    button.textContent = originalText;
    window.location.href = 'mailto:sales@printerapp.com?subject=Enterprise%20Pricing%20Inquiry';
    return;
  }
  
  // Create checkout session via backend API
  if (isStripePriceId) {
    // Use Stripe price ID directly
    createCheckoutSessionWithPriceId(plan)
      .then(response => {
        window.location.href = response.checkout_url;
      })
      .catch(error => {
        console.error('Stripe checkout error:', error);
        alert('Failed to start checkout. Please try again.');
        button.disabled = false;
        button.textContent = originalText;
      });
  } else {
    // Legacy format: parse plan identifier (e.g., 'team-monthly' -> planKey='team', billingPeriod='monthly')
    const parts = plan.split('-');
    const planKey = parts[0];
    const billingPeriod = parts[1] || 'monthly';
    
    createCheckoutSession(planKey, billingPeriod)
      .then(response => {
        window.location.href = response.checkout_url;
      })
      .catch(error => {
        console.error('Stripe checkout error:', error);
        alert('Failed to start checkout. Please try again.');
        button.disabled = false;
        button.textContent = originalText;
      });
  }
}

/**
 * Create Stripe Checkout Session using Stripe price ID
 * @param {string} priceId - Stripe price ID (e.g., 'price_1234567890')
 * @returns {Promise<Object>} Response with checkout_url
 */
async function createCheckoutSessionWithPriceId(priceId) {
  const response = await apiRequest('/subscription', {
    method: 'POST',
    body: {
      price_id: priceId,
      owner_type: 'user'  // TODO: Support organisation subscriptions
    },
    requireAuth: true
  });
  
  return response;
}

/**
 * Create Stripe Checkout Session (legacy - uses plan key and billing period)
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
