output "website_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "website_url" {
  description = "URL of the website"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID for printerapp"
  value       = aws_cognito_user_pool_client.main.id
}

output "cognito_domain" {
  description = "Cognito domain for authentication"
  value = var.environment == "prod" ? (
    length(aws_cognito_user_pool_domain.custom) > 0 ? "auth.${var.domain_name}" : null
  ) : (
    length(aws_cognito_user_pool_domain.main) > 0 ? "${var.cognito_domain_prefix}-${var.environment}.auth.${var.aws_region}.amazoncognito.com" : null
  )
}

output "api_url" {
  description = "API Gateway URL"
  value       = "${aws_api_gateway_stage.main.invoke_url}"
}

output "cognito_extension_client_id" {
  description = "Cognito User Pool Client ID for Chrome extension"
  value       = aws_cognito_user_pool_client.extension.id
}

output "extension_redirect_uri" {
  description = "OAuth redirect URI for Chrome extension"
  value       = "https://${var.chrome_extension_id}.chromiumapp.org/"
}

#####################################################################
# ORGANISATION TABLES
#####################################################################

output "organisations_table_name" {
  description = "DynamoDB table name for organisations"
  value       = aws_dynamodb_table.organisations.name
}

output "org_members_table_name" {
  description = "DynamoDB table name for organisation members"
  value       = aws_dynamodb_table.org_members.name
}

output "org_invitations_table_name" {
  description = "DynamoDB table name for organisation invitations"
  value       = aws_dynamodb_table.org_invitations.name
}

#####################################################################
# SUBSCRIPTION TABLE
#####################################################################

output "subscriptions_table_name" {
  description = "DynamoDB table name for subscriptions"
  value       = aws_dynamodb_table.subscriptions.name
}

output "stripe_webhook_url" {
  description = "Stripe webhook endpoint URL"
  value       = "${aws_api_gateway_stage.main.invoke_url}/subscription/webhook"
}
