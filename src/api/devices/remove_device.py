from utils.response_builder import (
    success_response,
    not_found_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_path_param
)

devices_table = get_table('DEVICES_TABLE_NAME')


@error_handler
def lambda_handler(event, context):
    """
    DELETE /devices/{device_id} - Remove/deauthorize a device
    Authenticated endpoint
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
    
    # Delete device
    devices_table.delete_item(
        Key={
            'user_id': user_id,
            'device_id': device_id
        }
    )
    
    return success_response({'message': 'Device removed successfully'})
