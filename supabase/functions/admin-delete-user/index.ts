// Admin-only: permanently delete a professional/client and all their data.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    // Check admin role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const { target_user_id } = await req.json();
    if (!target_user_id || typeof target_user_id !== "string") {
      return json({ error: "target_user_id required" }, 400);
    }
    if (target_user_id === user.id) {
      return json({ error: "No podés borrar tu propia cuenta admin desde acá" }, 400);
    }

    // Cleanup related data (best-effort)
    await admin.from("notifications").delete().eq("user_id", target_user_id);
    await admin.from("reviews").delete().eq("client_user_id", target_user_id);
    await admin.from("reviews").delete().eq("professional_id", target_user_id);
    await admin.from("blocked_slots").delete().eq("professional_id", target_user_id);
    await admin.from("service_requests").delete().eq("professional_id", target_user_id);
    await admin.from("service_requests").delete().eq("client_user_id", target_user_id);
    await admin.from("favorites").delete().eq("client_user_id", target_user_id);
    await admin.from("favorites").delete().eq("professional_id", target_user_id);
    await admin.from("subscriptions").delete().eq("user_id", target_user_id);
    await admin.from("professional_mp_credentials").delete().eq("user_id", target_user_id);
    await admin.from("mp_oauth_states").delete().eq("user_id", target_user_id);
    await admin.from("professional_verification").delete().eq("user_id", target_user_id);
    await admin.from("professional_availability").delete().eq("professional_id", target_user_id);
    await admin.from("professional_portfolio").delete().eq("professional_id", target_user_id);
    await admin.from("professional_profiles").delete().eq("user_id", target_user_id);
    await admin.from("client_profiles").delete().eq("user_id", target_user_id);
    await admin.from("user_roles").delete().eq("user_id", target_user_id);

    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (delErr) {
      console.error("admin-delete-user error", delErr);
      return json({ error: delErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("admin-delete-user error", e);
    return json({ error: String(e) }, 500);
  }
});
