#####################################################################
# COGNITO SETUP
# Creates a new Cognito user pool for printerapp website
#####################################################################

resource "aws_cognito_user_pool" "main" {
  name = "printerapp-user-pool"
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# Google Identity Provider
resource "aws_cognito_identity_provider" "google" {
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
  name         = "printerapp-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = [
    "https://${aws_cloudfront_distribution.website.domain_name}/index.html",
    "https://${aws_cloudfront_distribution.website.domain_name}/"
  ]

  logout_urls = [
    "https://${aws_cloudfront_distribution.website.domain_name}/index.html"
  ]

  supported_identity_providers = ["Google"]

  generate_secret = false

  depends_on = [aws_cognito_identity_provider.google]
}

#####################################################################
# CHROME EXTENSION CLIENT
# Uses authorization code flow (more secure for extensions)
# Extension ID will be known after first Chrome Web Store upload
#####################################################################

resource "aws_cognito_user_pool_client" "extension" {
  name         = "printerapp-extension-client"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Chrome extension callback URLs
  # Format: https://<extension-id>.chromiumapp.org/
  # The extension ID is assigned when first uploaded to Chrome Web Store
  # For local development, use chrome.identity.getRedirectURL() to get the URL
  callback_urls = [
    "https://${var.chrome_extension_id}.chromiumapp.org/"
  ]

  logout_urls = [
    "https://${var.chrome_extension_id}.chromiumapp.org/"
  ]

  supported_identity_providers = ["Google"]

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

  depends_on = [aws_cognito_identity_provider.google]
}

