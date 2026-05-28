// Sync the current user's subscription status from Mercado Pago.
// Lists preapprovals filtered by external_reference and upserts the latest into our DB.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch } from "../_shared/mp.ts";

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
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const environment = (Deno.env.get("MP_ENV") ?? "live") as string;

    const { data: localSub, error: subError } = await admin
      .from("subscriptions")
      .select("provider_subscription_id, product_id, status, current_period_start")
      .eq("user_id", userId)
      .eq("provider", "mercadopago")
      .maybeSingle();
    if (subError) return json({ error: "db_read_failed", detail: subError.message }, 500);
    if (!localSub?.provider_subscription_id) return json({ ok: true, found: false, active: false });

    const best: any = await mpFetch(`/preapproval/${localSub.provider_subscription_id}`);
    const expectedRef = `sub:${userId}:${localSub.product_id}`;
    if (best.external_reference !== expectedRef) {
      console.warn("preapproval external_reference mismatch", { expectedRef, got: best.external_reference });
      return json({ ok: true, found: false, active: false });
    }

    const nextPayment = best.next_payment_date ? new Date(best.next_payment_date).toISOString() : null;
    const amount = best.auto_recurring?.transaction_amount;
    const shouldActivate = localSub.status === "pending" && best.status === "authorized";
    const storedStatus = shouldActivate ? "active" : best.status;
    const periodStart = shouldActivate
      ? (localSub.current_period_start ?? new Date().toISOString())
      : localSub.current_period_start;
    const isActive = storedStatus === "active" && !!periodStart && !!nextPayment && new Date(nextPayment) > new Date();

    const { error: upsertError } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "mercadopago",
        provider_subscription_id: best.id,
        provider_customer_id: best.payer_email ?? null,
        product_id: localSub.product_id,
        price_id: amount != null ? String(amount) : null,
        status: storedStatus,
        init_point: best.init_point ?? null,
        environment,
        current_period_start: periodStart,
        current_period_end: nextPayment,
      },
      { onConflict: "user_id" }
    );
    if (upsertError) {
      console.error("upsert subscription failed", upsertError);
      return json({ error: "db_upsert_failed", detail: upsertError.message }, 500);
    }

    return json({ ok: true, found: true, active: isActive, status: storedStatus, plan: localSub.product_id });
  } catch (e) {
    console.error("mp-sync-subscription error", e);
    return json({ error: String(e) }, 500);
  }
});
