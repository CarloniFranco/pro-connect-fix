// Intercambia el `code` de Mercado Pago por access/refresh token y los guarda.
// Llamado desde el frontend luego de que MP redirige al usuario.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, APP_URL } from "../_shared/mp.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID");
const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      return json({ error: "MP OAuth not configured" }, 500);
    }

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

    const { code, state } = await req.json();
    if (!code || !state) return json({ error: "code and state required" }, 400);

    // Valida state
    const { data: stateRow } = await admin
      .from("mp_oauth_states")
      .select("user_id, expires_at")
      .eq("state", state)
      .maybeSingle();

    if (!stateRow) return json({ error: "Invalid state" }, 400);
    if (stateRow.user_id !== userId) return json({ error: "State mismatch" }, 403);
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      return json({ error: "State expired" }, 400);
    }

    // Borra state usado
    await admin.from("mp_oauth_states").delete().eq("state", state);

    const redirectUri = `${APP_URL}/mp-oauth-callback`;

    // Intercambia code por tokens
    const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("MP token exchange failed", tokenData);
      return json({ error: "MP token exchange failed", details: tokenData }, 400);
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Guarda credenciales
    await admin.from("professional_mp_credentials").upsert({
      user_id: userId,
      mp_user_id: String(tokenData.user_id),
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      public_key: tokenData.public_key,
      live_mode: tokenData.live_mode ?? true,
      expires_at: expiresAt,
      scope: tokenData.scope,
    });

    // Marca flag público
    await admin
      .from("professional_profiles")
      .update({ mp_connected: true, mp_connected_at: new Date().toISOString() })
      .eq("user_id", userId);

    return json({ ok: true, mp_user_id: tokenData.user_id });
  } catch (e) {
    console.error("mp-oauth-callback error", e);
    return json({ error: String(e) }, 500);
  }
});
