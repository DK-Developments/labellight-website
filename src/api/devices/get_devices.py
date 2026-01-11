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

# Device limits per subscription plan
DEVICE_LIMITS = {
    'free': 1,
    'starter': 2,
    'professional': 3,
    'business': 5,
    'enterprise': 10
}

DEFAULT_DEVICE_LIMIT = 3


def get_user_subscription_plan(user_id):
    """Get user's subscription plan. TODO: Implement actual lookup."""
    # Placeholder - in production, look up subscription
    return 'professional'


@error_handler
def lambda_handler(event, context):
    """
    GET /devices - Get all registered devices for the user
    Authenticated endpoint
    Returns devices list and limit information
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
    
    # Get device limit based on subscription
    plan = get_user_subscription_plan(user_id)
    max_devices = DEVICE_LIMITS.get(plan, DEFAULT_DEVICE_LIMIT)
    
    return success_response({
        'devices': devices,
        'limits': {
            'current': len(devices),
            'max': max_devices,
            'plan': plan
        }
    })
