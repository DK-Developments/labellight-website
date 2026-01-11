import uuid
from utils.response_builder import (
    success_response,
    error_response,
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


@error_handler
def lambda_handler(event, context):
    """
    POST /organisation - Create a new organisation
    Authenticated endpoint - user becomes owner
    """
    user_id = get_user_id_from_event(event)
    
    # Check if user is already in an organisation
    existing_membership = members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    if existing_membership.get('Items'):
        return error_response('You are already a member of an organisation. Leave your current organisation first.', 409)
    
    # Parse and validate request
    body = parse_request_body(event)
    name = body.get('name', '').strip()
    
    is_valid, error_msg = validate_organisation_name(name)
    if not is_valid:
        return error_response(error_msg)
    
    # Create organisation
    timestamp = get_current_timestamp()
    org_id = str(uuid.uuid4())
    
    organisation = {
        'organisation_id': org_id,
        'name': name,
        'owner_id': user_id,
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Create owner membership
    membership = {
        'organisation_id': org_id,
        'user_id': user_id,
        'role': 'owner',
        'joined_at': timestamp
    }
    
    # Save both items
    org_table.put_item(Item=organisation)
    members_table.put_item(Item=membership)
    
    # Return organisation with user role
    organisation['user_role'] = 'owner'
    organisation['member_count'] = 1
    
    return success_response(organisation, 201)
