#####################################################################
# DNS & CERTIFICATES
# Route53 and ACM configuration for custom domains
#####################################################################

# Get the Route53 hosted zone for labellight.com
data "aws_route53_zone" "main" {
  count = var.environment == "prod" ? 1 : 0
  name  = var.domain_name
}

# ACM Certificate for auth.labellight.com (must be in us-east-1 for Cognito)
resource "aws_acm_certificate" "cognito" {
  count    = var.environment == "prod" ? 1 : 0
  provider = aws.us_east_1

  domain_name       = "auth.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "cognito-auth-cert"
    Environment = var.environment
  }
}

# DNS validation record for the certificate
resource "aws_route53_record" "cognito_cert_validation" {
  for_each = var.environment == "prod" ? {
    for dvo in aws_acm_certificate.cognito[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "cognito" {
  count    = var.environment == "prod" ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.cognito[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cognito_cert_validation : record.fqdn]
}

# CNAME record pointing auth.labellight.com to Cognito
resource "aws_route53_record" "cognito_custom_domain" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "auth.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.custom[0].cloudfront_distribution
    zone_id                = aws_cognito_user_pool_domain.custom[0].cloudfront_distribution_zone_id
    evaluate_target_health = false
  }
}
