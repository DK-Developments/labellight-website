// Cognito Configuration
// Updated with actual deployment values

const CONFIG = {
  COGNITO_DOMAIN: 'printerapp-auth.auth.ap-southeast-2.amazoncognito.com',
  CLIENT_ID: '2l9icu6dihjg3cuc594gr8g0k0',
  API_URL: 'https://ushpf5mflh.execute-api.ap-southeast-2.amazonaws.com/sandbox',
  
  // Stripe Configuration (TODO: Add real keys when available)
  STRIPE_PUBLISHABLE_KEY: 'pk_test_PLACEHOLDER', // TODO: Replace with real key
  STRIPE_PRICE_ID_MONTHLY: 'price_monthly_PLACEHOLDER', // TODO: Replace
  STRIPE_PRICE_ID_ANNUAL: 'price_annual_PLACEHOLDER', // TODO: Replace
  
  // Pricing display
  PRICING: {
    monthly: {
      amount: 9.99,
      currency: 'USD',
      interval: 'month'
    },
    annual: {
      amount: 99,
      currency: 'USD',
      interval: 'year',
    }
  }
};

