from utils.response_builder import (
    success_response,
    not_found_response,
    forbidden_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table
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
    POST /organisation/leave - Leave the organisation
    Authenticated endpoint - for non-owner members
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    # Owner cannot leave - must transfer ownership or delete org
    if membership['role'] == 'owner':
        return forbidden_response('Organisation owner cannot leave. Transfer ownership first or delete the organisation.')
    
    org_id = membership['organisation_id']
    
    # Remove membership
    members_table.delete_item(
        Key={
            'organisation_id': org_id,
            'user_id': user_id
        }
    )
    
    return success_response({'message': 'Successfully left the organisation'})
