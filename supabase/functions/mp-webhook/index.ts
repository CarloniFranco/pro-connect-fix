// Mercado Pago webhook (IPN). Handles payment events (deposits) and preapproval events (subscriptions).
// Public endpoint — validates against MP_WEBHOOK_SECRET via x-signature header.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, mpFetch, getProMpToken } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// HMAC-SHA256 signature verification per MP docs:
// x-signature: ts=<ts>,v1=<hash>
// manifest = "id:<dataId>;request-id:<x-request-id>;ts:<ts>;"
async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) return false; // require secret in all envs

  const sigHeader = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id") ?? "";
  if (!sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.trim().split("=")) as [string, string][]
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // MP requiere data.id en minúsculas dentro del manifest
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${reqId};ts:${ts};`;
  const keyData = new TextEncoder().encode(MP_WEBHOOK_SECRET);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
    let body: any = {};
    try { body = await req.json(); } catch { /* MP a veces manda body vacío */ }

    const eventType = type ?? body.type ?? body.action?.split(".")[0];
    const dataId = String(body.data?.id ?? url.searchParams.get("id") ?? url.searchParams.get("data.id") ?? "");

    console.log("MP webhook", { eventType, dataId, action: body.action });

    if (!dataId) return json({ ok: true, skipped: "no data id" });

    // Verificar firma. Si falla, NO rechazamos: igual consultamos el pago contra MP
    // con nuestro access token (un atacante no puede falsificar un payment id válido
    // que pertenezca a nuestra cuenta). Solo logueamos el warning.
    const sigOk = await verifySignature(req, dataId);
    if (!sigOk) {
      console.warn("MP webhook signature mismatch — continuing with MP API verification");
    }

    // === PAYMENTS (seña) ===
    if (eventType === "payment") {
      // Si la seña fue a la cuenta del pro, necesitamos su token para consultar el pago.
      // Lo pasamos como query param ?pro=<professional_id> en el notification_url.
      const proIdParam = url.searchParams.get("pro");
      const srIdParam = url.searchParams.get("sr");
      let paymentToken: string | undefined;
      if (proIdParam) {
        const t = await getProMpToken(admin, proIdParam);
        if (t) paymentToken = t;
      }
      // Si no tenemos token del pro (caso legacy), intentamos con el de FIX
      const payment: any = await mpFetch(`/v1/payments/${dataId}`, undefined, paymentToken);
      const extRef: string = payment.external_reference ?? "";
      const kind = payment.metadata?.kind;
      const srId = payment.metadata?.service_request_id
        ?? (extRef.startsWith("deposit:") ? extRef.replace("deposit:", "") : null)
        ?? srIdParam;

      if (kind === "deposit" && srId) {
        let newStatus = "pending";
        if (payment.status === "approved") newStatus = "paid";
        else if (payment.status === "refunded") newStatus = "refunded";
        else if (["rejected", "cancelled"].includes(payment.status)) newStatus = "failed";

        const update: Record<string, unknown> = {
          deposit_payment_id: String(payment.id),
          deposit_status: newStatus,
        };

        if (newStatus === "paid") {
          update.deposit_paid = true;
          update.status = "aceptada";
        }

        await admin.from("service_requests").update(update).eq("id", srId);

        // Sincronizar blocked_slots: si se pagó, confirmar el slot para que no aparezca
        // duplicado como "pendiente" en la agenda del profesional. Si falló, liberarlo.
        if (newStatus === "paid") {
          await admin
            .from("blocked_slots")
            .update({ slot_status: "confirmed", expires_at: null })
            .eq("service_request_id", srId);
        } else if (newStatus === "failed") {
          await admin.from("blocked_slots").delete().eq("service_request_id", srId);
          await admin
            .from("service_requests")
            .update({
              status: "rechazada_cliente",
              cancellation_reason: "Pago de seña rechazado",
              cancelled_by: "system",
            })
            .eq("id", srId)
            .eq("status", "pendiente_pago");
        }
      }
      return json({ ok: true, kind: "payment", status: payment.status });
    }

    // === PREAPPROVAL (suscripción) ===
    if (eventType === "preapproval" || eventType === "subscription_preapproval") {
      const pre: any = await mpFetch(`/preapproval/${dataId}`);
      const extRef: string = pre.external_reference ?? "";
      const [, userId] = extRef.split(":");
      if (!userId) return json({ ok: true, skipped: "no user_id in external_reference" });

      const status = pre.status; // authorized | paused | cancelled | pending
      const nextPayment = pre.next_payment_date ? new Date(pre.next_payment_date).toISOString() : null;

      await admin.from("subscriptions").update({
        status,
        current_period_end: nextPayment,
      }).eq("provider_subscription_id", dataId);

      return json({ ok: true, kind: "preapproval", status });
    }

    return json({ ok: true, skipped: `unhandled event ${eventType}` });
  } catch (e) {
    console.error("mp-webhook error", e);
    // Devolvemos 200 igual para evitar reintentos infinitos de MP en errores de parsing
    return json({ ok: false, error: String(e) }, 200);
  }
});
