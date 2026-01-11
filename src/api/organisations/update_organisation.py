from utils.response_builder import (
    success_response,
    error_response,
    not_found_response,
    forbidden_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
    get_current_timestamp,
    parse_request_body
)

org_table = get_table('ORGANISATIONS_TABLE_NAME')
members_table = get_table('ORG_MEMBERS_TABLE_NAME')


def validate_organisation_name(name):
    """Validate organisation name."""
    if not name or not name.strip():
        return (False, 'Organisation name is required')
    
    name = name.strip()
    if len(name) < 2:
        return (False, 'Organisation name must be at least 2 characters')
    
    if len(name) > 100:
        return (False, 'Organisation name must not exceed 100 characters')
    
    return (True, None)


def get_user_membership(user_id):
    """Get user's organisation membership."""
    response = members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    items = response.get('Items', [])
    return items[0] if items else None


@error_handler
def lambda_handler(event, context):
    """
    PUT /organisation - Update organisation details
    Authenticated endpoint - requires admin or owner role
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    # Check if user has admin privileges
    if membership['role'] not in ['owner', 'admin']:
        return forbidden_response('Only admins can update organisation details')
    
    org_id = membership['organisation_id']
    
    # Parse and validate request
    body = parse_request_body(event)
    name = body.get('name', '').strip() if body.get('name') else None
    
    if name:
        is_valid, error_msg = validate_organisation_name(name)
        if not is_valid:
            return error_response(error_msg)
    
    # Build update expression
    update_expression = "SET updated_at = :updated_at"
    expression_values = {':updated_at': get_current_timestamp()}
    
    if name:
        update_expression += ", #n = :name"
        expression_values[':name'] = name
    
    # Update organisation
    response = org_table.update_item(
        Key={'organisation_id': org_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_values,
        ExpressionAttributeNames={'#n': 'name'} if name else {},
        ReturnValues='ALL_NEW'
    )
    
    org = response['Attributes']
    org['user_role'] = membership['role']
    
    return success_response(org)
