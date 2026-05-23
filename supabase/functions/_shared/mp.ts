// Shared Mercado Pago helpers
const MP_BASE = "https://api.mercadopago.com";

export const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function mpFetch(path: string, init?: RequestInit, token?: string) {
  const accessToken = token ?? MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP access token not provided");
  const resp = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
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

// Obtiene el access_token del profesional desde professional_mp_credentials.
// admin debe ser un cliente service_role.
export async function getProMpToken(admin: any, professionalUserId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("professional_mp_credentials")
    .select("access_token")
    .eq("user_id", professionalUserId)
    .maybeSingle();
  if (error) {
    console.error("getProMpToken error", error);
    return null;
  }
  return data?.access_token ?? null;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://pro-connect-fix.lovable.app";
