"""
Create Stripe Checkout Session
Creates a checkout session for subscribing to a plan.

Supports both:
- Personal subscriptions (owner_type: 'user')
- Organisation subscriptions (owner_type: 'organisation')
"""
import os
import stripe
from utils.response_builder import success_response, error_response, error_handler
from utils.helpers import get_user_id_from_event, get_table, parse_request_body
from subscriptions.plans import PLAN_TO_STRIPE_PRICE, PLANS

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
website_url = os.environ.get('WEBSITE_URL', 'http://localhost:8000')

org_members_table = get_table('ORG_MEMBERS_TABLE_NAME')


def get_user_organisation(user_id):
    """Get the organisation the user belongs to and their role."""
    response = org_members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return None, None
    
    membership = items[0]
    return membership.get('organisation_id'), membership.get('role')


def validate_checkout_request(plan, billing_period, owner_type, user_id):
    """Validate checkout request parameters."""
    # Validate plan
    if plan not in PLANS:
        return False, f"Invalid plan: {plan}"
    
    # Validate billing period
    if billing_period not in ['monthly', 'yearly']:
        return False, "Billing period must be 'monthly' or 'yearly'"
    
    # Validate owner type
    if owner_type not in ['user', 'organisation']:
        return False, "Owner type must be 'user' or 'organisation'"
    
    # Check if plan requires organisation
    plan_config = PLANS.get(plan)
    if plan_config.get('user_limit', 1) > 1 and owner_type == 'user':
        return False, f"The {plan} plan requires an organisation for multiple users"
    
    return True, None


@error_handler
def lambda_handler(event, context):
    """
    POST /subscription - Create Stripe Checkout session
    
    Body:
    {
        "plan": "single|team|business",
        "billing_period": "monthly|yearly",
        "owner_type": "user|organisation"  // optional, defaults to 'user'
    }
    
    Returns:
    {
        "checkout_url": "https://checkout.stripe.com/..."
    }
    """
    user_id = get_user_id_from_event(event)
    body = parse_request_body(event)
    
    plan = body.get('plan', 'single')
    billing_period = body.get('billing_period', 'monthly')
    owner_type = body.get('owner_type', 'user')
    
    # Validate request
    is_valid, error_msg = validate_checkout_request(plan, billing_period, owner_type, user_id)
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Determine owner ID
    if owner_type == 'organisation':
        org_id, role = get_user_organisation(user_id)
        
        if not org_id:
            return error_response("You must belong to an organisation to purchase an organisation subscription", 400)
        
        if role not in ['owner', 'admin']:
            return error_response("Only organisation owners and admins can purchase subscriptions", 403)
        
        owner_id = org_id
    else:
        owner_id = user_id
    
    # Get Stripe Price ID
    price_id = PLAN_TO_STRIPE_PRICE.get((plan, billing_period))
    if not price_id:
        return error_response(f"No price configured for {plan} {billing_period}", 400)
    
    # Create Stripe checkout session
    try:
        checkout_session = stripe.checkout.Session.create(
            mode='subscription',
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            success_url=f"{website_url}/success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{website_url}/pricing.html",
            metadata={
                'user_id': user_id,
                'owner_id': owner_id,
                'owner_type': owner_type,
                'plan': plan,
                'billing_period': billing_period,
            },
            subscription_data={
                'metadata': {
                    'user_id': user_id,
                    'owner_id': owner_id,
                    'owner_type': owner_type,
                    'plan': plan,
                },
                # Add trial period for new subscriptions
                'trial_period_days': 7,
            },
            # Allow promotion codes
            allow_promotion_codes=True,
        )
        
        return success_response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        })
        
    except stripe.error.StripeError as e:
        return error_response(f"Stripe error: {str(e)}", 500)
