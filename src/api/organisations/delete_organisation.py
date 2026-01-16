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

org_table = get_table('ORGANISATIONS_TABLE_NAME')
members_table = get_table('ORG_MEMBERS_TABLE_NAME')
invitations_table = get_table('ORG_INVITATIONS_TABLE_NAME')


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
    DELETE /organisation - Delete organisation
    Authenticated endpoint - requires owner role
    Removes all members and pending invitations
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    # Only owner can delete
    if membership['role'] != 'owner':
        return forbidden_response('Only the organisation owner can delete the organisation')
    
    org_id = membership['organisation_id']
    
    # Get all members to delete
    members_response = members_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id}
    )
    
    # Delete all members
    for member in members_response.get('Items', []):
        members_table.delete_item(
            Key={
                'organisation_id': org_id,
                'user_id': member['user_id']
            }
        )
    
    # Delete pending invitations
    invitations_response = invitations_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id}
    )
    
    for invitation in invitations_response.get('Items', []):
        invitations_table.delete_item(
            Key={
                'organisation_id': org_id,
                'invitation_id': invitation['invitation_id']
            }
        )
    
    # Delete organisation
    org_table.delete_item(Key={'organisation_id': org_id})
    
    return success_response({'message': 'Organisation deleted successfully'})
