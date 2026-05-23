// Reconciles a service_request deposit status by searching MP directly.
// Called from the deposit-confirmed page as a safety net when the webhook hasn't arrived.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch, getProMpToken } from "../_shared/mp.ts";

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

    const { data: sr } = await admin
      .from("service_requests")
      .select("id, client_user_id, professional_id, deposit_paid, deposit_status")
      .eq("id", service_request_id)
      .maybeSingle();
    if (!sr) return json({ error: "not found" }, 404);
    if (sr.client_user_id !== userId && sr.professional_id !== userId) return json({ error: "Forbidden" }, 403);
    if (sr.deposit_paid) return json({ ok: true, already_paid: true });

    // Buscar pago aprobado en MP por external_reference usando el token del PRO
    const proToken = await getProMpToken(admin, sr.professional_id);
    if (!proToken) {
      return json({ ok: true, found: false, paid: false, error: "pro_mp_not_connected" });
    }
    const search: any = await mpFetch(
      `/v1/payments/search?external_reference=deposit:${service_request_id}&sort=date_created&criteria=desc&limit=10`,
      undefined,
      proToken,
    );
    const results: any[] = search?.results ?? [];
    const approved = results.find((p) => p.status === "approved");
    if (!approved) {
      // Devolvemos el último estado encontrado para que el cliente sepa
      const latest = results[0];
      return json({ ok: true, found: !!latest, status: latest?.status ?? null, paid: false });
    }

    await admin
      .from("service_requests")
      .update({
        deposit_payment_id: String(approved.id),
        deposit_status: "paid",
        deposit_paid: true,
        status: "aceptada",
      })
      .eq("id", service_request_id);

    return json({ ok: true, paid: true, payment_id: String(approved.id) });
  } catch (e) {
    console.error("mp-reconcile-deposit error", e);
    return json({ error: String(e) }, 500);
  }
});
