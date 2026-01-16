from utils.response_builder import (
    success_response,
    not_found_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_current_timestamp,
    get_path_param
)

devices_table = get_table('DEVICES_TABLE_NAME')


@error_handler
def lambda_handler(event, context):
    """
    POST /devices/{device_id}/heartbeat - Update device last active timestamp
    Authenticated endpoint
    Used by the extension to report device activity
    """
    user_id = get_user_id_from_event(event)
    device_id = get_path_param(event, 'device_id')
    
    # Check if device exists and belongs to user
    existing = devices_table.get_item(
        Key={
            'user_id': user_id,
            'device_id': device_id
        }
    )
    
    if 'Item' not in existing:
        return not_found_response('Device not found')
    
    # Update last_active
    response = devices_table.update_item(
        Key={
            'user_id': user_id,
            'device_id': device_id
        },
        UpdateExpression='SET last_active = :la',
        ExpressionAttributeValues={':la': get_current_timestamp()},
        ReturnValues='ALL_NEW'
    )
    
    return success_response(response['Attributes'])
