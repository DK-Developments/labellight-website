#####################################################################
# AMAZON SES CONFIGURATION
# Email sending for Cognito verification emails
# 
# Note: SES must be in us-east-1, us-west-2, or eu-west-1 for Cognito
# We use us-east-1 since we already have a provider alias for it
#####################################################################

# SES Domain Identity for labellight.com (prod only)
resource "aws_ses_domain_identity" "main" {
  count    = var.environment == "prod" ? 1 : 0
  provider = aws.us_east_1
  domain   = var.domain_name
}

# DKIM for email authentication
resource "aws_ses_domain_dkim" "main" {
  count    = var.environment == "prod" ? 1 : 0
  provider = aws.us_east_1
  domain   = aws_ses_domain_identity.main[0].domain
}

# Route53 DKIM records
resource "aws_route53_record" "ses_dkim" {
  count   = var.environment == "prod" ? 3 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# Route53 record for SES domain verification
resource "aws_route53_record" "ses_verification" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main[0].verification_token]
}

# Wait for domain verification
resource "aws_ses_domain_identity_verification" "main" {
  count    = var.environment == "prod" ? 1 : 0
  provider = aws.us_east_1
  domain   = aws_ses_domain_identity.main[0].id

  depends_on = [aws_route53_record.ses_verification]
}

# Mail FROM domain for better deliverability
resource "aws_ses_domain_mail_from" "main" {
  count            = var.environment == "prod" ? 1 : 0
  provider         = aws.us_east_1
  domain           = aws_ses_domain_identity.main[0].domain
  mail_from_domain = "mail.${var.domain_name}"
}

# Route53 MX record for MAIL FROM
resource "aws_route53_record" "ses_mail_from_mx" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "mail.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

# Route53 SPF record for MAIL FROM
resource "aws_route53_record" "ses_mail_from_spf" {
  count   = var.environment == "prod" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "mail.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
