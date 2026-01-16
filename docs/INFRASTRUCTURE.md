# LabelLight Infrastructure Architecture

## Overview

This document describes the complete AWS infrastructure for the LabelLight application, including DynamoDB tables, Lambda functions, API Gateway endpoints, and data flow between components.

---

## Infrastructure Summary

| Resource Type | Count | Terraform File |
|---------------|-------|----------------|
| DynamoDB Tables | 6 | Various |
| Lambda Functions | 15+ | Various |
| API Gateway Endpoints | 20+ | Various |
| Cognito User Pool | 1 | `cognito.tf` |
| S3 Bucket | 1 | `main.tf` |
| CloudFront Distribution | 1 | `main.tf` |

---

## DynamoDB Tables

### 1. `printerapp-profiles-{env}`

**Terraform:** `profile_api.tf`

Stores user profile information.

| Attribute | Type | Description |
|-----------|------|-------------|
| `user_id` | String (PK) | Cognito user ID |
| `display_name` | String | User's display name |
| `email` | String | User's email |
| `phone` | String | Phone number |
| `company` | String | Company name |
| `address` | String | Street address |
| `city` | String | City |
| `state` | String | State/Province |
| `country` | String | Country |
| `bio` | String | User bio |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

---

### 2. `printerapp-subscriptions-{env}`

**Terraform:** `subscription_api.tf`

Stores subscription records tied to users or organisations.

| Attribute | Type | Description |
|-----------|------|-------------|
| `subscription_id` | String (PK) | Unique subscription identifier |
| `owner_id` | String (GSI) | User ID or Organisation ID |
| `owner_type` | String | `"user"` or `"organisation"` |
| `stripe_subscription_id` | String (GSI) | Stripe subscription ID for webhook lookups |
| `stripe_customer_id` | String | Stripe customer ID |
| `plan` | String | Plan key: `trial`, `single`, `team`, `business`, `enterprise` |
| `billing_period` | String | `"monthly"` or `"yearly"` |
| `status` | String | `active`, `trialing`, `past_due`, `canceled`, `unpaid` |
| `device_limit` | Number | Maximum devices allowed |
| `user_limit` | Number | Maximum users allowed (for org plans) |
| `current_period_start` | Number | Unix timestamp |
| `current_period_end` | Number | Unix timestamp |
| `cancel_at_period_end` | Boolean | Whether subscription cancels at period end |
| `trial_end` | Number | Unix timestamp (if trialing) |
| `created_by_user_id` | String | User who created the subscription |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

**Indexes:**
- `owner_id-index` (GSI) - Look up subscription by user or organisation
- `stripe_subscription_id-index` (GSI) - Look up by Stripe ID for webhooks

---

### 3. `printerapp-devices-{env}`

**Terraform:** `device_api.tf`

Stores registered devices for each user.

| Attribute | Type | Description |
|-----------|------|-------------|
| `user_id` | String (PK) | Cognito user ID |
| `device_id` | String (SK) | Unique device identifier |
| `name` | String | User-friendly device name |
| `fingerprint` | String | Browser fingerprint for device identification |
| `browser` | String | Browser name (Chrome, Firefox, etc.) |
| `user_agent` | String | Full user agent string |
| `device_type` | String | Device type (desktop, mobile, etc.) |
| `registered_at` | String | ISO timestamp |
| `last_active` | String | ISO timestamp |
| `expires_at_ttl` | Number | TTL for auto-removal of inactive devices |

---

### 4. `printerapp-organisations-{env}`

**Terraform:** `organisation_api.tf`

Stores organisation details.

| Attribute | Type | Description |
|-----------|------|-------------|
| `organisation_id` | String (PK) | Unique organisation identifier |
| `name` | String | Organisation name |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

---

### 5. `printerapp-org-members-{env}`

**Terraform:** `organisation_api.tf`

Links users to organisations with roles.

| Attribute | Type | Description |
|-----------|------|-------------|
| `organisation_id` | String (PK) | Organisation ID |
| `user_id` | String (SK, GSI) | Cognito user ID |
| `role` | String | `owner`, `admin`, or `member` |
| `joined_at` | String | ISO timestamp |

**Indexes:**
- `user_id-index` (GSI) - Look up user's organisation membership

---

### 6. `printerapp-org-invitations-{env}`

**Terraform:** `organisation_api.tf`

Stores pending organisation invitations.

| Attribute | Type | Description |
|-----------|------|-------------|
| `organisation_id` | String (PK) | Organisation ID |
| `invitation_id` | String (SK) | Unique invitation identifier |
| `email` | String (GSI) | Invited user's email |
| `role` | String | Role to assign on acceptance |
| `invited_by` | String | User ID who sent invitation |
| `created_at` | String | ISO timestamp |
| `expires_at_ttl` | Number | TTL for auto-expiry |

**Indexes:**
- `email-index` (GSI) - Look up invitations by email

---

## API Endpoints

### Subscription APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/subscription` | ✅ Cognito | Get user's subscription status |
| `POST` | `/subscription` | ✅ Cognito | Create Stripe checkout session |
| `POST` | `/subscription/portal` | ✅ Cognito | Create Stripe billing portal session |
| `POST` | `/subscription/webhook` | ❌ Stripe Sig | Handle Stripe webhook events |

### Device APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/devices` | ✅ Cognito | List user's devices with limits |
| `POST` | `/devices` | ✅ Cognito | Register a new device |
| `DELETE` | `/devices/{device_id}` | ✅ Cognito | Remove a device |
| `POST` | `/devices/{device_id}/heartbeat` | ✅ Cognito | Update device last_active |

### Organisation APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/organisation` | ✅ Cognito | Get user's organisation |
| `POST` | `/organisation` | ✅ Cognito | Create organisation |
| `PUT` | `/organisation` | ✅ Cognito | Update organisation |
| `DELETE` | `/organisation` | ✅ Cognito | Delete organisation (owner only) |
| `GET` | `/organisation/members` | ✅ Cognito | List organisation members |
| `POST` | `/organisation/members` | ✅ Cognito | Invite member |
| `PUT` | `/organisation/members/{user_id}` | ✅ Cognito | Update member role |
| `DELETE` | `/organisation/members/{user_id}` | ✅ Cognito | Remove member |
| `POST` | `/organisation/leave` | ✅ Cognito | Leave organisation |

### Profile APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/profile` | ✅ Cognito | Get user profile |
| `POST` | `/profile` | ✅ Cognito | Create profile (onboarding) |
| `PUT` | `/profile` | ✅ Cognito | Update profile |

---

## Data Flow Diagrams

### 1. Subscription Purchase Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  Frontend   │     │   Lambda    │     │   Stripe    │
│  (Browser)  │     │  (Website)  │     │    APIs     │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Click Subscribe  │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ POST /subscription│                   │
       │                   │ {plan, billing}   │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │                   │ Create Checkout   │
       │                   │                   │ Session           │
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │<──────────────────│
       │                   │                   │  checkout_url     │
       │                   │<──────────────────│                   │
       │                   │  checkout_url     │                   │
       │                   │                   │                   │
       │  Redirect to      │                   │                   │
       │  Stripe Checkout  │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │  Complete Payment │                   │                   │
       │───────────────────────────────────────────────────────────>│
       │                   │                   │                   │
       │                   │                   │   Webhook:        │
       │                   │                   │   checkout.       │
       │                   │                   │   session.        │
       │                   │                   │   completed       │
       │                   │                   │<──────────────────│
       │                   │                   │                   │
       │                   │                   │ Create            │
       │                   │                   │ subscription      │
       │                   │                   │ record in         │
       │                   │                   │ DynamoDB          │
       │                   │                   │                   │
       │  Redirect to      │                   │                   │
       │  success.html     │                   │                   │
       │<──────────────────────────────────────────────────────────│
       │                   │                   │                   │
```

### 2. Device Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Extension  │     │   Lambda    │     │  DynamoDB   │
│  (Chrome)   │     │    APIs     │     │   Tables    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ POST /devices     │                   │
       │ {name, fingerprint}                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ Query org_members │
       │                   │ (check if user    │
       │                   │  is in an org)    │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │                   │ Query subscriptions│
       │                   │ (org sub first,   │
       │                   │  then personal)   │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │                   │ If org sub:       │
       │                   │ Count ALL org     │
       │                   │ member devices    │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │                   │ Check: current    │
       │                   │ < device_limit?   │
       │                   │                   │
       │                   │ If yes: Put device│
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │<──────────────────│                   │
       │  {device, limits} │                   │
       │                   │                   │
```

### 3. Subscription Lookup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GET /subscription                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  Get user_id from JWT   │
                └────────────┬────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │ Query org_members table │
                │ by user_id (GSI)        │
                └────────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ User is in org  │           │ User not in org │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             │
    ┌─────────────────┐                    │
    │ Query subs by   │                    │
    │ org_id (GSI)    │                    │
    └────────┬────────┘                    │
             │                             │
    ┌────────┴────────┐                    │
    │                 │                    │
    ▼                 ▼                    ▼
┌────────┐      ┌──────────┐      ┌─────────────────┐
│Org has │      │ Org has  │      │ Query subs by   │
│active  │      │ no sub   │      │ user_id (GSI)   │
│sub     │      └────┬─────┘      └────────┬────────┘
└───┬────┘           │                     │
    │                │                     │
    │                └─────────────────────┤
    │                                      │
    ▼                                      ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│ Return org subscription │    │ Return user subscription│
│ + org device count      │    │ + user device count     │
└─────────────────────────┘    └─────────────────────────┘
```

---

## Device Limit Enforcement

### Individual User (No Organisation)

```
User A (single plan: 3 device limit)
├── Device 1 ✓
├── Device 2 ✓
├── Device 3 ✓
└── Device 4 ✗ (limit reached)
```

### Organisation (Shared Pool)

```
Organisation X (team plan: 6 device limit)
│
├── User A (owner)
│   ├── Device 1 ✓
│   └── Device 2 ✓
│
├── User B (admin)
│   ├── Device 3 ✓
│   ├── Device 4 ✓
│   └── Device 5 ✓
│
└── User C (member)
    ├── Device 6 ✓
    └── Device 7 ✗ (org limit reached: 6/6)
```

**Key Points:**
- Device limits are **shared across the entire organisation**
- Any org member's device counts against the org's pool
- Individual users without an org use their personal subscription limits

---

## Plan Configuration

| Plan | Users | Devices | Monthly | Yearly |
|------|-------|---------|---------|--------|
| Trial | 1 | 1 | Free (7 days) | - |
| Single | 1 | 3 | $9.99 | $99.99 |
| Team | 3 | 6 | $24.99 | $249.00 |
| Business | 10 | 20 | $79.99 | $799.99 |
| Enterprise | 10+ | Custom | $7.49/user | Contact |

---

## Stripe Integration

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record in DynamoDB |
| `customer.subscription.updated` | Update plan, status, period dates |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.payment_failed` | Set status to `past_due` |

### Stripe Price IDs

```javascript
// From config.js
STRIPE_PRICE_IDS: {
  'single-monthly': 'price_1Sjdb5GvNJex3j2wwMbFLzji',
  'single-yearly': 'price_1SjdeQGvNJex3j2we8SZgt5h',
  'team-monthly': 'price_1SoNCJGvNJex3j2wTe2801Yx',
  'team-yearly': 'price_1SoNCtGvNJex3j2wVtwV1I78',
  'business-monthly': 'price_1SoNDbGvNJex3j2w7zNyWTRx',
  'business-yearly': 'price_1SoNDwGvNJex3j2w8xFOAS8Q'
}
```

---

## Terraform Resources

### File Structure

```
terraform/
├── main.tf                 # S3, CloudFront, API Gateway base
├── cognito.tf              # Cognito User Pool, Clients, Identity Providers
├── profile_api.tf          # Profile table, Lambdas, API endpoints
├── organisation_api.tf     # Organisation tables, Lambdas, API endpoints
├── device_api.tf           # Device table, Lambdas, API endpoints
├── subscription_api.tf     # Subscription table, Lambdas, API endpoints
├── variables.tf            # Input variables
└── outputs.tf              # Output values
```

### Resources by File

#### `main.tf`
- `aws_s3_bucket.website` - Static website hosting
- `aws_cloudfront_distribution.website` - CDN distribution
- `aws_api_gateway_rest_api.main` - API Gateway
- `aws_api_gateway_stage.main` - API deployment stage

#### `cognito.tf`
- `aws_cognito_user_pool.main` - User authentication
- `aws_cognito_user_pool_client.main` - Website client
- `aws_cognito_user_pool_client.extension` - Chrome extension client
- `aws_cognito_identity_provider.google` - Google OAuth

#### `profile_api.tf`
- `aws_dynamodb_table.user_profiles` - User profiles
- `aws_iam_role.lambda_execution` - Shared Lambda role
- `aws_lambda_function.get_profile`
- `aws_lambda_function.create_profile`
- `aws_lambda_function.update_profile`

#### `organisation_api.tf`
- `aws_dynamodb_table.organisations`
- `aws_dynamodb_table.org_members`
- `aws_dynamodb_table.org_invitations`
- `aws_lambda_function.get_organisation`
- `aws_lambda_function.create_organisation`
- `aws_lambda_function.update_organisation`
- `aws_lambda_function.delete_organisation`
- `aws_lambda_function.get_members`
- `aws_lambda_function.invite_member`
- `aws_lambda_function.update_member`
- `aws_lambda_function.remove_member`
- `aws_lambda_function.leave_organisation`

#### `device_api.tf`
- `aws_dynamodb_table.devices`
- `aws_lambda_function.get_devices`
- `aws_lambda_function.register_device`
- `aws_lambda_function.remove_device`
- `aws_lambda_function.device_heartbeat`

#### `subscription_api.tf`
- `aws_dynamodb_table.subscriptions`
- `aws_lambda_function.get_subscription`
- `aws_lambda_function.create_checkout`
- `aws_lambda_function.stripe_webhook`
- `aws_lambda_function.create_portal`

### Required Variables

```hcl
variable "stripe_secret_key" {
  description = "Stripe Secret API Key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe Webhook Signing Secret"
  type        = string
  sensitive   = true
}
```

---

## Deployment Steps

1. **Add Terraform variables** to `terraform.tfvars`:
   ```hcl
   stripe_secret_key     = "sk_test_..."
   stripe_webhook_secret = "whsec_..."
   ```

2. **Apply Terraform**:
   ```bash
   cd terraform
   terraform plan
   terraform apply
   ```

3. **Configure Stripe Webhook**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `{API_URL}/subscription/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the signing secret to `stripe_webhook_secret`

4. **Re-apply Terraform** with webhook secret:
   ```bash
   terraform apply
   ```
