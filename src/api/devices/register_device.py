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
    return 'professional'


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
    
    # Get current device count
    all_devices = devices_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id},
        Select='COUNT'
    )
    
    current_count = all_devices.get('Count', 0)
    
    # Check device limit
    plan = get_user_subscription_plan(user_id)
    max_devices = DEVICE_LIMITS.get(plan, DEFAULT_DEVICE_LIMIT)
    
    if current_count >= max_devices:
        return error_response(
            f'Device limit reached ({max_devices} devices). Remove an existing device or upgrade your plan.',
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
