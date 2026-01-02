// Cognito Configuration
// Updated with actual deployment values

const CONFIG = {
  COGNITO_DOMAIN: 'printerapp-auth.auth.ap-southeast-2.amazoncognito.com',
  CLIENT_ID: '2l9icu6dihjg3cuc594gr8g0k0',
  API_URL: 'https://ushpf5mflh.execute-api.ap-southeast-2.amazonaws.com/sandbox',
  
  // Stripe Configuration (TODO: Add real keys when available)
  STRIPE_PUBLISHABLE_KEY: 'pk_test_PLACEHOLDER', // TODO: Replace with real key
  
  // Stripe Price IDs (TODO: Replace with real IDs)
  STRIPE_PRICE_IDS: {
    trial: 'price_trial_PLACEHOLDER',
    'single-monthly': 'price_single_monthly_PLACEHOLDER',
    'single-yearly': 'price_single_yearly_PLACEHOLDER',
    'team-monthly': 'price_team_monthly_PLACEHOLDER',
    'team-yearly': 'price_team_yearly_PLACEHOLDER',
    'business-monthly': 'price_business_monthly_PLACEHOLDER',
    'business-yearly': 'price_business_yearly_PLACEHOLDER'
  },
  
  // Pricing display
  PRICING: {
    trial: {
      name: 'Free Trial',
      amount: 0,
      currency: 'USD',
      interval: '7 days',
      users: 1
    },
    'single-monthly': {
      name: '1 User Monthly',
      amount: 14.99,
      currency: 'USD',
      interval: 'month',
      users: 1
    },
    'single-yearly': {
      name: '1 User Yearly',
      amount: 149.99,
      currency: 'USD',
      interval: 'year',
      users: 1
    },
    'team-monthly': {
      name: 'Up To 3 Users Monthly',
      amount: 29.99,
      currency: 'USD',
      interval: 'month',
      users: 3
    },
    'team-yearly': {
      name: 'Up To 3 Users Yearly',
      amount: 299.00,
      currency: 'USD',
      interval: 'year',
      users: 3
    },
    'business-monthly': {
      name: 'Up To 10 Users Monthly',
      amount: 79.99,
      currency: 'USD',
      interval: 'month',
      users: 10
    },
    'business-yearly': {
      name: 'Up To 10 Users Yearly',
      amount: 799.99,
      currency: 'USD',
      interval: 'year',
      users: 10
    },
    enterprise: {
      name: 'Enterprise',
      amount: 7.49,
      currency: 'USD',
      interval: 'user/month',
      users: 'unlimited'
    }
  }
};

