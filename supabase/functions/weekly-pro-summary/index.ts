// Sends a weekly summary email to each professional listing their confirmed appointments
// for the current week (Mon-Sun). Triggered by pg_cron every Monday morning.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "FIX <notificaciones@resend.dev>";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const APP_URL = "https://pro-connect-fix.lovable.app";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function fmtDate(d: string) {
  try {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

function buildHtml(proName: string, items: any[]) {
  const rows = items.map((r) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;font-size:14px">${fmtDate(r.scheduled_date)} ${r.scheduled_time?.slice(0,5) ?? ""}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;font-size:14px">${r.service_type ?? ""}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;font-size:14px">${r.client_name ?? ""}</td>
    </tr>`).join("");

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#222;margin:0">
  <div style="max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
    <div style="text-align:center;margin-bottom:24px"><span style="font-size:28px;font-weight:bold;color:#0f3460;letter-spacing:-1px">FIX</span></div>
    <h1 style="margin:0 0 8px;color:#0f3460;font-size:22px">Hola ${proName || ""}, tus turnos de esta semana</h1>
    <p style="line-height:1.6;font-size:15px;color:#333;margin:0 0 16px">Tenés <b>${items.length}</b> turno${items.length === 1 ? "" : "s"} confirmado${items.length === 1 ? "" : "s"} esta semana:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead><tr>
        <th style="text-align:left;padding:10px;border-bottom:2px solid #0f3460;font-size:13px;color:#0f3460">Fecha y hora</th>
        <th style="text-align:left;padding:10px;border-bottom:2px solid #0f3460;font-size:13px;color:#0f3460">Servicio</th>
        <th style="text-align:left;padding:10px;border-bottom:2px solid #0f3460;font-size:13px;color:#0f3460">Cliente</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:24px 0"><a href="${APP_URL}/dashboard" style="background:#0f3460;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Ver agenda en FIX</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px"/>
    <p style="color:#888;font-size:12px;margin:0;line-height:1.5">Recibís este resumen semanal porque tenés una cuenta profesional en FIX. Podés desactivar las notificaciones desde tu perfil.</p>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: cron secret OR service-role JWT
  const cronHeader = req.headers.get("x-cron-secret");
  const authorized = (CRON_SECRET && cronHeader === CRON_SECRET);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Week range: Monday 00:00 (today) to next Monday 00:00
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 1 Mon
  const daysFromMon = (day + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon));
  const nextMonday = new Date(monday.getTime() + 7 * 86400000);
  const startStr = monday.toISOString().slice(0, 10);
  const endStr = nextMonday.toISOString().slice(0, 10);

  // Get all confirmed/active appointments in the week
  const { data: reqs, error } = await admin
    .from("service_requests")
    .select("id, professional_id, service_type, client_name, scheduled_date, scheduled_time, status")
    .gte("scheduled_date", startStr)
    .lt("scheduled_date", endStr)
    .in("status", ["aceptada", "en_servicio"])
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  if (error) {
    console.error("query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by professional
  const byPro: Record<string, any[]> = {};
  for (const r of reqs ?? []) {
    if (!byPro[r.professional_id]) byPro[r.professional_id] = [];
    byPro[r.professional_id].push(r);
  }

  const proIds = Object.keys(byPro);
  if (proIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no appointments" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch pro profiles (name + email pref)
  const { data: profiles } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, email_notifications_enabled")
    .in("user_id", proIds);

  let sent = 0, skipped = 0, failed = 0;
  for (const p of profiles ?? []) {
    if (p.email_notifications_enabled === false) { skipped++; continue; }
    const items = byPro[p.user_id];
    if (!items?.length) continue;

    const { data: userData } = await admin.auth.admin.getUserById(p.user_id);
    const email = userData?.user?.email;
    if (!email) { skipped++; continue; }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: "somosfix.oficial@gmail.com",
        subject: `Tenés ${items.length} turno${items.length === 1 ? "" : "s"} esta semana en FIX`,
        html: buildHtml(p.full_name ?? "", items),
      }),
    });
    if (resp.ok) sent++; else { failed++; console.error("resend failed", await resp.text()); }
  }

  return new Response(JSON.stringify({ sent, skipped, failed, pros: proIds.length }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
