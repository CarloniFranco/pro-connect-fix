import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface StripeEmbeddedCheckoutProps {
  priceId?: string;
  amountInCents?: number;
  currency?: string;
  productName?: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export function StripeEmbeddedCheckout({
  priceId,
  amountInCents,
  currency,
  productName,
  quantity,
  customerEmail,
  userId,
  returnUrl,
  metadata,
}: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId,
        amountInCents,
        currency,
        productName,
        quantity,
        customerEmail,
        userId,
        returnUrl,
        environment: getStripeEnvironment(),
        metadata,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
