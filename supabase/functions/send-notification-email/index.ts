// Sends an email via Gmail (Lovable connector gateway) when a notification is created.
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
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
const FROM_EMAIL = "somosfix.oficial@gmail.com";
const FROM_NAME = "FIX";

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const APP_URL = "https://pro-connect-fix.lovable.app";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// base64url encode a UTF-8 string
function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Encode subject per RFC 2047 (UTF-8 base64) so acentos/emoji se ven bien
function encodeHeader(value: string): string {
  // ASCII-only? return as is
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

function buildRawEmail(to: string, subject: string, htmlBody: string): string {
  const msg = [
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
  ].join("\r\n");
  return b64url(msg);
}



let cachedInternalSecret: string | null = null;
async function getInternalSecret(): Promise<string | null> {
  if (cachedInternalSecret) return cachedInternalSecret;
  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "internal_trigger_secret")
    .maybeSingle();
  cachedInternalSecret = data?.value ?? null;
  return cachedInternalSecret;
}

// Tipos de notificación que disparan email
const EMAIL_ENABLED_TYPES = new Set([
  // Profesional
  "nueva_solicitud",      // le entra un turno/solicitud
  "cliente_cancelo",      // le cancelan un turno
  "cambio_precio_plan",   // cambio de precio de su plan
  // Cliente
  "pedido_confirmado",    // su pedido quedó confirmado (con o sin seña)
  "servicio_finalizado",  // su servicio terminó
  "profesional_cancelo",  // el profesional canceló el turno
  "sena_reembolsada",     // se le reembolsó la seña
  // Admin
  "broadcast",
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
    const expectedSecret = await getInternalSecret();
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      console.error("Gmail connector not configured");
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

    const [{ data: cliPref }, { data: proPref }] = await Promise.all([
      admin.from("client_profiles").select("email_notifications_enabled").eq("user_id", notif.user_id).maybeSingle(),
      admin.from("professional_profiles").select("email_notifications_enabled").eq("user_id", notif.user_id).maybeSingle(),
    ]);
    const cliOptedOut = cliPref && cliPref.email_notifications_enabled === false;
    const proOptedOut = proPref && proPref.email_notifications_enabled === false;
    if (cliOptedOut || proOptedOut) {
      return new Response(JSON.stringify({ skipped: true, reason: "user opted out" }), {
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

    const raw = buildRawEmail(
      userData.user.email,
      notif.title,
      html(notif.title, notif.message, notif.link),
    );

    const resp = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      },
      body: JSON.stringify({ raw }),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Gmail send error", resp.status, result);
      return new Response(JSON.stringify({ error: "Gmail send failed", detail: result }), {
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
