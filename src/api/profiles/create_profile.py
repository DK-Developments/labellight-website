from utils.response_builder import (
    success_response,
    error_response,
    error_handler
)
from utils.validators import validate_profile_data
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_current_timestamp,
    parse_request_body
)

table = get_table('TABLE_NAME')

@error_handler
def lambda_handler(event, context):
    """
    POST /profile - Create user profile
    Authenticated endpoint - user_id extracted from Cognito JWT
    """
    # Extract user_id from Cognito authorizer claims
    user_id = get_user_id_from_event(event)
    
    # Parse request body
    body = parse_request_body(event)
    
    # Extract and validate profile fields
    display_name = body.get('display_name', '').strip()
    bio = body.get('bio', '').strip()
    
    # Validate all fields
    is_valid, error_msg = validate_profile_data(display_name, bio)
    if not is_valid:
        return error_response(error_msg)
    
    # Create profile item
    timestamp = get_current_timestamp()
    profile = {
        'user_id': user_id,
        'display_name': display_name,
        'bio': bio,
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Check if profile already exists
    existing = table.get_item(Key={'user_id': user_id})
    if 'Item' in existing:
        return error_response('Profile already exists. Use PUT to update.', 409)
    
    # Save to DynamoDB
    table.put_item(Item=profile)
    
    return success_response(profile, 201)

