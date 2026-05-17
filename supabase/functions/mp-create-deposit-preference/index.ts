// Creates a Mercado Pago payment preference for the service deposit (10% of service amount).
// Called by the client when creating a service request.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch, APP_URL } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { service_request_id } = await req.json();
    if (!service_request_id) return json({ error: "service_request_id required" }, 400);

    const { data: sr, error: sErr } = await admin
      .from("service_requests")
      .select("id, service_type, service_amount, client_user_id, professional_id, deposit_status, deposit_payment_id")
      .eq("id", service_request_id)
      .maybeSingle();
    if (sErr || !sr) return json({ error: "Service request not found" }, 404);
    if (sr.client_user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (sr.deposit_status === "paid") return json({ error: "Deposit already paid" }, 400);

    const serviceAmount = Number(sr.service_amount ?? 0);
    if (!serviceAmount || serviceAmount <= 0) {
      return json({ error: "service_amount must be > 0 to compute deposit" }, 400);
    }

    // Seña = 10% del monto del servicio, mínimo $500
    const depositAmount = Math.max(500, Math.round(serviceAmount * 0.10));

    const preference = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [{
          id: sr.id,
          title: `Seña - ${sr.service_type || "Servicio FIX"}`,
          description: `Seña reembolsable (10% del servicio)`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: depositAmount,
        }],
        external_reference: `deposit:${sr.id}`,
        metadata: {
          service_request_id: sr.id,
          user_id: userId,
          kind: "deposit",
        },
        back_urls: {
          success: `${APP_URL}/mis-pedidos?deposit=success&request=${sr.id}`,
          failure: `${APP_URL}/mis-pedidos?deposit=failure&request=${sr.id}`,
          pending: `${APP_URL}/mis-pedidos?deposit=pending&request=${sr.id}`,
        },
        auto_return: "approved",
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
        statement_descriptor: "FIX SEÑA",
      }),
    });

    await admin
      .from("service_requests")
      .update({
        deposit_amount: depositAmount,
        deposit_init_point: preference.init_point,
        deposit_status: "pending",
      })
      .eq("id", sr.id);

    return json({
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      deposit_amount: depositAmount,
      preference_id: preference.id,
    });
  } catch (e) {
    console.error("mp-create-deposit-preference error", e);
    return json({ error: String(e) }, 500);
  }
});
