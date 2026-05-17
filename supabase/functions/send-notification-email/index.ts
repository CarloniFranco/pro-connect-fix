// Sends an email via Resend (connector gateway) when a notification is created.
// Triggered by a DB AFTER INSERT trigger on public.notifications via pg_net.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET") ?? SERVICE_ROLE_KEY;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "FIX <notificaciones@resend.dev>"; // cambiar cuando verifiquen su dominio
const APP_URL = "https://pro-connect-fix.lovable.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function html(title: string, message: string, link?: string) {
  const cta = link
    ? `<p style="margin:24px 0"><a href="${APP_URL}${link}" style="background:#0f3460;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Ver en FIX</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
    <h1 style="margin:0 0 12px;color:#0f3460;font-size:22px">${title}</h1>
    <p style="line-height:1.5;font-size:15px">${message}</p>
    ${cta}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="color:#888;font-size:12px;margin:0">Recibís este mail porque tenés una cuenta en FIX. Podés gestionar tus notificaciones desde tu perfil.</p>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: shared secret from DB trigger
    const auth = req.headers.get("x-internal-secret");
    if (auth !== INTERNAL_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Missing LOVABLE_API_KEY or RESEND_API_KEY");
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

    const { data: userData, error: uErr } = await admin.auth.admin.getUserById(notif.user_id);
    if (uErr || !userData?.user?.email) {
      console.log("No email for user", notif.user_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [userData.user.email],
        subject: notif.title,
        html: html(notif.title, notif.message, notif.link),
      }),
    });

    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Resend error", resp.status, body);
      return new Response(JSON.stringify({ error: "send_failed", status: resp.status, body }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: body?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
