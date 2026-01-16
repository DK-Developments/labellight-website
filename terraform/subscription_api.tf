#####################################################################
# SUBSCRIPTION API FEATURE
# Subscription management system including:
# - DynamoDB table for subscriptions
# - IAM policy for Lambda execution
# - Lambda functions for subscription operations
# - API Gateway endpoints for /subscription resources
#
# SUBSCRIPTION MODEL:
# - A subscription can be owned by a user OR an organisation
# - User limits are per subscription
# - Individual users without org use their personal subscription
#####################################################################

#####################################################################
# DYNAMODB TABLE FOR SUBSCRIPTIONS
#####################################################################

resource "aws_dynamodb_table" "subscriptions" {
  name         = "printerapp-subscriptions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "subscription_id"

  attribute {
    name = "subscription_id"
    type = "S"
  }

  attribute {
    name = "owner_id"
    type = "S"
  }

  attribute {
    name = "stripe_subscription_id"
    type = "S"
  }

  # GSI to look up subscription by owner (user_id or organisation_id)
  global_secondary_index {
    name            = "owner_id-index"
    hash_key        = "owner_id"
    projection_type = "ALL"
  }

  # GSI to look up by Stripe subscription ID (for webhooks)
  global_secondary_index {
    name            = "stripe_subscription_id-index"
    hash_key        = "stripe_subscription_id"
    projection_type = "ALL"
  }
}

#####################################################################
# IAM POLICY FOR SUBSCRIPTION TABLE
#####################################################################

resource "aws_iam_role_policy" "lambda_subscription_dynamodb_policy" {
  name = "lambda-subscription-dynamodb-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.subscriptions.arn,
          "${aws_dynamodb_table.subscriptions.arn}/index/*"
        ]
      }
    ]
  })
}

#####################################################################
# LAMBDA LAYER FOR STRIPE
#####################################################################

data "archive_file" "stripe_layer" {
  type        = "zip"
  source_dir  = "${path.module}/stripe_layer"
  output_path = "${path.module}/stripe_layer.zip"
}

resource "aws_lambda_layer_version" "stripe" {
  filename            = data.archive_file.stripe_layer.output_path
  layer_name          = "printerapp-stripe-${var.environment}"
  compatible_runtimes = ["python3.12"]
  source_code_hash    = data.archive_file.stripe_layer.output_base64sha256
  description         = "Stripe Python SDK for payment processing"
}

#####################################################################
# LAMBDA FUNCTIONS
#####################################################################

# GET /subscription
resource "aws_lambda_function" "get_subscription" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-get-subscription-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "subscriptions/get_subscription.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      SUBSCRIPTIONS_TABLE_NAME   = aws_dynamodb_table.subscriptions.name
      ORG_MEMBERS_TABLE_NAME     = aws_dynamodb_table.org_members.name
      ORGANISATIONS_TABLE_NAME   = aws_dynamodb_table.organisations.name
    }
  }
}

# POST /subscription (create checkout session)
resource "aws_lambda_function" "create_checkout" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-create-checkout-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "subscriptions/create_checkout.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10
  layers           = [aws_lambda_layer_version.stripe.arn]

  environment {
    variables = {
      SUBSCRIPTIONS_TABLE_NAME   = aws_dynamodb_table.subscriptions.name
      ORG_MEMBERS_TABLE_NAME     = aws_dynamodb_table.org_members.name
      STRIPE_SECRET_KEY          = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET      = var.stripe_webhook_secret
      WEBSITE_URL                = var.environment == "prod" ? "https://${var.domain_name}" : "https://${var.environment}.${var.domain_name}"
    }
  }
}

# POST /subscription/webhook (Stripe webhook handler)
resource "aws_lambda_function" "stripe_webhook" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-stripe-webhook-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "subscriptions/stripe_webhook.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30
  layers           = [aws_lambda_layer_version.stripe.arn]

  environment {
    variables = {
      SUBSCRIPTIONS_TABLE_NAME = aws_dynamodb_table.subscriptions.name
      STRIPE_SECRET_KEY        = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET    = var.stripe_webhook_secret
    }
  }
}

# POST /subscription/portal (create customer portal session)
resource "aws_lambda_function" "create_portal" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-create-portal-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "subscriptions/create_portal.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10
  layers           = [aws_lambda_layer_version.stripe.arn]

  environment {
    variables = {
      SUBSCRIPTIONS_TABLE_NAME   = aws_dynamodb_table.subscriptions.name
      ORG_MEMBERS_TABLE_NAME     = aws_dynamodb_table.org_members.name
      STRIPE_SECRET_KEY          = var.stripe_secret_key
      WEBSITE_URL                = var.environment == "prod" ? "https://${var.domain_name}" : "https://${var.environment}.${var.domain_name}"
    }
  }
}

#####################################################################
# API GATEWAY RESOURCES
#####################################################################

# /subscription resource
resource "aws_api_gateway_resource" "subscription" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "subscription"
}

# /subscription/webhook resource
resource "aws_api_gateway_resource" "subscription_webhook" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.subscription.id
  path_part   = "webhook"
}

# /subscription/portal resource
resource "aws_api_gateway_resource" "subscription_portal" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.subscription.id
  path_part   = "portal"
}

#####################################################################
# API GATEWAY METHODS - /subscription
#####################################################################

# GET /subscription (authenticated)
resource "aws_api_gateway_method" "get_subscription" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_subscription" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.subscription.id
  http_method             = aws_api_gateway_method.get_subscription.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_subscription.invoke_arn
}

# POST /subscription (authenticated - create checkout)
resource "aws_api_gateway_method" "create_checkout" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "create_checkout" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.subscription.id
  http_method             = aws_api_gateway_method.create_checkout.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_checkout.invoke_arn
}

# POST /subscription/webhook (public - Stripe webhook)
resource "aws_api_gateway_method" "stripe_webhook" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription_webhook.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stripe_webhook" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.subscription_webhook.id
  http_method             = aws_api_gateway_method.stripe_webhook.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.stripe_webhook.invoke_arn
}

# POST /subscription/portal (authenticated - create portal session)
resource "aws_api_gateway_method" "create_portal" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription_portal.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "create_portal" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.subscription_portal.id
  http_method             = aws_api_gateway_method.create_portal.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_portal.invoke_arn
}

#####################################################################
# CORS FOR /subscription
#####################################################################

resource "aws_api_gateway_method" "subscription_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "subscription_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.subscription_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "subscription_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.subscription_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "subscription_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.subscription_options.http_method
  status_code = aws_api_gateway_method_response.subscription_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS for /subscription/webhook
resource "aws_api_gateway_method" "subscription_webhook_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription_webhook.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "subscription_webhook_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_webhook.id
  http_method = aws_api_gateway_method.subscription_webhook_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "subscription_webhook_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_webhook.id
  http_method = aws_api_gateway_method.subscription_webhook_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "subscription_webhook_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_webhook.id
  http_method = aws_api_gateway_method.subscription_webhook_options.http_method
  status_code = aws_api_gateway_method_response.subscription_webhook_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Stripe-Signature'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS for /subscription/portal
resource "aws_api_gateway_method" "subscription_portal_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.subscription_portal.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "subscription_portal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_portal.id
  http_method = aws_api_gateway_method.subscription_portal_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "subscription_portal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_portal.id
  http_method = aws_api_gateway_method.subscription_portal_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "subscription_portal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.subscription_portal.id
  http_method = aws_api_gateway_method.subscription_portal_options.http_method
  status_code = aws_api_gateway_method_response.subscription_portal_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

#####################################################################
# LAMBDA PERMISSIONS
#####################################################################

resource "aws_lambda_permission" "get_subscription" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_subscription.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_checkout" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_checkout.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "stripe_webhook" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stripe_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_portal" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_portal.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
