from utils.response_builder import (
    success_response,
    not_found_response,
    forbidden_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table,
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
    DELETE /organisation/members/{member_id} - Remove member from organisation
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
        return forbidden_response('Only admins can remove members')
    
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
    
    # Cannot remove owner
    if target['role'] == 'owner':
        return forbidden_response('Cannot remove the organisation owner')
    
    # Admins cannot remove other admins (only owner can)
    if target['role'] == 'admin' and membership['role'] != 'owner':
        return forbidden_response('Only the owner can remove admins')
    
    # Cannot remove yourself (use leave endpoint instead)
    if target_member_id == user_id:
        return forbidden_response('Use the leave endpoint to remove yourself')
    
    # Remove member
    members_table.delete_item(
        Key={
            'organisation_id': org_id,
            'user_id': target_member_id
        }
    )
    
    return success_response({'message': 'Member removed successfully'})
