"""
Get Subscription
Returns the user's subscription status, checking both personal and organisation subscriptions.

LOGIC:
1. Check if user belongs to an organisation
2. If yes, check if org has an active subscription
3. If no org or no org subscription, check user's personal subscription
4. Return subscription details with user limits and usage
"""
import os
from utils.response_builder import success_response, error_handler
from utils.helpers import get_user_id_from_event, get_table
from subscriptions.plans import get_user_limit, PLANS

subscriptions_table = get_table('SUBSCRIPTIONS_TABLE_NAME')
org_members_table = get_table('ORG_MEMBERS_TABLE_NAME')
organisations_table = get_table('ORGANISATIONS_TABLE_NAME')


def get_user_organisation(user_id):
    """Get the organisation the user belongs to, if any."""
    response = org_members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return None
    
    # Return the first (should only be one)
    membership = items[0]
    org_id = membership.get('organisation_id')
    
    # Get org details
    org_response = organisations_table.get_item(
        Key={'organisation_id': org_id}
    )
    
    org = org_response.get('Item')
    if org:
        org['user_role'] = membership.get('role', 'member')
    
    return org


def get_subscription_by_owner(owner_id):
    """Get subscription by owner ID (user or organisation)."""
    response = subscriptions_table.query(
        IndexName='owner_id-index',
        KeyConditionExpression='owner_id = :oid',
        ExpressionAttributeValues={':oid': owner_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return None
    
    # Return the most recent active subscription
    active_subs = [s for s in items if s.get('status') in ['active', 'trialing']]
    if active_subs:
        return active_subs[0]
    
    # Return most recent if no active
    return items[0]


def count_org_members(org_id):
    """Count members in an organisation."""
    response = org_members_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id},
        Select='COUNT'
    )
    return response.get('Count', 0)


@error_handler
def lambda_handler(event, context):
    """
    GET /subscription - Get user's subscription status
    
    Returns:
    - subscription: The active subscription (personal or org)
    - limits: User limits
    - usage: Current user counts
    - organisation: Organisation details if subscription is shared
    """
    user_id = get_user_id_from_event(event)
    
    # Check if user belongs to an organisation
    organisation = get_user_organisation(user_id)
    
    subscription = None
    is_org_subscription = False
    
    # Check org subscription first (org subscription takes priority)
    if organisation:
        org_id = organisation.get('organisation_id')
        subscription = get_subscription_by_owner(org_id)
        if subscription:
            is_org_subscription = True
    
    # Fall back to personal subscription
    if not subscription:
        subscription = get_subscription_by_owner(user_id)
    
    # No subscription found
    if not subscription:
        return success_response({
            'subscription': None,
            'limits': {
                'users': 1
            },
            'usage': {
                'users': 1
            },
            'organisation': organisation,
            'has_access': False
        })
    
    # Get plan details
    plan_key = subscription.get('plan', 'single')
    plan_config = PLANS.get(plan_key, {})
    
    # Calculate limits (may be custom for enterprise)
    user_limit = subscription.get('custom_user_limit') or get_user_limit(plan_key)
    
    # Calculate usage
    if is_org_subscription:
        owner_id = organisation.get('organisation_id')
        user_count = count_org_members(owner_id)
    else:
        user_count = 1
    
    # Determine if user has active access
    has_access = subscription.get('status') in ['active', 'trialing']
    
    return success_response({
        'subscription': {
            'subscription_id': subscription.get('subscription_id'),
            'plan': plan_key,
            'plan_name': plan_config.get('name', plan_key),
            'billing_period': subscription.get('billing_period', 'monthly'),
            'status': subscription.get('status'),
            'current_period_start': subscription.get('current_period_start'),
            'current_period_end': subscription.get('current_period_end'),
            'cancel_at_period_end': subscription.get('cancel_at_period_end', False),
            'trial_end': subscription.get('trial_end'),
            'is_organisation': is_org_subscription,
            'owner_id': subscription.get('owner_id'),
        },
        'limits': {
            'users': user_limit
        },
        'usage': {
            'users': user_count
        },
        'organisation': organisation if is_org_subscription else None,
        'has_access': has_access
    })
