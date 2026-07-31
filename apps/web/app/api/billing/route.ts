import { NextResponse } from 'next/server';
import Stripe from 'stripe';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-06-24.dahlia', 
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId, userId } = body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, 
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/parent/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/parent/dashboard?canceled=true`,
      client_reference_id: userId, 
    });


    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Erro ao criar sessão do Stripe:', error);
    return NextResponse.json(
      { error: 'Não foi possível iniciar o processo de pagamento.' },
      { status: 500 }
    );
  }
}