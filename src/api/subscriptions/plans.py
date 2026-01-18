"""
Subscription Plans Configuration
Defines plan tiers and user limits.

Price IDs are fetched dynamically from Stripe API using product metadata.
This allows the same code to work across dev/prod environments.

PRICING MODEL:
- Trial: 7-day free trial (credit card required)
- Single: 1 user
- Team: Up to 3 users (via organisation)
- Business: Up to 10 users (via organisation)
- Enterprise: 10+ users, custom pricing

STRIPE SETUP REQUIRED:
Each Stripe Product must have metadata: plan_key = "single" | "team" | "business"
"""
import os
import stripe

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

# Plan configurations with user limits
PLANS = {
    'single': {
        'name': '1 User',
        'user_limit': 1,
    },
    'team': {
        'name': 'Up To 3 Users',
        'user_limit': 3,
    },
    'business': {
        'name': 'Up To 10 Users',
        'user_limit': 10,
    },
    'enterprise': {
        'name': 'Enterprise',
        'user_limit': None,  # Unlimited or custom
        'min_users': 10,
    },
}

# Default limits for users without subscription
DEFAULT_USER_LIMIT = 1

# Cache for Stripe price mappings (populated on first use)
_stripe_price_cache = None


def _fetch_stripe_prices():
    """Fetch active prices from Stripe and build mappings based on product metadata."""
    global _stripe_price_cache
    
    if _stripe_price_cache is not None:
        return _stripe_price_cache
    
    price_to_plan = {}
    plan_to_price = {}
    
    try:
        # Fetch all active prices with product data
        prices = stripe.Price.list(
            active=True,
            expand=['data.product'],
            limit=100
        )
        
        for price in prices.data:
            product = price.product
            if not product or isinstance(product, str):
                continue
            
            # Get plan_key from product metadata
            plan_key = product.metadata.get('plan_key')
            if not plan_key or plan_key not in PLANS:
                continue
            
            # Determine billing period from interval
            interval = price.recurring.interval if price.recurring else None
            if interval == 'month':
                billing_period = 'monthly'
            elif interval == 'year':
                billing_period = 'yearly'
            else:
                continue
            
            # Build mappings
            price_to_plan[price.id] = (plan_key, billing_period)
            plan_to_price[(plan_key, billing_period)] = price.id
        
        _stripe_price_cache = {
            'price_to_plan': price_to_plan,
            'plan_to_price': plan_to_price,
        }
        
        print(f"[Plans] Loaded {len(price_to_plan)} prices from Stripe")
        
    except stripe.error.StripeError as e:
        print(f"[Plans] Error fetching Stripe prices: {e}")
        _stripe_price_cache = {
            'price_to_plan': {},
            'plan_to_price': {},
        }
    
    return _stripe_price_cache


def get_plan_config(plan_key):
    """Get configuration for a plan by key."""
    return PLANS.get(plan_key)


def get_user_limit(plan_key, custom_limit=None):
    """Get user limit for a plan."""
    if custom_limit is not None:
        return custom_limit
    
    plan = PLANS.get(plan_key)
    if not plan:
        return DEFAULT_USER_LIMIT
    
    return plan.get('user_limit', DEFAULT_USER_LIMIT)


def get_plan_from_stripe_price(price_id):
    """Get plan key and billing period from Stripe Price ID."""
    cache = _fetch_stripe_prices()
    return cache['price_to_plan'].get(price_id, (None, None))


def get_stripe_price_for_plan(plan_key, billing_period):
    """Get Stripe Price ID for a plan and billing period."""
    cache = _fetch_stripe_prices()
    return cache['plan_to_price'].get((plan_key, billing_period))


def clear_price_cache():
    """Clear the price cache to force a refresh from Stripe."""
    global _stripe_price_cache
    _stripe_price_cache = None
