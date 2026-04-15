import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, amountInCents, currency, productName, quantity, customerEmail, userId, returnUrl, environment, metadata } = await req.json();

    const env = (environment || 'sandbox') as StripeEnv;
    const stripe = createStripeClient(env);

    let lineItems: any[];
    let mode: string;

    if (amountInCents) {
      // Dynamic pricing (for deposits/señas)
      if (typeof amountInCents !== 'number' || amountInCents < 100) {
        return new Response(JSON.stringify({ error: "Amount must be at least 100 cents" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lineItems = [{
        price_data: {
          currency: currency || 'ars',
          product_data: { name: productName || 'Seña de servicio' },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }];
      mode = "payment";
    } else if (priceId) {
      // Pre-created price (for subscriptions)
      if (typeof priceId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
        return new Response(JSON.stringify({ error: "Invalid priceId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!prices.data.length) {
        return new Response(JSON.stringify({ error: "Price not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";
      lineItems = [{ price: stripePrice.id, quantity: quantity || 1 }];
      mode = isRecurring ? "subscription" : "payment";
    } else {
      return new Response(JSON.stringify({ error: "priceId or amountInCents required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionParams: any = {
      line_items: lineItems,
      mode,
      ui_mode: "embedded",
      return_url: returnUrl || `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    };

    if (customerEmail) sessionParams.customer_email = customerEmail;

    if (metadata) {
      sessionParams.metadata = metadata;
    }

    if (userId) {
      sessionParams.metadata = { ...sessionParams.metadata, userId };
      if (mode === "subscription") {
        sessionParams.subscription_data = { metadata: { userId } };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
