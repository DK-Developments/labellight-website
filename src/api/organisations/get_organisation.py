from utils.response_builder import (
    success_response,
    not_found_response,
    error_handler
)
from utils.helpers import (
    get_user_id_from_event,
    get_table
)

org_table = get_table('ORGANISATIONS_TABLE_NAME')
members_table = get_table('ORG_MEMBERS_TABLE_NAME')


@error_handler
def lambda_handler(event, context):
    """
    GET /organisation - Retrieve user's organisation
    Authenticated endpoint - requires valid JWT token
    Returns organisation details with user's role
    """
    user_id = get_user_id_from_event(event)
    
    # Find user's organisation membership
    membership_response = members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    memberships = membership_response.get('Items', [])
    if not memberships:
        return not_found_response('Not a member of any organisation')
    
    # Get the organisation details
    membership = memberships[0]
    org_id = membership['organisation_id']
    
    org_response = org_table.get_item(Key={'organisation_id': org_id})
    
    if 'Item' not in org_response:
        return not_found_response('Organisation not found')
    
    org = org_response['Item']
    
    # Add user's role to the response
    org['user_role'] = membership['role']
    
    # Get member count
    members_response = members_table.query(
        KeyConditionExpression='organisation_id = :oid',
        ExpressionAttributeValues={':oid': org_id},
        Select='COUNT'
    )
    org['member_count'] = members_response.get('Count', 0)
    
    return success_response(org)
