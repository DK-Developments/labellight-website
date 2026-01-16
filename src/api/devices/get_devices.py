import os
from utils.response_builder import (
    success_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table
)

devices_table = get_table('DEVICES_TABLE_NAME')

# These tables are optional - only used if environment vars are set
subscriptions_table_name = os.environ.get('SUBSCRIPTIONS_TABLE_NAME')
org_members_table_name = os.environ.get('ORG_MEMBERS_TABLE_NAME')

# Default device limit for users without subscription
DEFAULT_DEVICE_LIMIT = 0


def get_subscription_table():
    """Get subscriptions table if configured."""
    if subscriptions_table_name:
        return get_table('SUBSCRIPTIONS_TABLE_NAME')
    return None


def get_org_members_table():
    """Get org members table if configured."""
    if org_members_table_name:
        return get_table('ORG_MEMBERS_TABLE_NAME')
    return None


def get_user_organisation_id(user_id):
    """Get the organisation ID the user belongs to, if any."""
    org_members_table = get_org_members_table()
    if not org_members_table:
        return None
    
    response = org_members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    items = response.get('Items', [])
    if items:
        return items[0].get('organisation_id')
    return None


def get_subscription_for_user(user_id):
    """
    Get the effective subscription for a user.
    Checks organisation subscription first, then personal.
    
    Returns: (subscription, is_org_subscription)
    """
    subs_table = get_subscription_table()
    if not subs_table:
        return None, False
    
    # Check if user belongs to an organisation
    org_id = get_user_organisation_id(user_id)
    
    # Check org subscription first
    if org_id:
        response = subs_table.query(
            IndexName='owner_id-index',
            KeyConditionExpression='owner_id = :oid',
            ExpressionAttributeValues={':oid': org_id}
        )
        subs = [s for s in response.get('Items', []) if s.get('status') in ['active', 'trialing']]
        if subs:
            return subs[0], True
    
    # Check personal subscription
    response = subs_table.query(
        IndexName='owner_id-index',
        KeyConditionExpression='owner_id = :oid',
        ExpressionAttributeValues={':oid': user_id}
    )
    subs = [s for s in response.get('Items', []) if s.get('status') in ['active', 'trialing']]
    if subs:
        return subs[0], False
    
    return None, False


def count_org_devices(org_id):
    """Count total devices across all organisation members."""
    org_members_table = get_org_members_table()
    if not org_members_table:
        return 0
    
    # Get all org members
    members_response = org_members_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id}
    )
    
    total = 0
    for member in members_response.get('Items', []):
        member_user_id = member.get('user_id')
        device_response = devices_table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': member_user_id},
            Select='COUNT'
        )
        total += device_response.get('Count', 0)
    
    return total


@error_handler
def lambda_handler(event, context):
    """
    GET /devices - Get all registered devices for the user
    Authenticated endpoint
    Returns devices list and limit information based on subscription
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's devices
    response = devices_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    devices = response.get('Items', [])
    
    # Sort by last_active descending
    devices.sort(key=lambda x: x.get('last_active', ''), reverse=True)
    
    # Get subscription and device limit
    subscription, is_org_sub = get_subscription_for_user(user_id)
    
    if subscription:
        max_devices = subscription.get('device_limit', DEFAULT_DEVICE_LIMIT)
        plan = subscription.get('plan', 'unknown')
        
        # For org subscriptions, count all org devices
        if is_org_sub:
            org_id = get_user_organisation_id(user_id)
            current_count = count_org_devices(org_id) if org_id else len(devices)
        else:
            current_count = len(devices)
    else:
        max_devices = DEFAULT_DEVICE_LIMIT
        plan = 'none'
        current_count = len(devices)
    
    return success_response({
        'devices': devices,
        'limits': {
            'current': current_count,
            'max': max_devices,
            'plan': plan,
            'is_shared': is_org_sub
        }
    })
