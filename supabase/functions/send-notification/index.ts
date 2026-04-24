import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Service-role client for the actual insert (bypasses RLS but only after we authorize)
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface NotificationPayload {
  type: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  service_request_id?: string;
}

// Allowlist of internal paths to prevent phishing payloads via the link field
const ALLOWED_LINK_PREFIXES = [
  "/dashboard",
  "/mis-pedidos",
  "/profesional",
  "/profesionales",
  "/perfil",
  "/agenda",
  "/notifications",
  "/",
];

function isAllowedLink(link: string): boolean {
  if (!link) return true;
  if (typeof link !== "string") return false;
  if (link.length > 500) return false;
  // Only relative internal paths
  if (!link.startsWith("/")) return false;
  if (link.startsWith("//")) return false;
  return ALLOWED_LINK_PREFIXES.some((p) => link === p || link.startsWith(p + "/") || link.startsWith(p + "?") || link.startsWith(p + "#") || link === p);
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Require a valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return bad(401, "Unauthorized");
    }
    const jwt = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return bad(401, "Unauthorized");
    }
    const callerId = claimsData.claims.sub as string;

    // 2. Parse + validate payload
    const payload = (await req.json()) as NotificationPayload;

    if (!payload.user_id || !payload.type || !payload.title || !payload.message) {
      return bad(400, "Missing required fields");
    }
    if (
      typeof payload.user_id !== "string" ||
      typeof payload.type !== "string" ||
      typeof payload.title !== "string" ||
      typeof payload.message !== "string"
    ) {
      return bad(400, "Invalid field types");
    }
    if (payload.title.length > 200 || payload.message.length > 1000 || payload.type.length > 50) {
      return bad(400, "Field too long");
    }
    if (payload.link && !isAllowedLink(payload.link)) {
      return bad(400, "Invalid link");
    }

    // 3. Authorize: caller may only notify themselves OR the counterparty of a service request they participate in
    let authorized = false;
    if (payload.user_id === callerId) {
      authorized = true;
    } else if (payload.service_request_id) {
      const { data: sr, error: srErr } = await adminClient
        .from("service_requests")
        .select("professional_id, client_user_id")
        .eq("id", payload.service_request_id)
        .maybeSingle();
      if (srErr) {
        console.error("service_requests lookup error:", srErr);
        return bad(500, "Lookup failed");
      }
      if (sr) {
        const callerIsProfessional = sr.professional_id === callerId;
        const callerIsClient = sr.client_user_id === callerId;
        const targetIsProfessional = sr.professional_id === payload.user_id;
        const targetIsClient = sr.client_user_id === payload.user_id;
        if (
          (callerIsProfessional && targetIsClient) ||
          (callerIsClient && targetIsProfessional)
        ) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return bad(403, "Not allowed to notify this user");
    }

    // 4. Insert
    const { error } = await adminClient.from("notifications").insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      service_request_id: payload.service_request_id || null,
    });

    if (error) {
      console.error("Error inserting notification:", error);
      return bad(500, "Insert failed");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return bad(500, "Server error");
  }
});
