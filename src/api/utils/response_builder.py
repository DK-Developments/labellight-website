"""
Response builder utilities for Lambda functions.
Provides standardized response formatting and error handling.
"""
import json
from decimal import Decimal
from functools import wraps
from botocore.exceptions import ClientError


# Helper to convert Decimal to native Python types for JSON serialization
def decimal_default(obj):
    """Convert Decimal objects to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def build_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body, default=decimal_default)
    }


def success_response(body, status_code=200):
    return build_response(status_code, body)


def error_response(message, status_code=400):
    return build_response(status_code, {'error': message})


def unauthorized_response(message='Unauthorized - Invalid token'):
    return error_response(message, 401)


def not_found_response(message='Resource not found'):
    return error_response(message, 404)


def forbidden_response(message='Forbidden'):
    return error_response(message, 403)


def server_error_response(message='Internal server error'):
    return error_response(message, 500)


def error_handler(func):
    @wraps(func)
    def wrapper(event, context):
        try:
            return func(event, context)
        except KeyError as e:
            print(f"KeyError: Missing required field or claim - {str(e)}")
            return unauthorized_response('Unauthorized - Invalid token or missing required fields')
        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"AWS ClientError: {error_code} - {str(e)}")
            return server_error_response()
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return server_error_response()
    
    return wrapper

