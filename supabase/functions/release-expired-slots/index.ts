import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    // Require shared cron secret to prevent public invocation
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete expired pending blocked slots (24h after quote sent)
    const { data, error } = await supabase
      .from("blocked_slots")
      .delete()
      .eq("slot_status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select("service_request_id");

    if (error) {
      console.error("Error releasing slots:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Also update those service_requests back to "nueva" or mark as expired
    if (data && data.length > 0) {
      const requestIds = [...new Set(data.filter(d => d.service_request_id).map(d => d.service_request_id))];
      
      for (const reqId of requestIds) {
        await supabase
          .from("service_requests")
          .update({ status: "rechazada_cliente" })
          .eq("id", reqId)
          .eq("status", "cotizada"); // Only if still pending
      }
    }

    console.log(`Released ${data?.length || 0} expired slots`);

    return new Response(JSON.stringify({ released: data?.length || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
