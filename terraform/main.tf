terraform {
  backend "s3" {
    bucket         = "printerapp-terraform-state"
    key            = "terraform.tfstate"
    region         = "ap-southeast-2"
    dynamodb_table = "printerapp-terraform-locks"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Provider for us-east-1 (kept for state cleanup of orphaned ACM resources)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

#####################################################################
# WEBSITE HOSTING
#####################################################################

# S3 bucket for website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${var.bucket_name}-${var.environment}"
}

# CloudFront Origin Access Control - secure access to S3
resource "aws_cloudfront_origin_access_controasrl" "website" {
  name                              = "printerapp-oac-${var.environment}"
  description                       = "Origin Access Control for website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Keep S3 bucket private - CloudFront will be the only access point
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy to allow ONLY CloudFront access (more secure)
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.website]
}

# CloudFront Distribution with secure Origin Access Control
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"  # Includes Australia/NZ for better local performance. Can change to save money.

  # Custom domain aliases
  aliases = var.environment == "prod" ? [var.domain_name, "www.${var.domain_name}"] : ["${var.environment}.${var.domain_name}"]

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${var.bucket_name}-${var.environment}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.bucket_name}-${var.environment}"
    viewer_protocol_policy = "redirect-to-https"

    # No caching configuration
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
        restriction_type = "whitelist"
        locations        = ["NZ", "AU", "US"]
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
  }
}
