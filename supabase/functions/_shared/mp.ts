// Shared Mercado Pago helpers
const MP_BASE = "https://api.mercadopago.com";

export const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function mpFetch(path: string, init?: RequestInit) {
  if (!MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN not configured");
  const resp = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("MP API error", resp.status, body);
    throw new Error(`MP API ${resp.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://pro-connect-fix.lovable.app";
