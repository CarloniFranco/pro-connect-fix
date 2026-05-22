// Sends an email via Resend (direct REST API) when a notification is created.
// Triggered by a DB AFTER INSERT trigger on public.notifications via pg_net.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "FIX <notificaciones@resend.dev>";
// INTERNAL_SECRET is loaded lazily from the private app_config table (see getInternalSecret).

const APP_URL = "https://pro-connect-fix.lovable.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Tipos de notificación que disparan email
const EMAIL_ENABLED_TYPES = new Set([
  "nueva_solicitud",
  "presupuesto_recibido",
  "seña_pagada",
  "presupuesto_aceptado",
  "servicio_iniciado",
  "servicio_finalizado",
  "cliente_cancelo",
  "profesional_cancelo",
  "solicitud_rechazada",
  "sena_reembolsada",
]);

function html(title: string, message: string, link?: string) {
  const cta = link
    ? `<p style="margin:24px 0"><a href="${APP_URL}${link}" style="background:#0f3460;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Ver en FIX</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#222;margin:0">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
    <div style="text-align:center;margin-bottom:24px"><span style="font-size:28px;font-weight:bold;color:#0f3460;letter-spacing:-1px">FIX</span></div>
    <h1 style="margin:0 0 12px;color:#0f3460;font-size:22px">${title}</h1>
    <p style="line-height:1.6;font-size:15px;color:#333;margin:0">${message}</p>
    ${cta}
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px"/>
    <p style="color:#888;font-size:12px;margin:0;line-height:1.5">Recibís este mail porque tenés una cuenta en FIX. Podés gestionar tus notificaciones desde tu perfil.</p>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Internal-only endpoint: require shared secret header injected by the DB trigger
    const providedSecret = req.headers.get("x-internal-secret");
    if (!providedSecret || providedSecret !== INTERNAL_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { notification_id } = await req.json();
    if (!notification_id || typeof notification_id !== "string") {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: notif, error: nErr } = await admin
      .from("notifications").select("*").eq("id", notification_id).maybeSingle();
    if (nErr || !notif) {
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_ENABLED_TYPES.has(notif.type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "type not enabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: uErr } = await admin.auth.admin.getUserById(notif.user_id);
    if (uErr || !userData?.user?.email) {
      console.log("No email for user", notif.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [userData.user.email],
        subject: notif.title,
        html: html(notif.title, notif.message, notif.link),
      }),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Resend error", resp.status, result);
      return new Response(JSON.stringify({ error: "Resend failed", detail: result }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true, id: result.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notification-email error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
