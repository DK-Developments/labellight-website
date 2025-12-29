#####################################################################
# COGNITO SETUP
# Creates a new Cognito user pool for goal-pyramid website
#####################################################################

resource "aws_cognito_user_pool" "main" {
  name = "goal-pyramid-user-pool"
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

# Create app client for goal-pyramid website
resource "aws_cognito_user_pool_client" "main" {
  name         = "goal-pyramid-web-client"
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

