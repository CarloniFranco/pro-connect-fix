// Refunds a previously paid deposit. Called internally (service finalized OK, pro rejected, etc.)
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
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { service_request_id } = await req.json();
    if (!service_request_id) return json({ error: "service_request_id required" }, 400);

    const { data: sr, error: sErr } = await admin
      .from("service_requests")
      .select("id, professional_id, client_user_id, deposit_payment_id, deposit_status, deposit_amount")
      .eq("id", service_request_id)
      .maybeSingle();
    if (sErr || !sr) return json({ error: "Service request not found" }, 404);

    // Solo el pro o el cliente involucrados pueden disparar refund (o admin via service role)
    if (sr.professional_id !== userId && sr.client_user_id !== userId) {
      return json({ error: "Forbidden" }, 403);
    }
    if (sr.deposit_status !== "paid") {
      return json({ error: "Deposit not refundable", current_status: sr.deposit_status }, 400);
    }

    // Si no tenemos el payment_id guardado (webhook nunca llegó / falló firma), buscamos en MP por external_reference
    let paymentId = sr.deposit_payment_id as string | null;
    if (!paymentId) {
      const search = await mpFetch(
        `/v1/payments/search?external_reference=${encodeURIComponent(`deposit:${sr.id}`)}&status=approved&sort=date_created&criteria=desc`
      );
      const results = (search?.results ?? []) as any[];
      const approved = results.find((p) => p.status === "approved");
      if (!approved) {
        return json({ error: "No approved payment found in MP for this deposit" }, 400);
      }
      paymentId = String(approved.id);
      await admin.from("service_requests").update({ deposit_payment_id: paymentId }).eq("id", sr.id);
    }

    const refund = await mpFetch(`/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      body: JSON.stringify({}), // refund total
    });

    await admin
      .from("service_requests")
      .update({
        deposit_status: "refunded",
        deposit_refund_id: String(refund.id),
      })
      .eq("id", sr.id);

    // Borramos los slots bloqueados ya que el servicio finalizó / fue reembolsado
    await admin.from("blocked_slots").delete().eq("service_request_id", sr.id);

    return json({ refunded: true, refund_id: refund.id, payment_id: paymentId });
  } catch (e) {
    console.error("mp-refund-deposit error", e);
    return json({ error: String(e) }, 500);
  }
});
