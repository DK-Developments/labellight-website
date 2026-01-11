import uuid
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

members_table = get_table('ORG_MEMBERS_TABLE_NAME')
invitations_table = get_table('ORG_INVITATIONS_TABLE_NAME')
org_table = get_table('ORGANISATIONS_TABLE_NAME')


def get_user_membership(user_id):
    """Get user's organisation membership."""
    response = members_table.query(
        IndexName='user_id-index',
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    items = response.get('Items', [])
    return items[0] if items else None


def validate_email(email):
    """Basic email validation."""
    if not email or '@' not in email:
        return (False, 'Valid email is required')
    return (True, None)


@error_handler
def lambda_handler(event, context):
    """
    POST /organisation/members/invite - Invite a new member
    Authenticated endpoint - requires admin or owner role
    """
    user_id = get_user_id_from_event(event)
    
    # Get user's membership
    membership = get_user_membership(user_id)
    if not membership:
        return not_found_response('Not a member of any organisation')
    
    # Check if user has admin privileges
    if membership['role'] not in ['owner', 'admin']:
        return forbidden_response('Only admins can invite members')
    
    org_id = membership['organisation_id']
    
    # Parse request
    body = parse_request_body(event)
    email = body.get('email', '').strip().lower()
    role = body.get('role', 'member')
    
    # Validate email
    is_valid, error_msg = validate_email(email)
    if not is_valid:
        return error_response(error_msg)
    
    # Validate role
    if role not in ['member', 'admin']:
        return error_response('Role must be "member" or "admin"')
    
    # Only owner can invite admins
    if role == 'admin' and membership['role'] != 'owner':
        return forbidden_response('Only the owner can invite admins')
    
    # Check if invitation already exists
    existing_invitations = invitations_table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :email',
        FilterExpression='organisation_id = :oid',
        ExpressionAttributeValues={
            ':email': email,
            ':oid': org_id
        }
    )
    
    if existing_invitations.get('Items'):
        return error_response('An invitation has already been sent to this email', 409)
    
    # Get organisation name
    org_response = org_table.get_item(Key={'organisation_id': org_id})
    org_name = org_response.get('Item', {}).get('name', 'Organisation')
    
    # Create invitation
    timestamp = get_current_timestamp()
    invitation_id = str(uuid.uuid4())
    token = str(uuid.uuid4())  # Used for accepting invitation
    
    invitation = {
        'organisation_id': org_id,
        'invitation_id': invitation_id,
        'email': email,
        'role': role,
        'token': token,
        'invited_by': user_id,
        'created_at': timestamp,
        'expires_at': timestamp,  # TODO: Add proper expiration
        'status': 'pending'
    }
    
    invitations_table.put_item(Item=invitation)
    
    # TODO: Send invitation email
    
    return success_response({
        'invitation_id': invitation_id,
        'email': email,
        'role': role,
        'organisation_name': org_name,
        'message': 'Invitation sent successfully'
    }, 201)
