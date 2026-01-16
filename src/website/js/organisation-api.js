/**
 * Organisation API Client
 * Provides functions for managing organisations, members, and invitations
 * 
 * @author Eprouvez
 * @version 1.0.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Get user's organisation
 * const org = await getOrganisation();
 * 
 * // Create a new organisation
 * const newOrg = await createOrganisation({ name: 'My Company' });
 * 
 * // Invite a member
 * await inviteOrganisationMember('email@example.com', 'member');
 */

/**
 * Get the current user's organisation
 * @returns {Promise<Object|null>} Organisation data or null if not in an organisation
 */
async function getOrganisation() {
  return apiGet('/organisation');
}

/**
 * Create a new organisation (current user becomes owner/admin)
 * @param {Object} orgData - Organisation data
 * @param {string} orgData.name - Organisation name
 * @returns {Promise<Object>} Created organisation data
 */
async function createOrganisation(orgData) {
  return apiPost('/organisation', orgData);
}

/**
 * Update organisation details (admin only)
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - Organisation name
 * @returns {Promise<Object>} Updated organisation data
 */
async function updateOrganisation(updates) {
  return apiPut('/organisation', updates);
}

/**
 * Delete organisation (owner only)
 * @returns {Promise<Object>} Deletion confirmation
 */
async function deleteOrganisation() {
  return apiDelete('/organisation');
}

/**
 * Get organisation members
 * @returns {Promise<Array>} List of organisation members
 */
async function getOrganisationMembers() {
  return apiGet('/organisation/members');
}

/**
 * Invite a new member to the organisation (admin only)
 * @param {string} email - Email address to invite
 * @param {string} role - Role to assign ('member' or 'admin')
 * @returns {Promise<Object>} Invitation data
 */
async function inviteOrganisationMember(email, role = 'member') {
  return apiPost('/organisation/members/invite', { email, role });
}

/**
 * Update a member's role (admin only)
 * @param {string} memberId - Member's user ID
 * @param {string} role - New role ('member' or 'admin')
 * @returns {Promise<Object>} Updated member data
 */
async function updateOrganisationMemberRole(memberId, role) {
  return apiPut('/organisation/members/' + memberId, { role });
}

/**
 * Remove a member from the organisation (admin only)
 * @param {string} memberId - Member's user ID
 * @returns {Promise<Object>} Removal confirmation
 */
async function removeOrganisationMember(memberId) {
  return apiDelete('/organisation/members/' + memberId);
}

/**
 * Leave the organisation (for non-owners)
 * @returns {Promise<Object>} Leave confirmation
 */
async function leaveOrganisation() {
  return apiPost('/organisation/leave');
}

/**
 * Get pending invitations for the organisation (admin only)
 * @returns {Promise<Array>} List of pending invitations
 */
async function getPendingInvitations() {
  return apiGet('/organisation/invitations');
}

/**
 * Cancel a pending invitation (admin only)
 * @param {string} invitationId - Invitation ID to cancel
 * @returns {Promise<Object>} Cancellation confirmation
 */
async function cancelInvitation(invitationId) {
  return apiDelete('/organisation/invitations/' + invitationId);
}

/**
 * Accept an organisation invitation
 * @param {string} invitationToken - Invitation token from email
 * @returns {Promise<Object>} Organisation data after joining
 */
async function acceptInvitation(invitationToken) {
  return apiPost('/organisation/invitations/accept', { token: invitationToken });
}

/**
 * Transfer ownership to another admin (owner only)
 * @param {string} newOwnerId - User ID of the new owner
 * @returns {Promise<Object>} Transfer confirmation
 */
async function transferOwnership(newOwnerId) {
  return apiPost('/organisation/transfer-ownership', { new_owner_id: newOwnerId });
}
