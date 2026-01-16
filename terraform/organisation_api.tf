#####################################################################
# ORGANISATION API FEATURE
# Complete organisation management system including:
# - DynamoDB tables for organisations, members, and invitations
# - IAM policies for Lambda execution
# - Lambda functions for organisation operations
# - API Gateway endpoints for /organisation resources
#####################################################################

#####################################################################
# DYNAMODB TABLES FOR ORGANISATIONS
#####################################################################

# Main organisations table
resource "aws_dynamodb_table" "organisations" {
  name         = "printerapp-organisations-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organisation_id"

  attribute {
    name = "organisation_id"
    type = "S"
  }
}

# Organisation members table with GSI on user_id
resource "aws_dynamodb_table" "org_members" {
  name         = "printerapp-org-members-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organisation_id"
  range_key    = "user_id"

  attribute {
    name = "organisation_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }
}

# Organisation invitations table with GSI on email
resource "aws_dynamodb_table" "org_invitations" {
  name         = "printerapp-org-invitations-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "organisation_id"
  range_key    = "invitation_id"

  attribute {
    name = "organisation_id"
    type = "S"
  }

  attribute {
    name = "invitation_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # TTL for auto-expiring invitations
  ttl {
    attribute_name = "expires_at_ttl"
    enabled        = true
  }
}

#####################################################################
# IAM POLICY FOR ORGANISATION TABLES
#####################################################################

resource "aws_iam_role_policy" "lambda_organisation_dynamodb_policy" {
  name = "lambda-organisation-dynamodb-policy"
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
          aws_dynamodb_table.organisations.arn,
          aws_dynamodb_table.org_members.arn,
          "${aws_dynamodb_table.org_members.arn}/index/*",
          aws_dynamodb_table.org_invitations.arn,
          "${aws_dynamodb_table.org_invitations.arn}/index/*"
        ]
      }
    ]
  })
}

#####################################################################
# LAMBDA FUNCTIONS
#####################################################################

# GET /organisation
resource "aws_lambda_function" "get_organisation" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-get-organisation-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/get_organisation.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORGANISATIONS_TABLE_NAME    = aws_dynamodb_table.organisations.name
      ORG_MEMBERS_TABLE_NAME      = aws_dynamodb_table.org_members.name
      ORG_INVITATIONS_TABLE_NAME  = aws_dynamodb_table.org_invitations.name
      TABLE_NAME                  = aws_dynamodb_table.user_profiles.name
    }
  }
}

# POST /organisation
resource "aws_lambda_function" "create_organisation" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-create-organisation-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/create_organisation.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORGANISATIONS_TABLE_NAME    = aws_dynamodb_table.organisations.name
      ORG_MEMBERS_TABLE_NAME      = aws_dynamodb_table.org_members.name
      ORG_INVITATIONS_TABLE_NAME  = aws_dynamodb_table.org_invitations.name
    }
  }
}

# PUT /organisation
resource "aws_lambda_function" "update_organisation" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-update-organisation-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/update_organisation.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORGANISATIONS_TABLE_NAME    = aws_dynamodb_table.organisations.name
      ORG_MEMBERS_TABLE_NAME      = aws_dynamodb_table.org_members.name
    }
  }
}

# DELETE /organisation
resource "aws_lambda_function" "delete_organisation" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-delete-organisation-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/delete_organisation.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORGANISATIONS_TABLE_NAME    = aws_dynamodb_table.organisations.name
      ORG_MEMBERS_TABLE_NAME      = aws_dynamodb_table.org_members.name
      ORG_INVITATIONS_TABLE_NAME  = aws_dynamodb_table.org_invitations.name
    }
  }
}

# GET /organisation/members
resource "aws_lambda_function" "get_members" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-get-members-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/get_members.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORG_MEMBERS_TABLE_NAME = aws_dynamodb_table.org_members.name
      TABLE_NAME             = aws_dynamodb_table.user_profiles.name
    }
  }
}

# POST /organisation/members/invite
resource "aws_lambda_function" "invite_member" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-invite-member-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/invite_member.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORGANISATIONS_TABLE_NAME    = aws_dynamodb_table.organisations.name
      ORG_MEMBERS_TABLE_NAME      = aws_dynamodb_table.org_members.name
      ORG_INVITATIONS_TABLE_NAME  = aws_dynamodb_table.org_invitations.name
    }
  }
}

# PUT /organisation/members/{member_id}
resource "aws_lambda_function" "update_member" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-update-member-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/update_member.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORG_MEMBERS_TABLE_NAME = aws_dynamodb_table.org_members.name
    }
  }
}

# DELETE /organisation/members/{member_id}
resource "aws_lambda_function" "remove_member" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-remove-member-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/remove_member.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORG_MEMBERS_TABLE_NAME = aws_dynamodb_table.org_members.name
    }
  }
}

# POST /organisation/leave
resource "aws_lambda_function" "leave_organisation" {
  filename         = data.archive_file.api_lambda.output_path
  function_name    = "printerapp-leave-organisation-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "organisations/leave_organisation.lambda_handler"
  source_code_hash = data.archive_file.api_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      ORG_MEMBERS_TABLE_NAME = aws_dynamodb_table.org_members.name
    }
  }
}

#####################################################################
# API GATEWAY RESOURCES
#####################################################################

# /organisation resource
resource "aws_api_gateway_resource" "organisation" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "organisation"
}

# /organisation/members resource
resource "aws_api_gateway_resource" "organisation_members" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.organisation.id
  path_part   = "members"
}

# /organisation/members/invite resource
resource "aws_api_gateway_resource" "organisation_members_invite" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.organisation_members.id
  path_part   = "invite"
}

# /organisation/members/{member_id} resource
resource "aws_api_gateway_resource" "organisation_member" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.organisation_members.id
  path_part   = "{member_id}"
}

# /organisation/leave resource
resource "aws_api_gateway_resource" "organisation_leave" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.organisation.id
  path_part   = "leave"
}

#####################################################################
# API GATEWAY METHODS - /organisation
#####################################################################

# GET /organisation
resource "aws_api_gateway_method" "get_organisation" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_organisation" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation.id
  http_method             = aws_api_gateway_method.get_organisation.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_organisation.invoke_arn
}

# POST /organisation
resource "aws_api_gateway_method" "create_organisation" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "create_organisation" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation.id
  http_method             = aws_api_gateway_method.create_organisation.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_organisation.invoke_arn
}

# PUT /organisation
resource "aws_api_gateway_method" "update_organisation" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "update_organisation" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation.id
  http_method             = aws_api_gateway_method.update_organisation.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_organisation.invoke_arn
}

# DELETE /organisation
resource "aws_api_gateway_method" "delete_organisation" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "delete_organisation" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation.id
  http_method             = aws_api_gateway_method.delete_organisation.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.delete_organisation.invoke_arn
}

# OPTIONS /organisation (CORS)
resource "aws_api_gateway_method" "organisation_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "organisation_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation.id
  http_method = aws_api_gateway_method.organisation_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "organisation_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation.id
  http_method = aws_api_gateway_method.organisation_options.http_method
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

resource "aws_api_gateway_integration_response" "organisation_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation.id
  http_method = aws_api_gateway_method.organisation_options.http_method
  status_code = aws_api_gateway_method_response.organisation_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.organisation_options]
}

#####################################################################
# API GATEWAY METHODS - /organisation/members
#####################################################################

# GET /organisation/members
resource "aws_api_gateway_method" "get_members" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_members.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_members" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation_members.id
  http_method             = aws_api_gateway_method.get_members.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_members.invoke_arn
}

# OPTIONS /organisation/members (CORS)
resource "aws_api_gateway_method" "organisation_members_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_members.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "organisation_members_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members.id
  http_method = aws_api_gateway_method.organisation_members_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "organisation_members_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members.id
  http_method = aws_api_gateway_method.organisation_members_options.http_method
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

resource "aws_api_gateway_integration_response" "organisation_members_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members.id
  http_method = aws_api_gateway_method.organisation_members_options.http_method
  status_code = aws_api_gateway_method_response.organisation_members_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.organisation_members_options]
}

#####################################################################
# API GATEWAY METHODS - /organisation/members/invite
#####################################################################

# POST /organisation/members/invite
resource "aws_api_gateway_method" "invite_member" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_members_invite.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "invite_member" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation_members_invite.id
  http_method             = aws_api_gateway_method.invite_member.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.invite_member.invoke_arn
}

# OPTIONS /organisation/members/invite (CORS)
resource "aws_api_gateway_method" "organisation_members_invite_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_members_invite.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "organisation_members_invite_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members_invite.id
  http_method = aws_api_gateway_method.organisation_members_invite_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "organisation_members_invite_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members_invite.id
  http_method = aws_api_gateway_method.organisation_members_invite_options.http_method
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

resource "aws_api_gateway_integration_response" "organisation_members_invite_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_members_invite.id
  http_method = aws_api_gateway_method.organisation_members_invite_options.http_method
  status_code = aws_api_gateway_method_response.organisation_members_invite_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.organisation_members_invite_options]
}

#####################################################################
# API GATEWAY METHODS - /organisation/members/{member_id}
#####################################################################

# PUT /organisation/members/{member_id}
resource "aws_api_gateway_method" "update_member" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_member.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "update_member" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation_member.id
  http_method             = aws_api_gateway_method.update_member.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_member.invoke_arn
}

# DELETE /organisation/members/{member_id}
resource "aws_api_gateway_method" "remove_member" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_member.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "remove_member" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation_member.id
  http_method             = aws_api_gateway_method.remove_member.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.remove_member.invoke_arn
}

# OPTIONS /organisation/members/{member_id} (CORS)
resource "aws_api_gateway_method" "organisation_member_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_member.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "organisation_member_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_member.id
  http_method = aws_api_gateway_method.organisation_member_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "organisation_member_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_member.id
  http_method = aws_api_gateway_method.organisation_member_options.http_method
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

resource "aws_api_gateway_integration_response" "organisation_member_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_member.id
  http_method = aws_api_gateway_method.organisation_member_options.http_method
  status_code = aws_api_gateway_method_response.organisation_member_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.organisation_member_options]
}

#####################################################################
# API GATEWAY METHODS - /organisation/leave
#####################################################################

# POST /organisation/leave
resource "aws_api_gateway_method" "leave_organisation" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_leave.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "leave_organisation" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.organisation_leave.id
  http_method             = aws_api_gateway_method.leave_organisation.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.leave_organisation.invoke_arn
}

# OPTIONS /organisation/leave (CORS)
resource "aws_api_gateway_method" "organisation_leave_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.organisation_leave.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "organisation_leave_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_leave.id
  http_method = aws_api_gateway_method.organisation_leave_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "organisation_leave_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_leave.id
  http_method = aws_api_gateway_method.organisation_leave_options.http_method
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

resource "aws_api_gateway_integration_response" "organisation_leave_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.organisation_leave.id
  http_method = aws_api_gateway_method.organisation_leave_options.http_method
  status_code = aws_api_gateway_method_response.organisation_leave_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.organisation_leave_options]
}

#####################################################################
# LAMBDA PERMISSIONS
#####################################################################

resource "aws_lambda_permission" "get_organisation" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_organisation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "create_organisation" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_organisation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_organisation" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_organisation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "delete_organisation" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_organisation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_members" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_members.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "invite_member" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.invite_member.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "update_member" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_member.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "remove_member" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remove_member.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "leave_organisation" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leave_organisation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
