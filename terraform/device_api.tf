#####################################################################
# DEVICE API FEATURE
# Device management system for device limiting including:
# - DynamoDB table for devices
# - IAM policy for Lambda execution
# - Lambda functions for device operations
# - API Gateway endpoints for /devices resources
#####################################################################

#####################################################################
# DYNAMODB TABLE FOR DEVICES
#####################################################################

resource "aws_dynamodb_table" "devices" {
  name         = "printerapp-devices-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "device_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "device_id"
    type = "S"
  }

  # TTL for auto-removing inactive devices (optional)
  ttl {
    attribute_name = "expires_at_ttl"
    enabled        = true
  }
}

#####################################################################
# IAM POLICY FOR DEVICE TABLE
#####################################################################

resource "aws_iam_role_policy" "lambda_device_dynamodb_policy" {
  name = "lambda-device-dynamodb-policy"
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
          aws_dynamodb_table.devices.arn
        ]
      }
    ]
  })
}

#####################################################################
# LAMBDA FUNCTIONS
#####################################################################

data "archive_file" "device_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../src/api"
  output_path = "${path.module}/lambda_device.zip"
}

# GET /devices
resource "aws_lambda_function" "get_devices" {
  filename         = data.archive_file.device_lambda.output_path
  function_name    = "printerapp-get-devices-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "devices/get_devices.lambda_handler"
  source_code_hash = data.archive_file.device_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      DEVICES_TABLE_NAME = aws_dynamodb_table.devices.name
    }
  }
}

# POST /devices
resource "aws_lambda_function" "register_device" {
  filename         = data.archive_file.device_lambda.output_path
  function_name    = "printerapp-register-device-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "devices/register_device.lambda_handler"
  source_code_hash = data.archive_file.device_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      DEVICES_TABLE_NAME = aws_dynamodb_table.devices.name
    }
  }
}

# DELETE /devices/{device_id}
resource "aws_lambda_function" "remove_device" {
  filename         = data.archive_file.device_lambda.output_path
  function_name    = "printerapp-remove-device-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "devices/remove_device.lambda_handler"
  source_code_hash = data.archive_file.device_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      DEVICES_TABLE_NAME = aws_dynamodb_table.devices.name
    }
  }
}

# POST /devices/{device_id}/heartbeat
resource "aws_lambda_function" "device_heartbeat" {
  filename         = data.archive_file.device_lambda.output_path
  function_name    = "printerapp-device-heartbeat-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "devices/device_heartbeat.lambda_handler"
  source_code_hash = data.archive_file.device_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      DEVICES_TABLE_NAME = aws_dynamodb_table.devices.name
    }
  }
}

#####################################################################
# API GATEWAY RESOURCES
#####################################################################

# /devices resource
resource "aws_api_gateway_resource" "devices" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "devices"
}

# /devices/{device_id} resource
resource "aws_api_gateway_resource" "device" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.devices.id
  path_part   = "{device_id}"
}

# /devices/{device_id}/heartbeat resource
resource "aws_api_gateway_resource" "device_heartbeat" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.device.id
  path_part   = "heartbeat"
}

#####################################################################
# API GATEWAY METHODS - /devices
#####################################################################

# GET /devices
resource "aws_api_gateway_method" "get_devices" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.devices.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_devices" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.devices.id
  http_method             = aws_api_gateway_method.get_devices.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_devices.invoke_arn
}

# POST /devices
resource "aws_api_gateway_method" "register_device" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.devices.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "register_device" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.devices.id
  http_method             = aws_api_gateway_method.register_device.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.register_device.invoke_arn
}

# OPTIONS /devices (CORS)
resource "aws_api_gateway_method" "devices_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.devices.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "devices_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.devices.id
  http_method = aws_api_gateway_method.devices_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "devices_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.devices.id
  http_method = aws_api_gateway_method.devices_options.http_method
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

resource "aws_api_gateway_integration_response" "devices_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.devices.id
  http_method = aws_api_gateway_method.devices_options.http_method
  status_code = aws_api_gateway_method_response.devices_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.devices_options]
}

#####################################################################
# API GATEWAY METHODS - /devices/{device_id}
#####################################################################

# DELETE /devices/{device_id}
resource "aws_api_gateway_method" "remove_device" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.device.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "remove_device" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.device.id
  http_method             = aws_api_gateway_method.remove_device.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.remove_device.invoke_arn
}

# OPTIONS /devices/{device_id} (CORS)
resource "aws_api_gateway_method" "device_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.device.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "device_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device.id
  http_method = aws_api_gateway_method.device_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "device_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device.id
  http_method = aws_api_gateway_method.device_options.http_method
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

resource "aws_api_gateway_integration_response" "device_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device.id
  http_method = aws_api_gateway_method.device_options.http_method
  status_code = aws_api_gateway_method_response.device_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.device_options]
}

#####################################################################
# API GATEWAY METHODS - /devices/{device_id}/heartbeat
#####################################################################

# POST /devices/{device_id}/heartbeat
resource "aws_api_gateway_method" "device_heartbeat" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.device_heartbeat.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "device_heartbeat" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.device_heartbeat.id
  http_method             = aws_api_gateway_method.device_heartbeat.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.device_heartbeat.invoke_arn
}

# OPTIONS /devices/{device_id}/heartbeat (CORS)
resource "aws_api_gateway_method" "device_heartbeat_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.device_heartbeat.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "device_heartbeat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device_heartbeat.id
  http_method = aws_api_gateway_method.device_heartbeat_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "device_heartbeat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device_heartbeat.id
  http_method = aws_api_gateway_method.device_heartbeat_options.http_method
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

resource "aws_api_gateway_integration_response" "device_heartbeat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.device_heartbeat.id
  http_method = aws_api_gateway_method.device_heartbeat_options.http_method
  status_code = aws_api_gateway_method_response.device_heartbeat_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.device_heartbeat_options]
}

#####################################################################
# LAMBDA PERMISSIONS
#####################################################################

resource "aws_lambda_permission" "get_devices" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_devices.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "register_device" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_device.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "remove_device" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remove_device.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "device_heartbeat" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.device_heartbeat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
