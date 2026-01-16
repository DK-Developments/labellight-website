from utils.response_builder import (
    success_response,
    not_found_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table
)

members_table = get_table('ORG_MEMBERS_TABLE_NAME')
profiles_table = get_table('TABLE_NAME')


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
    GET /organisation/members - Get all organisation members
    Authenticated endpoint - must be a member of the organisation
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    org_id = membership['organisation_id']
    
    # Get all members
    members_response = members_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id}
    )
    
    members = []
    for member in members_response.get('Items', []):
        member_user_id = member['user_id']
        
        # Get profile info for each member
        profile_response = profiles_table.get_item(Key={'user_id': member_user_id})
        profile = profile_response.get('Item', {})
        
        members.append({
            'user_id': member_user_id,
            'role': member['role'],
            'joined_at': member['joined_at'],
            'display_name': profile.get('display_name', 'Unknown'),
            'email': profile.get('email', '')
        })
    
    # Sort: owner first, then admins, then members
    role_order = {'owner': 0, 'admin': 1, 'member': 2}
    members.sort(key=lambda x: role_order.get(x['role'], 3))
    
    return success_response(members)
