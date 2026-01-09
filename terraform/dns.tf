#####################################################################
# DNS AND SSL CONFIGURATION
# Route 53 hosted zone, ACM certificate, and DNS records for
# prod (labellight.com, www.labellight.com) and dev (dev.labellight.com)
#####################################################################

# Provider for us-east-1 (required for ACM certificates used with CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

#####################################################################
# ROUTE 53 HOSTED ZONE
#####################################################################

# Use existing hosted zone for labellight.com
# Note: The hosted zone should be created manually or imported
# to avoid accidental deletion of DNS records
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

#####################################################################
# ACM CERTIFICATE (must be in us-east-1 for CloudFront)
#####################################################################

# SSL Certificate for the domain
resource "aws_acm_certificate" "website" {
  provider          = aws.us_east_1
  domain_name       = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  subject_alternative_names = var.environment == "prod" ? ["www.${var.domain_name}"] : []
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "labellight-cert-${var.environment}"
    Environment = var.environment
  }
}

# DNS validation records for ACM certificate
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "website" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.website.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

#####################################################################
# DNS RECORDS
#####################################################################

# A record for the main domain (apex or subdomain depending on environment)
resource "aws_route53_record" "website_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for IPv6 support
resource "aws_route53_record" "website_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# www subdomain for prod environment only
resource "aws_route53_record" "website_www_a" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "website_www_aaaa" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
