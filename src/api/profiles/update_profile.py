from utils.response_builder import (
    success_response,
    error_response,
    not_found_response,
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
    PUT /profile - Update user profile
    Authenticated endpoint - user_id extracted from Cognito JWT
    """
    # Extract user_id from Cognito authorizer claims
    user_id = get_user_id_from_event(event)
    
    # Parse request body
    body = parse_request_body(event)
    
    # Extract fields (allowing None for fields not being updated)
    display_name = body.get('display_name', '').strip() if body.get('display_name') else ''
    bio = body.get('bio', '').strip() if 'bio' in body else None
    phone = body.get('phone', '').strip() if 'phone' in body else None
    company = body.get('company', '').strip() if 'company' in body else None
    address = body.get('address', '').strip() if 'address' in body else None
    city = body.get('city', '').strip() if 'city' in body else None
    state = body.get('state', '').strip() if 'state' in body else None
    country = body.get('country', '').strip() if 'country' in body else None
    
    # Validate all provided fields
    is_valid, error_msg = validate_profile_data(display_name, bio, for_update=True)
    if not is_valid:
        return error_response(error_msg)
    
    # Check if profile exists
    existing = table.get_item(Key={'user_id': user_id})
    if 'Item' not in existing:
        return not_found_response('Profile not found. Use POST to create.')
    
    # Build update expression dynamically
    update_expression = "SET updated_at = :updated_at"
    expression_values = {':updated_at': get_current_timestamp()}
    
    # Map of field names to values
    optional_fields = {
        'display_name': display_name,
        'bio': bio,
        'phone': phone,
        'company': company,
        'address': address,
        'city': city,
        'state': state,
        'country': country
    }
    
    for field_name, value in optional_fields.items():
        if value is not None:
            update_expression += f", {field_name} = :{field_name}"
            expression_values[f':{field_name}'] = value if value else None
    
    # Update profile
    response = table.update_item(
        Key={'user_id': user_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_values,
        ReturnValues='ALL_NEW'
    )
    
    return success_response(response['Attributes'])

