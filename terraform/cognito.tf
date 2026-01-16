#####################################################################
# COGNITO SETUP
# Creates a new Cognito user pool for printerapp website
#####################################################################

resource "aws_cognito_user_pool" "main" {
  name = "printerapp-user-pool-${var.environment}"
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.cognito_domain_prefix}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
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

# Microsoft Identity Provider
resource "aws_cognito_identity_provider" "microsoft" {
  count         = var.microsoft_client_id != "" && var.microsoft_client_secret != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Microsoft"
  provider_type = "OIDC"

  provider_details = {
    authorize_scopes          = "email openid profile"
    client_id                 = var.microsoft_client_id
    client_secret             = var.microsoft_client_secret
    oidc_issuer               = "https://login.microsoftonline.com/common/v2.0"
    attributes_request_method = "GET"
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
    var.google_client_id != "" && var.google_client_secret != "" ? "Google" : "",
    var.microsoft_client_id != "" && var.microsoft_client_secret != "" ? "Microsoft" : ""
  ])

  generate_secret = false

  depends_on = [
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.microsoft
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
    var.google_client_id != "" && var.google_client_secret != "" ? "Google" : "",
    var.microsoft_client_id != "" && var.microsoft_client_secret != "" ? "Microsoft" : ""
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
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.microsoft
  ]
}

