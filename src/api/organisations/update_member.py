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
    parse_request_body,
    get_path_param
)

members_table = get_table('ORG_MEMBERS_TABLE_NAME')


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
    PUT /organisation/members/{member_id} - Update member role
    Authenticated endpoint - requires admin or owner role
    """
    user_id = get_user_id_from_event(event)
    target_member_id = get_path_param(event, 'member_id')
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    # Check if user has admin privileges
    if membership['role'] not in ['owner', 'admin']:
        return forbidden_response('Only admins can update member roles')
    
    org_id = membership['organisation_id']
    
    # Get target member's membership
    target_membership = members_table.get_item(
        Key={
            'organisation_id': org_id,
            'user_id': target_member_id
        }
    )
    
    if 'Item' not in target_membership:
        return not_found_response('Member not found in this organisation')
    
    target = target_membership['Item']
    
    # Cannot modify owner
    if target['role'] == 'owner':
        return forbidden_response('Cannot modify the organisation owner')
    
    # Parse request
    body = parse_request_body(event)
    new_role = body.get('role', '').strip()
    
    # Validate role
    if new_role not in ['member', 'admin']:
        return error_response('Role must be "member" or "admin"')
    
    # Only owner can promote to admin
    if new_role == 'admin' and membership['role'] != 'owner':
        return forbidden_response('Only the owner can promote members to admin')
    
    # Update member role
    response = members_table.update_item(
        Key={
            'organisation_id': org_id,
            'user_id': target_member_id
        },
        UpdateExpression='SET #r = :role, updated_at = :updated_at',
        ExpressionAttributeNames={'#r': 'role'},
        ExpressionAttributeValues={
            ':role': new_role,
            ':updated_at': get_current_timestamp()
        },
        ReturnValues='ALL_NEW'
    )
    
    return success_response(response['Attributes'])
