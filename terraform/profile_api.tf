#####################################################################
# PROFILE API FEATURE
# Complete user profile system including:
# - DynamoDB table for profile storage
# - IAM roles and policies for Lambda execution
# - Lambda functions for profile operations
# - API Gateway endpoints for /profile resource
#####################################################################

#####################################################################
# DYNAMODB TABLE FOR USER PROFILES
#####################################################################

resource "aws_dynamodb_table" "user_profiles" {
  name         = "printerapp-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }
}

#####################################################################
# IAM ROLE FOR LAMBDA FUNCTIONS
#####################################################################

resource "aws_iam_role" "lambda_execution" {
  name = "printerapp-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "lambda-dynamodb-policy"
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
        Resource = aws_dynamodb_table.user_profiles.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

#####################################################################
# LAMBDA FUNCTIONS
#####################################################################

data "archive_file" "get_profile_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../src/api"
  output_path = "${path.module}/lambda_get_profile.zip"
}

data "archive_file" "create_profile_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../src/api"
  output_path = "${path.module}/lambda_create_profile.zip"
}

data "archive_file" "update_profile_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../src/api"
  output_path = "${path.module}/lambda_update_profile.zip"
}

resource "aws_lambda_function" "get_profile" {
  filename         = data.archive_file.get_profile_lambda.output_path
  function_name    = "printerapp-get-profile"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "profiles/get_profile.lambda_handler"
  source_code_hash = data.archive_file.get_profile_lambda.output_base64sha256
  runtime         = "python3.12"
  timeout         = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.user_profiles.name
    }
  }
}

resource "aws_lambda_function" "create_profile" {
  filename         = data.archive_file.create_profile_lambda.output_path
  function_name    = "printerapp-create-profile"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "profiles/create_profile.lambda_handler"
  source_code_hash = data.archive_file.create_profile_lambda.output_base64sha256
  runtime         = "python3.12"
  timeout         = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.user_profiles.name
    }
  }
}

resource "aws_lambda_function" "update_profile" {
  filename         = data.archive_file.update_profile_lambda.output_path
  function_name    = "printerapp-update-profile"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "profiles/update_profile.lambda_handler"
  source_code_hash = data.archive_file.update_profile_lambda.output_base64sha256
  runtime         = "python3.12"
  timeout         = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.user_profiles.name
    }
  }
}

#####################################################################
# API GATEWAY
#####################################################################

resource "aws_api_gateway_rest_api" "main" {
  name        = "printerapp-api"
  description = "Printerapp API for user profiles"
}

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

resource "aws_api_gateway_resource" "profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "profile"
}

# GET /profile method
resource "aws_api_gateway_method" "get_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_profile" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.profile.id
  http_method             = aws_api_gateway_method.get_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_profile.invoke_arn
}

# POST /profile method
resource "aws_api_gateway_method" "create_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "create_profile" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.profile.id
  http_method             = aws_api_gateway_method.create_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_profile.invoke_arn
}

# PUT /profile method
resource "aws_api_gateway_method" "update_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "update_profile" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.profile.id
  http_method             = aws_api_gateway_method.update_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_profile.invoke_arn
}

# CORS OPTIONS method for /profile
resource "aws_api_gateway_method" "profile_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = aws_api_gateway_method_response.profile_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.profile_options]
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.profile.id,
      aws_api_gateway_method.get_profile.id,
      aws_api_gateway_method.create_profile.id,
      aws_api_gateway_method.update_profile.id,
      aws_api_gateway_method.profile_options.id,
      aws_api_gateway_integration.get_profile.id,
      aws_api_gateway_integration.create_profile.id,
      aws_api_gateway_integration.update_profile.id,
      aws_api_gateway_integration.profile_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.get_profile,
    aws_api_gateway_integration.create_profile,
    aws_api_gateway_integration.update_profile,
    aws_api_gateway_integration.profile_options,
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
}

resource "aws_lambda_permission" "get_profile" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_profile" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_profile" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

