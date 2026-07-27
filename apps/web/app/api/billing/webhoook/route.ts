import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
    
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(` Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the events for the subscription lifecycle
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      
      const userId = checkoutSession.client_reference_id;
      const customerId = checkoutSession.customer;
      
      console.log(`✅ Payment confirmed! User ID: ${userId} | Customer ID: ${customerId}`);
      
      // UPDATE Supabase using the Service Role Key to activate the user's premium plan.
      break;
    
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      console.log(`❌ Payment failed for Stripe Customer: ${failedInvoice.customer}`);
      
      
      // Update the user's status in Supabase to 'past_due' or cancel the plan.
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`🗑️ Subscription canceled for Customer: ${subscription.customer}`);
      
  
      // Revoke premium access in Supabase.
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response quickly so Stripe doesn't retry the webhook
  return NextResponse.json({ received: true });
}