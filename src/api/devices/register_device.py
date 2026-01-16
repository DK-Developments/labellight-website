import os
import uuid
from utils.response_builder import (
    success_response,
    error_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_current_timestamp,
    parse_request_body
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
    
    Returns: (subscription, is_org_subscription, org_id)
    """
    subs_table = get_subscription_table()
    if not subs_table:
        return None, False, None
    
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
            return subs[0], True, org_id
    
    # Check personal subscription
    response = subs_table.query(
        IndexName='owner_id-index',
        KeyConditionExpression='owner_id = :oid',
        ExpressionAttributeValues={':oid': user_id}
    )
    subs = [s for s in response.get('Items', []) if s.get('status') in ['active', 'trialing']]
    if subs:
        return subs[0], False, None
    
    return None, False, None


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


def validate_device_data(name, fingerprint):
    """Validate device registration data."""
    if not name or not name.strip():
        return (False, 'Device name is required')
    
    if len(name) > 100:
        return (False, 'Device name must not exceed 100 characters')
    
    if not fingerprint or not fingerprint.strip():
        return (False, 'Device fingerprint is required')
    
    return (True, None)


@error_handler
def lambda_handler(event, context):
    """
    POST /devices - Register a new device
    Authenticated endpoint
    Checks device limits based on subscription
    """
    user_id = get_user_id_from_event(event)
    
    # Parse request
    body = parse_request_body(event)
    name = body.get('name', '').strip()
    fingerprint = body.get('fingerprint', '').strip()
    browser = body.get('browser', '').strip()
    user_agent = body.get('user_agent', '').strip()
    device_type = body.get('device_type', '').strip()
    
    # Validate
    is_valid, error_msg = validate_device_data(name, fingerprint)
    if not is_valid:
        return error_response(error_msg)
    
    # Check if device with same fingerprint already exists
    existing_devices = devices_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='fingerprint = :fp',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':fp': fingerprint
        }
    )
    
    if existing_devices.get('Items'):
        # Device already registered, update last_active
        existing = existing_devices['Items'][0]
        devices_table.update_item(
            Key={
                'user_id': user_id,
                'device_id': existing['device_id']
            },
            UpdateExpression='SET last_active = :la',
            ExpressionAttributeValues={':la': get_current_timestamp()}
        )
        return success_response(existing)
    
    # Get subscription and device limit
    subscription, is_org_sub, org_id = get_subscription_for_user(user_id)
    
    if not subscription:
        return error_response(
            'No active subscription. Please subscribe to register devices.',
            403
        )
    
    max_devices = subscription.get('device_limit', DEFAULT_DEVICE_LIMIT)
    
    # Calculate current device count
    if is_org_sub and org_id:
        # For org subscriptions, count all devices across the org
        current_count = count_org_devices(org_id)
    else:
        # For personal subscriptions, count user's devices
        all_devices = devices_table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
            Select='COUNT'
        )
        current_count = all_devices.get('Count', 0)
    
    # Check device limit
    if current_count >= max_devices:
        plan_name = subscription.get('plan', 'current')
        if is_org_sub:
            return error_response(
                f'Organisation device limit reached ({current_count}/{max_devices} devices). '
                f'Remove an existing device or upgrade your organisation\'s plan.',
                403
            )
        else:
            return error_response(
                f'Device limit reached ({current_count}/{max_devices} devices). '
                f'Remove an existing device or upgrade your plan.',
                403
            )
    
    # Create new device
    timestamp = get_current_timestamp()
    device_id = str(uuid.uuid4())
    
    device = {
        'user_id': user_id,
        'device_id': device_id,
        'name': name,
        'fingerprint': fingerprint,
        'browser': browser,
        'user_agent': user_agent,
        'device_type': device_type,
        'registered_at': timestamp,
        'last_active': timestamp
    }
    
    devices_table.put_item(Item=device)
    
    return success_response(device, 201)
