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
      "https://${aws_cloudfront_distribution.website.domain_name}/callback.html"
    ],
    var.environment == "dev" ? [
      "http://localhost:8000/callback.html"
    ] : []
  )

  logout_urls = concat(
    [
      "https://${aws_cloudfront_distribution.website.domain_name}/index.html"
    ],
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
