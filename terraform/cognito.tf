#####################################################################
# COGNITO SETUP
# Creates a new Cognito user pool for printerapp website
#####################################################################

resource "aws_cognito_user_pool" "main" {
  name = "printerapp-user-pool-${var.environment}"

  # Use email as the username for sign-in
  username_attributes = ["email"]

  # Enable email/password sign-up
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # Auto-verify email
  auto_verified_attributes = ["email"]

  # Use SES for email delivery in production
  dynamic "email_configuration" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      email_sending_account  = "DEVELOPER"
      from_email_address     = "LabelLight <noreply@${var.domain_name}>"
      source_arn             = aws_ses_domain_identity.main[0].arn
      reply_to_email_address = "support@${var.domain_name}"
    }
  }

  # Branded verification email template
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verify your LabelLight account"
    email_message        = <<-EOT
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">
          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
              <img src="https://${var.domain_name}/images/transparent-logo.png" alt="LabelLight" style="height: 50px; width: auto;">
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #333;">Verify Your Email</h1>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333;">
                Thanks for signing up for LabelLight! Use the verification code below to complete your registration:
              </p>
              <!-- Verification code box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #f5f5f5; padding: 25px; border-radius: 8px;">
                    <span style="font-size: 36px; font-weight: bold; color: #1a73e8; letter-spacing: 6px; font-family: monospace;">{####}</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #666;">
                This code expires in 24 hours. If you didn't create an account with LabelLight, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
                LabelLight - Print Custom Labels Directly From Lightspeed Retail
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999; text-align: center;">
                <a href="https://${var.domain_name}/privacy-policy.html" style="color: #1a73e8; text-decoration: none;">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
                <a href="https://${var.domain_name}/terms-of-service.html" style="color: #1a73e8; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
EOT
  }
}

# Default Cognito domain for dev environment
resource "aws_cognito_user_pool_domain" "main" {
  count        = var.environment == "dev" ? 1 : 0
  domain       = "${var.cognito_domain_prefix}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Custom domain for production
resource "aws_cognito_user_pool_domain" "custom" {
  count           = var.environment == "prod" ? 1 : 0
  domain          = "auth.${var.domain_name}"
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = aws_acm_certificate_validation.cognito[0].certificate_arn

  depends_on = [aws_acm_certificate_validation.cognito]
}

# Google Identity Provider
resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" && var.google_client_secret != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email openid profile"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}

# Create app client for printerapp website
resource "aws_cognito_user_pool_client" "main" {
  name         = "printerapp-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = concat(
    [
      "https://${aws_cloudfront_distribution.website.domain_name}/callback.html",
      "https://labellight.com/callback.html"
    ],
    var.environment == "prod" ? [
      "https://${var.domain_name}/callback.html"
    ] : [],
    var.environment == "dev" ? [
      "http://localhost:8000/callback.html"
    ] : []
  )

  logout_urls = concat(
    [
      "https://${aws_cloudfront_distribution.website.domain_name}/index.html",
      "https://labellight.com/index.html"
    ],
    var.environment == "prod" ? [
      "https://${var.domain_name}/index.html"
    ] : [],
    var.environment == "dev" ? [
      "http://localhost:8000/index.html"
    ] : []
  )

  supported_identity_providers = compact([
    "COGNITO",
    var.google_client_id != "" && var.google_client_secret != "" ? "Google" : ""
  ])

  generate_secret = false

  depends_on = [
    aws_cognito_identity_provider.google
  ]
}

#####################################################################
# CHROME EXTENSION CLIENT
# Uses authorization code flow (more secure for extensions)
# Extension ID will be known after first Chrome Web Store upload
#####################################################################

resource "aws_cognito_user_pool_client" "extension" {
  name         = "printerapp-extension-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Chrome extension callback URLs
  callback_urls = [
    for id in concat([var.chrome_extension_id], var.chrome_extension_extra_ids) : "https://${id}.chromiumapp.org/"
  ]

  logout_urls = [
    for id in concat([var.chrome_extension_id], var.chrome_extension_extra_ids) : "https://${id}.chromiumapp.org/"
  ]

  supported_identity_providers = compact([
    "COGNITO",
    var.google_client_id != "" && var.google_client_secret != "" ? "Google" : ""
  ])

  generate_secret = false

  # Token validity settings
  id_token_validity      = 24   # hours
  access_token_validity  = 24   # hours
  refresh_token_validity = 30   # days

  token_validity_units {
    id_token      = "hours"
    access_token  = "hours"
    refresh_token = "days"
  }

  depends_on = [
    aws_cognito_identity_provider.google
  ]
}

#####################################################################
# COGNITO HOSTED UI CUSTOMIZATION
#####################################################################

resource "aws_cognito_user_pool_ui_customization" "main" {
  user_pool_id = aws_cognito_user_pool.main.id
  client_id    = "ALL"

  # Custom CSS from website css folder
  css = file("${path.module}/../src/website/css/cognito-ui.css")

  depends_on = [
    aws_cognito_user_pool_domain.main,
    aws_cognito_user_pool_domain.custom
  ]
}
