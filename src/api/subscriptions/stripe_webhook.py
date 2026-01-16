"""
Stripe Webhook Handler
Handles incoming webhook events from Stripe to sync subscription state.

Events handled:
- checkout.session.completed: Initial subscription creation
- customer.subscription.updated: Plan changes, renewals
- customer.subscription.deleted: Cancellation
- invoice.payment_succeeded: Successful payment
- invoice.payment_failed: Failed payment
"""
import os
import json
import uuid
import stripe
from utils.response_builder import success_response, error_response
from utils.helpers import get_table, get_current_timestamp
from subscriptions.plans import get_plan_from_stripe_price, get_user_limit

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

subscriptions_table = get_table('SUBSCRIPTIONS_TABLE_NAME')


def verify_webhook_signature(event):
    """Verify Stripe webhook signature."""
    payload = event.get('body', '')
    sig_header = event.get('headers', {}).get('Stripe-Signature') or event.get('headers', {}).get('stripe-signature')
    
    if not sig_header:
        return None, "Missing Stripe-Signature header"
    
    try:
        stripe_event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return stripe_event, None
    except ValueError as e:
        return None, f"Invalid payload: {str(e)}"
    except stripe.error.SignatureVerificationError as e:
        return None, f"Invalid signature: {str(e)}"


def handle_checkout_completed(session):
    """Handle checkout.session.completed event - create subscription record."""
    metadata = session.get('metadata', {})
    subscription_id = session.get('subscription')
    customer_id = session.get('customer')
    
    if not subscription_id:
        return
    
    # Get subscription details from Stripe
    stripe_sub = stripe.Subscription.retrieve(subscription_id)
    
    # Get plan from price ID
    price_id = stripe_sub['items']['data'][0]['price']['id']
    plan_key, billing_period = get_plan_from_stripe_price(price_id)
    
    if not plan_key:
        plan_key = metadata.get('plan', 'single')
        billing_period = metadata.get('billing_period', 'monthly')
    
    # Create subscription record
    subscription_record = {
        'subscription_id': str(uuid.uuid4()),
        'stripe_subscription_id': subscription_id,
        'stripe_customer_id': customer_id,
        'owner_id': metadata.get('owner_id'),
        'owner_type': metadata.get('owner_type', 'user'),
        'created_by_user_id': metadata.get('user_id'),
        'plan': plan_key,
        'billing_period': billing_period,
        'status': stripe_sub['status'],
        'current_period_start': stripe_sub['current_period_start'],
        'current_period_end': stripe_sub['current_period_end'],
        'cancel_at_period_end': stripe_sub.get('cancel_at_period_end', False),
        'trial_end': stripe_sub.get('trial_end'),
        'user_limit': get_user_limit(plan_key),
        'created_at': get_current_timestamp(),
        'updated_at': get_current_timestamp(),
    }
    
    subscriptions_table.put_item(Item=subscription_record)


def handle_subscription_updated(stripe_sub):
    """Handle customer.subscription.updated event - update subscription record."""
    stripe_sub_id = stripe_sub['id']
    
    # Find existing subscription by Stripe ID
    response = subscriptions_table.query(
        IndexName='stripe_subscription_id-index',
        KeyConditionExpression='stripe_subscription_id = :sid',
        ExpressionAttributeValues={':sid': stripe_sub_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return
    
    subscription = items[0]
    
    # Get updated plan info
    price_id = stripe_sub['items']['data'][0]['price']['id']
    plan_key, billing_period = get_plan_from_stripe_price(price_id)
    
    # Update subscription record
    update_expr = """SET 
        #status = :status,
        current_period_start = :period_start,
        current_period_end = :period_end,
        cancel_at_period_end = :cancel_at_end,
        trial_end = :trial_end,
        updated_at = :updated_at
    """
    
    expr_values = {
        ':status': stripe_sub['status'],
        ':period_start': stripe_sub['current_period_start'],
        ':period_end': stripe_sub['current_period_end'],
        ':cancel_at_end': stripe_sub.get('cancel_at_period_end', False),
        ':trial_end': stripe_sub.get('trial_end'),
        ':updated_at': get_current_timestamp(),
    }
    
    # Update plan if changed
    if plan_key:
        update_expr += ", #plan = :plan, billing_period = :billing, user_limit = :user_limit"
        expr_values[':plan'] = plan_key
        expr_values[':billing'] = billing_period
        expr_values[':user_limit'] = get_user_limit(plan_key)
    
    subscriptions_table.update_item(
        Key={'subscription_id': subscription['subscription_id']},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={
            '#status': 'status',
            '#plan': 'plan'
        } if plan_key else {'#status': 'status'},
        ExpressionAttributeValues=expr_values
    )


def handle_subscription_deleted(stripe_sub):
    """Handle customer.subscription.deleted event - mark subscription as canceled."""
    stripe_sub_id = stripe_sub['id']
    
    # Find existing subscription by Stripe ID
    response = subscriptions_table.query(
        IndexName='stripe_subscription_id-index',
        KeyConditionExpression='stripe_subscription_id = :sid',
        ExpressionAttributeValues={':sid': stripe_sub_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return
    
    subscription = items[0]
    
    # Update status to canceled
    subscriptions_table.update_item(
        Key={'subscription_id': subscription['subscription_id']},
        UpdateExpression='SET #status = :status, canceled_at = :canceled_at, updated_at = :updated_at',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'canceled',
            ':canceled_at': get_current_timestamp(),
            ':updated_at': get_current_timestamp(),
        }
    )


def handle_payment_failed(invoice):
    """Handle invoice.payment_failed event - update subscription status."""
    stripe_sub_id = invoice.get('subscription')
    if not stripe_sub_id:
        return
    
    # Find existing subscription
    response = subscriptions_table.query(
        IndexName='stripe_subscription_id-index',
        KeyConditionExpression='stripe_subscription_id = :sid',
        ExpressionAttributeValues={':sid': stripe_sub_id}
    )
    
    items = response.get('Items', [])
    if not items:
        return
    
    subscription = items[0]
    
    # Update status to past_due
    subscriptions_table.update_item(
        Key={'subscription_id': subscription['subscription_id']},
        UpdateExpression='SET #status = :status, updated_at = :updated_at',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'past_due',
            ':updated_at': get_current_timestamp(),
        }
    )


def lambda_handler(event, context):
    """
    POST /subscription/webhook - Handle Stripe webhook events
    
    This endpoint is NOT authenticated - it validates via Stripe signature
    """
    # Verify webhook signature
    stripe_event, error = verify_webhook_signature(event)
    
    if error:
        return error_response(error, 400)
    
    event_type = stripe_event['type']
    event_data = stripe_event['data']['object']
    
    try:
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(event_data)
        
        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(event_data)
        
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(event_data)
        
        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(event_data)
        
        # Add more event handlers as needed
        
        return success_response({'received': True})
        
    except Exception as e:
        # Log error but return 200 to prevent Stripe retries
        print(f"Error processing webhook: {str(e)}")
        return success_response({'received': True, 'error': str(e)})
