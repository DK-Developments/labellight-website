"""
Subscription Plans Configuration
Defines plan tiers, pricing, and device limits

PRICING MODEL:
- Trial: 7-day free trial (credit card required)
- Single: 1 user, limited devices
- Team: Up to 3 users (via organisation), shared device pool
- Business: Up to 10 users (via organisation), shared device pool
- Enterprise: 10+ users, custom pricing

DEVICE SHARING:
- Individual users: devices count against their personal subscription
- Organisation members: devices count against the org's shared pool
"""

# Plan configurations with device limits
PLANS = {
    'trial': {
        'name': 'Trial',
        'device_limit': 1,
        'user_limit': 1,
        'duration_days': 7,
        'price_monthly': 0,
        'price_yearly': 0,
    },
    'single': {
        'name': '1 User',
        'device_limit': 3,
        'user_limit': 1,
        'price_monthly': 9.99,
        'price_yearly': 99.99,
    },
    'team': {
        'name': 'Up To 3 Users',
        'device_limit': 6,
        'user_limit': 3,
        'price_monthly': 24.99,
        'price_yearly': 249.00,
    },
    'business': {
        'name': 'Up To 10 Users',
        'device_limit': 20,
        'user_limit': 10,
        'price_monthly': 79.99,
        'price_yearly': 799.99,
    },
    'enterprise': {
        'name': 'Enterprise',
        'device_limit': None,  # Unlimited or custom
        'user_limit': None,    # Unlimited or custom
        'price_per_user': 7.49,
        'min_users': 10,
    },
}

# Map Stripe Price IDs to plan keys
# These are the real Price IDs from your Stripe Dashboard
STRIPE_PRICE_TO_PLAN = {
    # Monthly
    'price_1Sjdb5GvNJex3j2wwMbFLzji': ('single', 'monthly'),
    'price_1SoNCJGvNJex3j2wTe2801Yx': ('team', 'monthly'),
    'price_1SoNDbGvNJex3j2w7zNyWTRx': ('business', 'monthly'),
    # Yearly
    'price_1SjdeQGvNJex3j2we8SZgt5h': ('single', 'yearly'),
    'price_1SoNCtGvNJex3j2wVtwV1I78': ('team', 'yearly'),
    'price_1SoNDwGvNJex3j2w8xFOAS8Q': ('business', 'yearly'),
}

# Plan keys to Stripe Price IDs
PLAN_TO_STRIPE_PRICE = {
    ('single', 'monthly'): 'price_1Sjdb5GvNJex3j2wwMbFLzji',
    ('single', 'yearly'): 'price_1SjdeQGvNJex3j2we8SZgt5h',
    ('team', 'monthly'): 'price_1SoNCJGvNJex3j2wTe2801Yx',
    ('team', 'yearly'): 'price_1SoNCtGvNJex3j2wVtwV1I78',
    ('business', 'monthly'): 'price_1SoNDbGvNJex3j2w7zNyWTRx',
    ('business', 'yearly'): 'price_1SoNDwGvNJex3j2w8xFOAS8Q',
}

# Default limits for users without subscription
DEFAULT_DEVICE_LIMIT = 0
DEFAULT_USER_LIMIT = 1


def get_plan_config(plan_key):
    """Get configuration for a plan by key."""
    return PLANS.get(plan_key)


def get_device_limit(plan_key, custom_limit=None):
    """Get device limit for a plan."""
    if custom_limit is not None:
        return custom_limit
    
    plan = PLANS.get(plan_key)
    if not plan:
        return DEFAULT_DEVICE_LIMIT
    
    return plan.get('device_limit', DEFAULT_DEVICE_LIMIT)


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
    return STRIPE_PRICE_TO_PLAN.get(price_id, (None, None))


def get_stripe_price_for_plan(plan_key, billing_period):
    """Get Stripe Price ID for a plan and billing period."""
    return PLAN_TO_STRIPE_PRICE.get((plan_key, billing_period))
