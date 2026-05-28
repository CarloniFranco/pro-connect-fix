// Updates a plan price safely:
// - Counts currently active subscribers on that plan
// - Updates app_config (new price applies to new signups immediately)
// - For each active subscriber: records pending_price + effective date
//   (current cycle end) and tries to update the MP preapproval amount
//   so MP charges the new amount starting next billing cycle.
// - Creates an in-app notification per affected user (the existing
//   send-notification-email trigger sends the email).
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PLAN_NAMES: Record<string, string> = {
  basico: "Básico",
  premium: "Premium",
};

function formatPrice(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function formatDate(iso: string | null): string {
  if (!iso) return "tu próximo ciclo de facturación";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "tu próximo ciclo de facturación";
  }
}

async function listActiveSubs(planId: string) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id, provider_subscription_id, current_period_end, price_id")
    .eq("product_id", planId)
    .in("status", ["active", "authorized", "trialing"]);
  if (error) throw new Error("db: " + error.message);
  return data ?? [];
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
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // Admin check
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "count" | "apply" | undefined;
    const planId = String(body?.plan_id ?? "");
    const newPrice = Number(body?.new_price);

    if (!planId || !PLAN_NAMES[planId]) return json({ error: "plan_id inválido" }, 400);

    if (action === "count") {
      const subs = await listActiveSubs(planId);
      return json({ count: subs.length });
    }

    if (action !== "apply") return json({ error: "action inválida" }, 400);
    if (!Number.isFinite(newPrice) || newPrice <= 0) return json({ error: "Precio inválido" }, 400);

    const planName = PLAN_NAMES[planId];
    const newPriceRounded = Math.round(newPrice);

    // 1) Update app_config (new signups will see the new price immediately)
    const { error: cfgErr } = await admin
      .from("app_config")
      .upsert({ key: `plan_price_${planId}`, value: String(newPriceRounded) }, { onConflict: "key" });
    if (cfgErr) return json({ error: "No se pudo guardar el precio: " + cfgErr.message }, 500);

    // 2) Affected active subs
    const subs = await listActiveSubs(planId);
    let notified = 0;
    let mpUpdated = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      const effectiveAt = sub.current_period_end ?? null;

      // Mark pending price in our DB
      const { error: upErr } = await admin
        .from("subscriptions")
        .update({
          pending_price: newPriceRounded,
          pending_price_effective_at: effectiveAt,
        })
        .eq("user_id", sub.user_id)
        .eq("product_id", planId);
      if (upErr) errors.push(`sub ${sub.user_id}: ${upErr.message}`);

      // Try to update MP preapproval amount so next charge uses new price
      if (sub.provider_subscription_id) {
        try {
          await mpFetch(`/preapproval/${sub.provider_subscription_id}`, {
            method: "PUT",
            body: JSON.stringify({
              auto_recurring: { transaction_amount: newPriceRounded, currency_id: "ARS" },
            }),
          });
          mpUpdated++;
        } catch (e) {
          console.warn("MP preapproval update failed for", sub.user_id, e);
        }
      }

      // In-app notification (triggers the email via existing pipeline)
      const message = `El precio del plan ${planName} se actualizará a ${formatPrice(newPriceRounded)} a partir de tu próximo período de facturación (${formatDate(effectiveAt)}). Tu ciclo actual no se ve afectado.`;
      const { error: nErr } = await admin.from("notifications").insert({
        user_id: sub.user_id,
        type: "cambio_precio_plan",
        title: "Actualización de precio de tu plan",
        message,
        link: "/mi-suscripcion",
      });
      if (nErr) errors.push(`notif ${sub.user_id}: ${nErr.message}`);
      else notified++;
    }

    return json({
      ok: true,
      plan_id: planId,
      new_price: newPriceRounded,
      affected: subs.length,
      notified,
      mp_updated: mpUpdated,
      errors,
    });
  } catch (e) {
    console.error("admin-update-plan-price error", e);
    return json({ error: String(e) }, 500);
  }
});
