// Cancels the pro's active Mercado Pago preapproval subscription.
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
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: sub } = await admin
      .from("subscriptions")
      .select("provider_subscription_id, provider")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.provider_subscription_id) return json({ error: "No active subscription" }, 404);

    if (sub.provider !== "mercadopago") {
      return json({ error: "Subscription is not on Mercado Pago" }, 400);
    }

    await mpFetch(`/preapproval/${sub.provider_subscription_id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    });

    await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId);

    return json({ cancelled: true });
  } catch (e) {
    console.error("mp-cancel-subscription error", e);
    return json({ error: String(e) }, 500);
  }
});
