// Conversational chatbot for "Lavadero de Auto" bookings.
// Uses Lovable AI Gateway (Gemini 2.5 Flash) with tool-calling
// to: check availability across active car-wash professionals,
// suggest closest slots, and create service_requests on behalf
// of an authenticated client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const RUBRO = "Lavadero de Auto";

const SYSTEM_PROMPT = `Sos "Fix Bot", un asistente de Argentina que SOLO ayuda a reservar turnos de Lavadero de Autos en la plataforma FIX.

REGLAS CRÍTICAS:
- Hablás en español argentino, breve, simpático y directo. Usá "vos" y "che" con moderación.
- Si el usuario pide otro rubro (plomero, electricista, etc.), respondé que por ahora solo Lavadero de Auto está habilitado y que el resto llegará "muy pronto". NO inventes disponibilidad.
- Para reservar necesitás: fecha y hora aproximada. Si dice "urgente" o "ya", buscá el primer hueco disponible hoy.
- SIEMPRE usá la tool 'check_availability' antes de prometer un turno. NUNCA inventes nombres de lavaderos ni horarios.
- Cuando haya disponibilidad, ofrecé los TOP 2-3 lavaderos (con su nombre y score) para que el usuario elija.
- Cuando el usuario confirma uno, usá la tool 'create_request' para crear la solicitud.
- Si la tool 'create_request' devuelve { needs_login: true }, decile al usuario que se loguee/registre para confirmar el pedido (mostrá un mensaje claro, no llames la tool de nuevo).
- Después de crear la solicitud, decile que el lavadero le va a mandar un presupuesto y que cuando llegue lo va a ver acá mismo.
- No menciones IDs ni detalles técnicos.
- Fecha de hoy: ${new Date().toISOString().split("T")[0]}. Zona horaria de Argentina (UTC-3).`;

const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Consulta los lavaderos disponibles para una fecha y hora dadas. Devuelve el top 3 con score, ordenados de mejor a peor. Si no hay nadie en ese horario exacto, devuelve los huecos más cercanos.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Fecha en formato YYYY-MM-DD",
          },
          time: {
            type: "string",
            description: "Hora en formato HH:MM (24h)",
          },
          urgent: {
            type: "boolean",
            description:
              "Si es true, ignora la hora y devuelve el primer hueco disponible hoy.",
          },
        },
        required: ["date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_request",
      description:
        "Crea una solicitud de servicio de lavado a nombre del usuario logueado. Solo llamar después de confirmación explícita.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string" },
          professional_name: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM" },
          description: {
            type: "string",
            description: "Descripción breve del servicio pedido por el usuario",
          },
        },
        required: ["professional_id", "date", "time", "description"],
        additionalProperties: false,
      },
    },
  },
];

// ------- Tool implementations -------

async function checkAvailability(args: {
  date: string;
  time?: string;
  urgent?: boolean;
}) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { date, time, urgent } = args;

  const targetDate = urgent ? new Date().toISOString().split("T")[0] : date;
  const dow = new Date(targetDate + "T12:00:00").getDay();

  // 1. Active car-wash pros with availability that day
  const { data: pros } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, work_stations, available")
    .eq("rubro", RUBRO)
    .eq("available", true);

  if (!pros || pros.length === 0) {
    return { available: [], message: "No hay lavaderos activos por ahora." };
  }

  const proIds = pros.map((p) => p.user_id);

  const { data: avail } = await admin
    .from("professional_availability")
    .select("professional_id, start_time, end_time")
    .in("professional_id", proIds)
    .eq("day_of_week", dow)
    .eq("is_active", true);

  const { data: blocked } = await admin
    .from("blocked_slots")
    .select("professional_id, slot_time, slot_status")
    .in("professional_id", proIds)
    .eq("slot_date", targetDate)
    .eq("slot_status", "paid");

  // Count occupied per pro/time
  const occupiedMap = new Map<string, number>();
  blocked?.forEach((b) => {
    const key = `${b.professional_id}|${b.slot_time.slice(0, 5)}`;
    occupiedMap.set(key, (occupiedMap.get(key) || 0) + 1);
  });

  // Generate hourly slots per pro
  type SlotRow = { proId: string; proName: string; time: string; freeStations: number };
  const allSlots: SlotRow[] = [];
  for (const pro of pros) {
    const proAvail = avail?.filter((a) => a.professional_id === pro.user_id) || [];
    for (const a of proAvail) {
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      let h = sh, m = sm;
      while (h < eh || (h === eh && m < em)) {
        const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const occ = occupiedMap.get(`${pro.user_id}|${t}`) || 0;
        const free = pro.work_stations - occ;
        if (free > 0) {
          allSlots.push({
            proId: pro.user_id,
            proName: pro.full_name,
            time: t,
            freeStations: free,
          });
        }
        m += 60;
        if (m >= 60) { h++; m = 0; }
      }
    }
  }

  if (allSlots.length === 0) {
    return { available: [], message: `No hay turnos libres el ${targetDate}.` };
  }

  // Get scores
  const scoredPros = await Promise.all(
    pros.map(async (p) => {
      const { data: score } = await admin.rpc("get_professional_score", {
        p_professional_id: p.user_id,
      });
      return { user_id: p.user_id, score: (score as any)?.total_score ?? 3 };
    }),
  );
  const scoreMap = new Map(scoredPros.map((s) => [s.user_id, s.score]));

  // Filter by requested time
  let candidates: SlotRow[];
  if (urgent) {
    // Only future times today
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    candidates = allSlots
      .filter((s) => {
        const [h, m] = s.time.split(":").map(Number);
        return h * 60 + m >= nowMin;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  } else if (time) {
    const [th, tm] = time.split(":").map(Number);
    const target = th * 60 + tm;
    candidates = allSlots.sort((a, b) => {
      const da = Math.abs(parseInt(a.time.split(":")[0]) * 60 + parseInt(a.time.split(":")[1]) - target);
      const db = Math.abs(parseInt(b.time.split(":")[0]) * 60 + parseInt(b.time.split(":")[1]) - target);
      return da - db;
    });
  } else {
    candidates = allSlots.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Top 3 distinct (proId,time)
  const top = candidates.slice(0, 6).map((s) => ({
    professional_id: s.proId,
    professional_name: s.proName,
    date: targetDate,
    time: s.time,
    score: scoreMap.get(s.proId) ?? 3,
  }));

  // Sort top by score desc within similar time proximity
  top.sort((a, b) => (b.score as number) - (a.score as number));

  return {
    available: top.slice(0, 3),
    requested_time: time || null,
    requested_date: targetDate,
  };
}

async function createRequest(
  args: {
    professional_id: string;
    professional_name?: string;
    date: string;
    time: string;
    description: string;
  },
  authHeader: string | null,
) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { needs_login: true, message: "El usuario debe iniciar sesión para confirmar." };
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return { needs_login: true, message: "Sesión inválida. Pedile que vuelva a iniciar sesión." };
  }
  const userId = claimsData.claims.sub as string;

  // Pull client profile for contact data
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from("client_profiles")
    .select("full_name, phone, address")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: inserted, error } = await userClient
    .from("service_requests")
    .insert({
      professional_id: args.professional_id,
      client_user_id: userId,
      client_name: profile?.full_name || (claimsData.claims.email as string)?.split("@")[0] || "Cliente",
      client_phone: profile?.phone || null,
      client_address: profile?.address || null,
      service_type: RUBRO,
      description: args.description,
      scheduled_date: args.date,
      scheduled_time: args.time + ":00",
      status: "nueva",
    })
    .select("id")
    .single();

  if (error) {
    console.error("create_request error", error);
    return { error: error.message };
  }
  return {
    success: true,
    request_id: inserted.id,
    professional_name: args.professional_name,
    date: args.date,
    time: args.time,
  };
}

// ------- Main handler -------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const authHeader = req.headers.get("Authorization");

    let conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Multi-turn tool loop (max 4 iterations to be safe)
    for (let i = 0; i < 4; i++) {
      const aiResp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: conversation,
            tools,
          }),
        },
      );

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Demasiadas consultas, esperá un momento." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos de IA agotados. Avisale al admin." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const t = await aiResp.text();
        console.error("AI gateway error", aiResp.status, t);
        return new Response(JSON.stringify({ error: "Error del asistente" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      // No tool call → final answer
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({ reply: msg.content || "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Push assistant turn (with tool_calls) and execute each tool
      conversation.push(msg);
      for (const call of msg.tool_calls) {
        let result: any;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          if (call.function.name === "check_availability") {
            result = await checkAvailability(args);
          } else if (call.function.name === "create_request") {
            result = await createRequest(args, authHeader);
          } else {
            result = { error: "Tool desconocida" };
          }
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "tool error" };
        }
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ reply: "Disculpá, no pude completar la consulta. Probá de nuevo." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("lavadero-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
