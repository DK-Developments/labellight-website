"""
Helper utilities for Lambda functions
Provides common helper functions for auth, database, and timestamps
"""
import os
import boto3
from datetime import datetime


# Initialize DynamoDB resource (shared across all functions)
dynamodb = boto3.resource('dynamodb')


def get_user_id_from_event(event):
    # Extract authenticated user_id from Cognito JWT claims in API Gateway event.
    return event['requestContext']['authorizer']['claims']['sub']

def get_table(table_name_env_var):
    table_name = os.environ[table_name_env_var]
    return dynamodb.Table(table_name)

def get_current_timestamp():
    return datetime.utcnow().isoformat()

def parse_request_body(event):
    import json
    return json.loads(event.get('body', '{}'))

def get_query_param(event, param_name, default=None):
    query_params = event.get('queryStringParameters', {}) or {}
    return query_params.get(param_name, default)

def get_path_param(event, param_name):
    # Get path parameter from API Gateway event.
    return event['pathParameters'][param_name]

