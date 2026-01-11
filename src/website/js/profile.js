/**
 * Profile Page Controller
 * Handles user profile, organisation, devices, and subscription management
 * 
 * @author Eprouvez
 * @version 2.0.0
 * 
 * USAGE:
 * This script runs automatically when loaded on the profile page.
 * It requires authentication and will redirect to login if not authenticated.
 */

// Check if user is authenticated
requireAuth();

// Global state
let currentUser = null;
let currentProfile = null;
let currentOrganisation = null;
let userRole = null;
let pendingConfirmAction = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  initializeTabs();
  initializeModals();
  initializeProfileForm();
  initializeOrganisationForms();
  loadAllData();
  handleInitialTab();
});

// Handle initial tab from URL hash or sessionStorage
function handleInitialTab() {
  // Check sessionStorage first (set by navbar dropdown)
  const storedTab = sessionStorage.getItem('profileActiveTab');
  if (storedTab) {
    switchTab(storedTab);
    sessionStorage.removeItem('profileActiveTab');
    return;
  }
  
  // Check URL hash
  const hash = window.location.hash.replace('#', '');
  if (hash && ['profile', 'organisation', 'devices', 'subscription'].includes(hash)) {
    switchTab(hash);
  }
}

// Listen for hash changes
window.addEventListener('hashchange', function() {
  const hash = window.location.hash.replace('#', '');
  if (hash && ['profile', 'organisation', 'devices', 'subscription'].includes(hash)) {
    switchTab(hash);
  }
});

// ========================================
// Data Loading Functions
// ========================================

async function loadAllData() {
  try {
    await Promise.all([
      loadUserProfile(),
      loadOrganisation(),
      loadDevices(),
      loadSubscriptionStatus()
    ]);
  } catch (error) {
    console.error('Error loading profile data:', error);
  }
}

async function loadUserProfile() {
  try {
    const profile = await getProfile();
    
    if (!profile) {
      // No profile found, redirect to onboarding
      window.location.href = 'onboarding.html';
      return;
    }
    
    currentProfile = profile;
    currentUser = auth.getUserInfo();
    
    // Update header
    displayProfileHeader(profile);
    
    // Update profile details view
    displayProfileDetails(profile);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showErrorMessage('profile-error-message', 'Failed to load profile data.');
  }
}

function displayProfileHeader(profile) {
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const avatarInitialsEl = document.getElementById('avatar-initials');
  
  if (userNameEl) {
    userNameEl.textContent = profile.display_name || 'there';
  }
  
  if (userEmailEl && currentUser) {
    userEmailEl.textContent = currentUser.email || '';
  }
  
  if (avatarInitialsEl && profile.display_name) {
    const initials = profile.display_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    avatarInitialsEl.textContent = initials || '?';
  }
}

function displayProfileDetails(profile) {
  setElementText('display-name-value', profile.display_name || '-');
  setElementText('email-value', currentUser?.email || '-');
  setElementText('phone-value', profile.phone || '-');
  setElementText('company-value', profile.company || '-');
  
  // Format address
  const addressParts = [
    profile.address,
    profile.city,
    profile.state,
    profile.country
  ].filter(Boolean);
  setElementText('address-value', addressParts.join(', ') || '-');
  
  setElementText('bio-value', profile.bio || '-');
  
  // Pre-fill edit form
  setInputValue('edit-display-name', profile.display_name || '');
  setInputValue('edit-phone', profile.phone || '');
  setInputValue('edit-company', profile.company || '');
  setInputValue('edit-address', profile.address || '');
  setInputValue('edit-city', profile.city || '');
  setInputValue('edit-state', profile.state || '');
  setInputValue('edit-country', profile.country || '');
  setInputValue('edit-bio', profile.bio || '');
}

// ========================================
// Tab Navigation
// ========================================

function initializeTabs() {
  const navItems = document.querySelectorAll('.profile-nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  // Update nav items
  document.querySelectorAll('.profile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });
  
  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
  });
}

// ========================================
// Profile Edit Functions
// ========================================

function initializeProfileForm() {
  const editBtn = document.getElementById('edit-profile-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const form = document.getElementById('profile-edit-form');
  
  if (editBtn) {
    editBtn.addEventListener('click', showProfileEditForm);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideProfileEditForm);
  }
  
  if (form) {
    form.addEventListener('submit', handleProfileUpdate);
  }
}

function showProfileEditForm() {
  document.getElementById('profile-details-view').style.display = 'none';
  document.getElementById('profile-edit-form').style.display = 'block';
  document.getElementById('edit-profile-btn').style.display = 'none';
}

function hideProfileEditForm() {
  document.getElementById('profile-details-view').style.display = 'block';
  document.getElementById('profile-edit-form').style.display = 'none';
  document.getElementById('edit-profile-btn').style.display = 'inline-flex';
  hideErrorMessage('profile-error-message');
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = document.getElementById('save-profile-btn');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  
  try {
    const updates = {
      display_name: form.display_name.value.trim(),
      phone: form.phone.value.trim() || null,
      company: form.company.value.trim() || null,
      address: form.address.value.trim() || null,
      city: form.city.value.trim() || null,
      state: form.state.value.trim() || null,
      country: form.country.value.trim() || null,
      bio: form.bio.value.trim() || null
    };
    
    const updatedProfile = await updateProfile(updates);
    
    if (updatedProfile) {
      currentProfile = updatedProfile;
      displayProfileHeader(updatedProfile);
      displayProfileDetails(updatedProfile);
      hideProfileEditForm();
    }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showErrorMessage('profile-error-message', error.message || 'Failed to update profile.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

// ========================================
// Organisation Functions
// ========================================

async function loadOrganisation() {
  try {
    let org = await getOrganisation();
    
    // TODO: Remove mock data when backend is ready
    // For demo purposes, simulate no organisation initially
    // Uncomment the line below to test with mock organisation data
    /*
    org = {
      id: 'org-123',
      name: 'Acme Corporation',
      created_at: '2024-06-15T10:30:00Z',
      member_count: 5,
      subscription_status: 'Active',
      user_role: 'admin' // 'owner', 'admin', or 'member'
    };
    */
    
    currentOrganisation = org;
    
    if (org) {
      displayOrganisation(org);
      await loadOrganisationMembers();
    } else {
      showNoOrganisationState();
    }
    
  } catch (error) {
    console.error('Error loading organisation:', error);
    showNoOrganisationState();
  }
}

function showNoOrganisationState() {
  document.getElementById('no-org-section').style.display = 'block';
  document.getElementById('org-content').style.display = 'none';
}

function displayOrganisation(org) {
  document.getElementById('no-org-section').style.display = 'none';
  document.getElementById('org-content').style.display = 'block';
  
  // Get user's role in the organisation
  userRole = org.user_role || 'member';
  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const isOwner = userRole === 'owner';
  
  // Update role badge
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    roleBadge.textContent = capitalizeFirst(userRole);
    roleBadge.className = 'role-badge ' + userRole;
  }
  
  // Update org details
  setElementText('org-name-value', org.name || '-');
  setElementText('org-created-value', formatDate(org.created_at));
  setElementText('org-members-count', (org.member_count || 0) + ' members');
  setElementText('org-subscription-status', org.subscription_status || 'No subscription');
  
  // Show/hide admin actions
  const adminActions = document.getElementById('org-admin-actions');
  const inviteBtn = document.getElementById('invite-member-btn');
  const dangerZone = document.getElementById('org-danger-zone');
  const leaveSection = document.getElementById('leave-org-section');
  
  if (adminActions) adminActions.style.display = isAdmin ? 'block' : 'none';
  if (inviteBtn) inviteBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  if (dangerZone) dangerZone.style.display = isOwner ? 'block' : 'none';
  if (leaveSection) leaveSection.style.display = isOwner ? 'none' : 'block';
}

async function loadOrganisationMembers() {
  const membersList = document.getElementById('members-list');
  
  try {
    let members = await getOrganisationMembers();
    
    // TODO: Remove mock data when backend is ready
    // For demo purposes, use mock members if API returns null
    if (!members && currentOrganisation) {
      members = [
        {
          user_id: currentUser?.sub || 'user-1',
          display_name: currentProfile?.display_name || 'You',
          email: currentUser?.email || 'you@example.com',
          role: currentOrganisation.user_role || 'owner'
        }
      ];
    }
    
    if (!members || members.length === 0) {
      membersList.innerHTML = '<div class="empty-state"><p>No members found</p></div>';
      return;
    }
    
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    
    membersList.innerHTML = members.map(member => createMemberItem(member, isAdmin)).join('');
    
    // Add event listeners for member actions
    attachMemberActionListeners();
    
  } catch (error) {
    console.error('Error loading members:', error);
    membersList.innerHTML = '<div class="empty-state"><p>Failed to load members</p></div>';
  }
}

function createMemberItem(member, isAdmin) {
  const initials = (member.display_name || member.email || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  const isCurrentUser = currentUser && member.user_id === currentUser.sub;
  const canEdit = isAdmin && !isCurrentUser && member.role !== 'owner';
  const canRemove = isAdmin && !isCurrentUser && member.role !== 'owner';
  
  return `
    <div class="member-item" data-member-id="${member.user_id}">
      <div class="member-info">
        <div class="member-avatar">${initials}</div>
        <div class="member-details">
          <div class="member-name">
            ${escapeHtml(member.display_name || 'Unknown')}
            ${isCurrentUser ? '<span style="color: #666; font-weight: normal;"> (You)</span>' : ''}
          </div>
          <div class="member-email">${escapeHtml(member.email || '')}</div>
        </div>
      </div>
      <div class="member-actions">
        <span class="member-role ${member.role}">${capitalizeFirst(member.role)}</span>
        ${canEdit ? `<button class="btn btn-secondary member-btn edit-member-btn" data-member-id="${member.user_id}" data-member-name="${escapeHtml(member.display_name || member.email)}" data-member-role="${member.role}">Edit</button>` : ''}
        ${canRemove ? `<button class="btn btn-danger member-btn remove-member-btn" data-member-id="${member.user_id}" data-member-name="${escapeHtml(member.display_name || member.email)}">Remove</button>` : ''}
      </div>
    </div>
  `;
}

function attachMemberActionListeners() {
  // Edit member buttons
  document.querySelectorAll('.edit-member-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const memberId = this.dataset.memberId;
      const memberName = this.dataset.memberName;
      const memberRole = this.dataset.memberRole;
      openEditMemberModal(memberId, memberName, memberRole);
    });
  });
  
  // Remove member buttons
  document.querySelectorAll('.remove-member-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const memberId = this.dataset.memberId;
      const memberName = this.dataset.memberName;
      showConfirmModal(
        'Remove Member',
        `Are you sure you want to remove ${memberName} from the organisation? They will lose access to the shared subscription.`,
        async () => {
          try {
            await removeOrganisationMember(memberId);
            await loadOrganisationMembers();
            await loadOrganisation();
          } catch (error) {
            alert('Failed to remove member: ' + error.message);
          }
        }
      );
    });
  });
}

function initializeOrganisationForms() {
  // Create organisation
  const createOrgBtn = document.getElementById('create-org-btn');
  const createOrgForm = document.getElementById('create-org-form');
  
  if (createOrgBtn) {
    createOrgBtn.addEventListener('click', () => openModal('create-org-modal'));
  }
  
  if (createOrgForm) {
    createOrgForm.addEventListener('submit', handleCreateOrganisation);
  }
  
  // Invite member
  const inviteBtn = document.getElementById('invite-member-btn');
  const inviteForm = document.getElementById('invite-member-form');
  
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => openModal('invite-member-modal'));
  }
  
  if (inviteForm) {
    inviteForm.addEventListener('submit', handleInviteMember);
  }
  
  // Edit member form
  const editMemberForm = document.getElementById('edit-member-form');
  if (editMemberForm) {
    editMemberForm.addEventListener('submit', handleUpdateMemberRole);
  }
  
  // Leave organisation
  const leaveOrgBtn = document.getElementById('leave-org-btn');
  if (leaveOrgBtn) {
    leaveOrgBtn.addEventListener('click', () => {
      showConfirmModal(
        'Leave Organisation',
        'Are you sure you want to leave this organisation? You will lose access to the shared subscription.',
        async () => {
          try {
            await leaveOrganisation();
            window.location.reload();
          } catch (error) {
            alert('Failed to leave organisation: ' + error.message);
          }
        }
      );
    });
  }
  
  // Delete organisation
  const deleteOrgBtn = document.getElementById('delete-org-btn');
  if (deleteOrgBtn) {
    deleteOrgBtn.addEventListener('click', () => {
      showConfirmModal(
        'Delete Organisation',
        'Are you sure you want to delete this organisation? All members will lose access and this cannot be undone.',
        async () => {
          try {
            await deleteOrganisation();
            window.location.reload();
          } catch (error) {
            alert('Failed to delete organisation: ' + error.message);
          }
        }
      );
    });
  }
}

async function handleCreateOrganisation(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorEl = document.getElementById('create-org-error');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';
  hideErrorMessage('create-org-error');
  
  try {
    const orgData = {
      name: form.name.value.trim()
    };
    
    const org = await createOrganisation(orgData);
    
    closeModal('create-org-modal');
    form.reset();
    
    // Reload organisation data
    await loadOrganisation();
    
  } catch (error) {
    console.error('Error creating organisation:', error);
    showErrorMessage('create-org-error', error.message || 'Failed to create organisation.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Organisation';
  }
}

async function handleInviteMember(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  hideErrorMessage('invite-error');
  
  try {
    await inviteOrganisationMember(form.email.value.trim(), form.role.value);
    
    closeModal('invite-member-modal');
    form.reset();
    
    alert('Invitation sent successfully!');
    
  } catch (error) {
    console.error('Error inviting member:', error);
    showErrorMessage('invite-error', error.message || 'Failed to send invitation.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Invitation';
  }
}

function openEditMemberModal(memberId, memberName, memberRole) {
  document.getElementById('edit-member-id').value = memberId;
  document.getElementById('edit-member-name').textContent = memberName;
  document.getElementById('edit-member-role').value = memberRole;
  openModal('edit-member-modal');
}

async function handleUpdateMemberRole(e) {
  e.preventDefault();
  
  const form = e.target;
  const memberId = form.member_id.value;
  const newRole = form.role.value;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  hideErrorMessage('edit-member-error');
  
  try {
    await updateOrganisationMemberRole(memberId, newRole);
    
    closeModal('edit-member-modal');
    await loadOrganisationMembers();
    
  } catch (error) {
    console.error('Error updating member role:', error);
    showErrorMessage('edit-member-error', error.message || 'Failed to update member role.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

// ========================================
// Device Functions
// ========================================

async function loadDevices() {
  const devicesList = document.getElementById('devices-list');
  const limitInfo = document.getElementById('device-limit-info');
  
  try {
    let response = await getDevices();
    
    // TODO: Remove mock data when backend is ready
    // For demo purposes, use mock devices if API returns null
    if (!response) {
      const currentFingerprint = generateDeviceFingerprint();
      response = {
        devices: [
          {
            device_id: 'device-1',
            name: 'Chrome on ' + getDeviceType(navigator.userAgent),
            browser: getBrowserName(navigator.userAgent),
            user_agent: navigator.userAgent,
            fingerprint: currentFingerprint,
            last_active: new Date().toISOString()
          },
          {
            device_id: 'device-2',
            name: 'Chrome on Windows',
            browser: 'Google Chrome',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            fingerprint: 'other-fingerprint',
            last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        limits: { current: 2, max: 3 }
      };
    }
    
    const devices = response.devices || [];
    const limits = response.limits || { current: 0, max: 3 };
    
    // Update limit display
    if (limitInfo) {
      limitInfo.querySelector('.device-count').textContent = limits.current;
      limitInfo.querySelector('.device-max').textContent = limits.max;
    }
    
    if (devices.length === 0) {
      displayEmptyDevices(devicesList);
      return;
    }
    
    // Get current device fingerprint for comparison
    const currentFingerprint = generateDeviceFingerprint();
    
    devicesList.innerHTML = devices.map(device => createDeviceItem(device, currentFingerprint)).join('');
    
    // Add event listeners for device actions
    attachDeviceActionListeners();
    
  } catch (error) {
    console.error('Error loading devices:', error);
    devicesList.innerHTML = '<div class="empty-state"><p>Failed to load devices</p></div>';
  }
}

function displayEmptyDevices(container) {
  container.innerHTML = `
    <div class="empty-state" style="padding: 32px;">
      <p style="margin: 0;">No devices registered yet. Devices are automatically registered when you use the extension.</p>
    </div>
  `;
}

function createDeviceItem(device, currentFingerprint) {
  const isCurrentDevice = device.fingerprint === currentFingerprint;
  const lastActive = device.last_active ? formatRelativeTime(device.last_active) : 'Unknown';
  const deviceIcon = getDeviceIcon(device.user_agent);
  const isActive = isRecentlyActive(device.last_active);
  
  return `
    <div class="device-item ${isCurrentDevice ? 'current-device' : ''}" data-device-id="${device.device_id}">
      <div class="device-info">
        <div class="device-icon">${deviceIcon}</div>
        <div class="device-details">
          <div class="device-name">
            ${escapeHtml(device.name || 'Unknown Device')}
            ${isCurrentDevice ? '<span class="device-current-badge">Current</span>' : ''}
          </div>
          <div class="device-meta">
            ${escapeHtml(device.browser || getBrowserName(device.user_agent))} • Last active ${lastActive}
          </div>
        </div>
      </div>
      <div class="device-actions">
        <div class="device-status">
          <span class="device-status-dot ${isActive ? 'active' : 'inactive'}"></span>
          ${isActive ? 'Active' : 'Inactive'}
        </div>
        ${!isCurrentDevice ? `<button class="btn btn-secondary member-btn remove-device-btn" data-device-id="${device.device_id}" data-device-name="${escapeHtml(device.name || 'this device')}">Remove</button>` : ''}
      </div>
    </div>
  `;
}

function attachDeviceActionListeners() {
  document.querySelectorAll('.remove-device-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const deviceId = this.dataset.deviceId;
      const deviceName = this.dataset.deviceName;
      showConfirmModal(
        'Remove Device',
        `Are you sure you want to remove ${deviceName}? It will need to be re-registered to use the extension.`,
        async () => {
          try {
            await removeDevice(deviceId);
            await loadDevices();
          } catch (error) {
            alert('Failed to remove device: ' + error.message);
          }
        }
      );
    });
  });
}

function isRecentlyActive(lastActive) {
  if (!lastActive) return false;
  const lastActiveDate = new Date(lastActive);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastActiveDate > hourAgo;
}

// ========================================
// Subscription Functions
// ========================================

async function loadSubscriptionStatus() {
  const subscriptionContent = document.getElementById('subscription-content');
  const extensionSection = document.getElementById('extension-section');
  const noSubscriptionSection = document.getElementById('no-subscription-section');
  const statusBadge = document.getElementById('subscription-status-badge');
  
  try {
    // TODO: Replace with real API call when backend is ready
    // const subscription = await fetchSubscription();
    
    // For now, use mock data to demonstrate the UI
    const subscription = {
      status: 'active',
      plan: 'annual',
      amount: 99,
      current_period_end: '2026-01-29',
      shared: currentOrganisation !== null
    };
    
    if (subscription && subscription.status === 'active') {
      // User has active subscription
      if (statusBadge) {
        statusBadge.textContent = 'Active';
        statusBadge.className = 'status-badge active';
      }
      displayActiveSubscription(subscription, subscriptionContent);
      if (extensionSection) extensionSection.style.display = 'block';
      if (noSubscriptionSection) noSubscriptionSection.style.display = 'none';
    } else {
      // No active subscription
      if (statusBadge) {
        statusBadge.textContent = 'Inactive';
        statusBadge.className = 'status-badge canceled';
      }
      displayNoSubscription(subscriptionContent);
      if (extensionSection) extensionSection.style.display = 'none';
      if (noSubscriptionSection) noSubscriptionSection.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error loading subscription:', error);
    if (statusBadge) {
      statusBadge.textContent = 'Error';
      statusBadge.className = 'status-badge past-due';
    }
    displayNoSubscription(subscriptionContent);
    if (extensionSection) extensionSection.style.display = 'none';
    if (noSubscriptionSection) noSubscriptionSection.style.display = 'block';
  }
}

function displayActiveSubscription(subscription, container) {
  const planName = subscription.plan === 'monthly' ? 'Monthly' : 'Annual';
  const amount = subscription.plan === 'monthly' ? 9.99 : 99;
  const nextBilling = new Date(subscription.current_period_end).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const sharedInfo = subscription.shared ? `
    <div class="detail-item">
      <div class="detail-label">Shared With</div>
      <div class="detail-value">${currentOrganisation?.name || 'Organisation'}</div>
    </div>
  ` : '';
  
  container.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Plan</div>
        <div class="detail-value">${planName} Plan</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Amount</div>
        <div class="detail-value">$${amount.toFixed(2)} / ${subscription.plan === 'monthly' ? 'month' : 'year'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Next Billing</div>
        <div class="detail-value">${nextBilling}</div>
      </div>
      ${sharedInfo}
    </div>
    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-top: 24px;">
      <a href="subscription.html" class="btn btn-primary">Manage Subscription</a>
      <a href="subscription.html" class="btn btn-secondary">View Billing History</a>
    </div>
    <p style="margin-top: 20px; font-size: 13px; color: #666;">
      <strong>Note:</strong> This is demo data. Real subscription details will be displayed when Stripe integration is complete.
    </p>
  `;
}

function displayNoSubscription(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <p style="font-size: 16px; color: #666; margin-bottom: 15px;">
        You don't have an active subscription yet.
      </p>
    </div>
  `;
}

// ========================================
// Modal Functions
// ========================================

function initializeModals() {
  // Close modal buttons
  document.querySelectorAll('.modal-close, [id^="cancel-"], [id^="close-"]').forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal-overlay');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
  
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
  
  // Confirm modal buttons
  const confirmCancelBtn = document.getElementById('confirm-cancel');
  const confirmActionBtn = document.getElementById('confirm-action');
  
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => closeModal('confirm-modal'));
  }
  
  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', async () => {
      if (pendingConfirmAction) {
        confirmActionBtn.disabled = true;
        confirmActionBtn.textContent = 'Processing...';
        try {
          await pendingConfirmAction();
        } finally {
          confirmActionBtn.disabled = false;
          confirmActionBtn.textContent = 'Confirm';
          closeModal('confirm-modal');
          pendingConfirmAction = null;
        }
      }
    });
  }
  
  // Download extension button
  const downloadBtn = document.getElementById('download-extension-btn-profile');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      alert(
        'Extension Download\n\n' +
        'The LabelLight extension will be available in the Chrome Web Store.\n\n' +
        'Chrome Web Store link coming soon.'
      );
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    
    // Reset any forms in the modal
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }
    
    // Hide any error messages
    const errorEl = modal.querySelector('.error-message');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }
}

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  pendingConfirmAction = onConfirm;
  openModal('confirm-modal');
}

// ========================================
// Utility Functions
// ========================================

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function showErrorMessage(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function hideErrorMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = 'none';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown';
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}

