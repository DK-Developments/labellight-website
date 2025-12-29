from utils.response_builder import (
    success_response,
    not_found_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_query_param
)

table = get_table('TABLE_NAME')


@error_handler
def lambda_handler(event, context):
    """
    GET /profile - Retrieve user profile
    GET /profile?user_id={id} - Retrieve specific user's profile
    Authenticated endpoint - requires valid JWT token
    """
    # Extract authenticated user_id from Cognito authorizer claims
    auth_user_id = get_user_id_from_event(event)
    
    # Check if requesting another user's profile via query parameter
    target_user_id = get_query_param(event, 'user_id', auth_user_id)
    
    # Get profile from DynamoDB
    response = table.get_item(Key={'user_id': target_user_id})
    
    if 'Item' not in response:
        return not_found_response('Profile not found')
    
    return success_response(response['Item'])

