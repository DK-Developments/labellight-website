"""
Create Stripe Customer Portal Session
Allows users to manage their subscription via Stripe's hosted portal.
"""
import os
import stripe
from utils.response_builder import success_response, error_response, error_handler
from utils.helpers import get_user_id_from_event, get_table

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
website_url = os.environ.get('WEBSITE_URL', 'http://localhost:8000')

subscriptions_table = get_table('SUBSCRIPTIONS_TABLE_NAME')
org_members_table = get_table('ORG_MEMBERS_TABLE_NAME')


def get_user_subscription(user_id):
    """Get user's subscription (personal or org)."""
    # Check org membership first
    org_response = org_members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    org_membership = org_response.get('Items', [])
    
    # Try org subscription first
    if org_membership:
        org_id = org_membership[0].get('organisation_id')
        role = org_membership[0].get('role')
        
        # Only owners/admins can access portal for org subscriptions
        if role in ['owner', 'admin']:
            sub_response = subscriptions_table.query(
                IndexName='owner_id-index',
                KeyConditionExpression='owner_id = :oid',
                ExpressionAttributeValues={':oid': org_id}
            )
            subs = sub_response.get('Items', [])
            if subs:
                return subs[0], True, role
    
    # Fall back to personal subscription
    sub_response = subscriptions_table.query(
        IndexName='owner_id-index',
        KeyConditionExpression='owner_id = :oid',
        ExpressionAttributeValues={':oid': user_id}
    )
    
    subs = sub_response.get('Items', [])
    if subs:
        return subs[0], False, 'owner'
    
    return None, False, None


@error_handler
def lambda_handler(event, context):
    """
    POST /subscription/portal - Create Stripe Customer Portal session
    
    Returns:
    {
        "portal_url": "https://billing.stripe.com/..."
    }
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's subscription
    subscription, is_org, role = get_user_subscription(user_id)
    
    if not subscription:
        return error_response("No subscription found", 404)
    
    stripe_customer_id = subscription.get('stripe_customer_id')
    
    if not stripe_customer_id:
        return error_response("No Stripe customer associated with subscription", 400)
    
    # Only owners/admins can access portal
    if is_org and role not in ['owner', 'admin']:
        return error_response("Only organisation owners and admins can manage subscriptions", 403)
    
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{website_url}/profile.html#subscription",
        )
        
        return success_response({
            'portal_url': portal_session.url
        })
        
    except stripe.error.StripeError as e:
        return error_response(f"Stripe error: {str(e)}", 500)
