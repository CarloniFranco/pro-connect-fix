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

    // Buscar preapprovals creados con external_reference que arranque con sub:<userId>:
    // El endpoint /preapproval/search acepta el filtro external_reference exacto, así que
    // probamos los planes conocidos.
    const planIds = ["basico", "premium"];
    let best: any = null;
    for (const planId of planIds) {
      const ref = `sub:${userId}:${planId}`;
      try {
        const res: any = await mpFetch(
          `/preapproval/search?external_reference=${encodeURIComponent(ref)}&limit=20`
        );
        const items: any[] = res?.results ?? [];
        for (const it of items) {
          if (!best) { best = { ...it, plan_id: planId }; continue; }
          const rank = (s: string) => s === "authorized" ? 3 : s === "paused" ? 2 : s === "pending" ? 1 : 0;
          if (rank(it.status) > rank(best.status)) best = { ...it, plan_id: planId };
        }
      } catch (e) {
        console.warn("search preapproval failed", planId, e);
      }
    }

    if (!best) return json({ ok: true, found: false });

    const nextPayment = best.next_payment_date ? new Date(best.next_payment_date).toISOString() : null;
    const amount = best.auto_recurring?.transaction_amount;

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "mercadopago",
        provider_subscription_id: best.id,
        provider_customer_id: best.payer_email ?? null,
        product_id: best.plan_id,
        price_id: amount != null ? String(amount) : null,
        status: best.status,
        init_point: best.init_point ?? null,
        environment,
        current_period_end: nextPayment,
      },
      { onConflict: "user_id" }
    );

    return json({ ok: true, found: true, status: best.status, plan: best.plan_id });
  } catch (e) {
    console.error("mp-sync-subscription error", e);
    return json({ error: String(e) }, 500);
  }
});
