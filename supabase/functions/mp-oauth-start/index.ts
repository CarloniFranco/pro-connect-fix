// Inicia el flujo OAuth de Mercado Pago Connect para el profesional logueado.
// Devuelve la URL de autorización con state firmado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, APP_URL } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!MP_CLIENT_ID) return json({ error: "MP_CLIENT_ID not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    // Genera state random y lo guarda
    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await admin.from("mp_oauth_states").insert({ state, user_id: userId });

    const redirectUri = `${APP_URL}/mp-oauth-callback`;
    const authUrl = new URL("https://auth.mercadopago.com.ar/authorization");
    authUrl.searchParams.set("client_id", MP_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    return json({ auth_url: authUrl.toString() });
  } catch (e) {
    console.error("mp-oauth-start error", e);
    return json({ error: String(e) }, 500);
  }
});
