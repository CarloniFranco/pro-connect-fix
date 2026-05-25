// Creates a Mercado Pago preapproval (monthly subscription) for the pro plan.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch, APP_URL } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Planes — los montos se leen desde app_config (plan_price_basico / plan_price_premium).
// Estos valores son sólo fallback si la config no existe.
const PLAN_DEFAULTS: Record<string, { name: string; amount: number; key: string }> = {
  basico: { name: "FIX Básico", amount: 6999, key: "plan_price_basico" },
  premium: { name: "FIX Premium", amount: 14000, key: "plan_price_premium" },
};

async function resolvePlanAmount(planId: string): Promise<number> {
  const def = PLAN_DEFAULTS[planId];
  if (!def) return 0;
  const { data } = await admin.from("app_config").select("value").eq("key", def.key).maybeSingle();
  const n = Number((data as any)?.value);
  return Number.isFinite(n) && n > 0 ? n : def.amount;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub || !claims?.claims?.email) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const email = claims.claims.email as string;

    const { plan_id } = await req.json();
    const def = PLAN_DEFAULTS[plan_id];
    if (!def) return json({ error: "Invalid plan_id" }, 400);
    const amount = await resolvePlanAmount(plan_id);

    const environment = (Deno.env.get("MP_ENV") ?? "live") as string;

    const preapproval = await mpFetch("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: def.name,
        external_reference: `sub:${userId}:${plan_id}`,
        payer_email: email,
        back_url: `${APP_URL}/mi-suscripcion?sub=success`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: "ARS",
        },
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      }),
    });

    // Upsert pending subscription row
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "mercadopago",
        provider_subscription_id: preapproval.id,
        provider_customer_id: email,
        product_id: plan_id,
        price_id: String(amount),
        status: preapproval.status ?? "pending",
        init_point: preapproval.init_point,
        environment,
      },
      { onConflict: "user_id" }
    );

    return json({
      init_point: preapproval.init_point,
      preapproval_id: preapproval.id,
      status: preapproval.status,
    });
  } catch (e) {
    console.error("mp-create-subscription error", e);
    return json({ error: String(e) }, 500);
  }
});
