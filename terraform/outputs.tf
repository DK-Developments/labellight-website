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

output "custom_domain_url" {
  description = "Custom domain URL of the website"
  value       = var.environment == "prod" ? "https://www.${var.domain_name}" : "https://${var.environment}.${var.domain_name}"
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  description = "Nameservers for the Route 53 hosted zone - update your domain registrar with these"
  value       = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.website.arn
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
  value       = "${var.cognito_domain_prefix}-${var.environment}.auth.${var.aws_region}.amazoncognito.com"
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

