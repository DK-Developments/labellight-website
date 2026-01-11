variable "bucket_name" {
  description = "Base name of the S3 bucket for website hosting (environment suffix will be appended)"
  type        = string
  default     = "printerapp-website"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "cognito_domain_prefix" {
  description = "Prefix for Cognito hosted UI domain"
  type        = string
  default     = "printerapp-auth"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_client_id" {
  description = "Microsoft OAuth Client ID (Azure AD Application ID)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_client_secret" {
  description = "Microsoft OAuth Client Secret (Azure AD Client Secret)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "environment" {
  description = "Environment name for API Gateway stage"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Root domain name for the website (e.g., labellight.com)"
  type        = string
  default     = "labellight.com"
}

variable "acm_certificate_arn" {
  description = "ARN of the existing wildcard ACM certificate for the domain (must be in us-east-1)"
  type        = string
}

variable "chrome_extension_id" {
  description = "Chrome extension ID for OAuth callback URL. Get this from Chrome Web Store after first upload, or use chrome.runtime.id for unpacked extensions."
  type        = string
  default     = "khjabnmpieofgdbddbajibmobklgaccp"
}

variable "chrome_extension_extra_ids" {
  description = "Additional Chrome extension IDs allowed for OAuth callback/logout URLs (e.g., other developers' unpacked extension IDs)."
  type        = list(string)
  default = [
    "iokogplbeoehemeondbcjcbngkpgalio",
  ]
}

variable "stripe_secret_key" {
  description = "Stripe Secret API Key for server-side operations"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe Webhook Signing Secret for validating webhook events"
  type        = string
  default     = ""
  sensitive   = true
}
