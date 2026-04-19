// Conversational chatbot for "Lavadero de Auto" bookings.
// Uses Lovable AI Gateway (Gemini 2.5 Flash) with tool-calling
// to: check availability, create requests directly as 'aceptada'
// (no deposit for MVP), and cancel pending requests.
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `Sos "Fix Bot", asistente de Argentina para reservar turnos de Lavadero de Autos en FIX. Tono resolutivo, natural y cercano.

REGLAS DE INTERACCIÓN:
- CERO SALUDOS REPETITIVOS: ya saludaste en el primer mensaje. PROHIBIDO volver a decir "Hola", "Buenas", "Qué tal" o similares en mensajes siguientes. Usá conectores directos: "¡Perfecto!", "Anotado", "Excelente", "Dale", "Listo".
- FORMATO: breve y al grano. No expliques lo que estás haciendo ("voy a buscar...", "déjame ver..."). Hacelo y devolvé el resultado.
- Hablás en español argentino, usá "vos".
- Si el usuario pide otro rubro (plomero, electricista, peluquero, mascotas, etc.), decile que por ahora SOLO Lavadero de Auto está habilitado y que el resto llega muy pronto. NO inventes disponibilidad.

PROCESAMIENTO DE FECHAS:
- Interpretá lenguaje natural ("mañana", "el próximo lunes", "la semana que viene", "pasado mañana", "hoy a la tarde") y CALCULÁ la fecha exacta YYYY-MM-DD basándote en hoy.
- Si dice "urgente" o "ya", buscá el primer hueco disponible hoy (urgent=true).
- Hoy es: ${new Date().toISOString().split("T")[0]}. Zona horaria Argentina (UTC-3).

REGLA DE LOS 5 LAVADEROS (OBLIGATORIA):
- SIEMPRE usá la tool 'check_availability' antes de prometer un turno. NUNCA inventes nombres ni horarios.
- Cuando el cliente confirme día y hora, OBLIGATORIAMENTE devolvé una lista con los 5 mejores lavaderos rankeados que tengan disponibilidad. Nunca devuelvas solo 1.
- Si la tool devuelve menos de 5, mostrá todos los que haya y aclaralo brevemente ("Estos son los que tengo disponibles").
- Mostralos numerados con nombre y score (ej: "1. Lavadero X ⭐4.8").

RESERVA Y CANCELACIÓN:
- Cuando el usuario elige uno, usá 'create_request'. MVP: NO se cobra seña, el turno queda CONFIRMADO de inmediato.
- Si dice "cancelo", "no", "mejor no", "cancelar", "rechazo" después de crear un pedido, usá 'cancel_request' con el request_id de la última solicitud.
- Si 'create_request' devuelve { needs_login: true }, pedile que se loguee/registre (NO reintentes la tool).
- Después de crear: confirmá el turno y decile que el lavadero le manda el presupuesto al chat.
- No menciones IDs ni detalles técnicos.`;

const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Consulta los lavaderos disponibles para una fecha y hora dadas. Devuelve el top 3 con score, ordenados de mejor a peor. Si urgent=true, ignora la hora y devuelve el primer hueco disponible hoy.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
          time: { type: "string", description: "Hora en formato HH:MM (24h)" },
          urgent: {
            type: "boolean",
            description: "Si es true, ignora la hora y devuelve el primer hueco disponible hoy.",
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
        "Crea una solicitud de servicio de lavado a nombre del usuario logueado. CONFIRMA el turno directamente (sin seña). Solo llamar después de confirmación explícita del usuario.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string", description: "UUID del profesional devuelto por check_availability" },
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
  {
    type: "function",
    function: {
      name: "cancel_request",
      description:
        "Cancela una solicitud previamente creada por el usuario en esta conversación. Usar cuando el usuario indique que quiere cancelar.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "UUID de la solicitud a cancelar" },
        },
        required: ["request_id"],
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

  // Count any blocked slot (paid OR pending) since now we confirm without deposit
  const { data: blocked } = await admin
    .from("blocked_slots")
    .select("professional_id, slot_time, slot_status")
    .in("professional_id", proIds)
    .eq("slot_date", targetDate)
    .in("slot_status", ["paid", "pending"]);

  const occupiedMap = new Map<string, number>();
  blocked?.forEach((b) => {
    const key = `${b.professional_id}|${b.slot_time.slice(0, 5)}`;
    occupiedMap.set(key, (occupiedMap.get(key) || 0) + 1);
  });

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
          allSlots.push({ proId: pro.user_id, proName: pro.full_name, time: t, freeStations: free });
        }
        m += 60;
        if (m >= 60) { h++; m = 0; }
      }
    }
  }

  if (allSlots.length === 0) {
    return { available: [], message: `No hay turnos libres el ${targetDate}.` };
  }

  const scoredPros = await Promise.all(
    pros.map(async (p) => {
      const { data: score } = await admin.rpc("get_professional_score", {
        p_professional_id: p.user_id,
      });
      return { user_id: p.user_id, score: (score as any)?.total_score ?? 3 };
    }),
  );
  const scoreMap = new Map(scoredPros.map((s) => [s.user_id, s.score]));

  let candidates: SlotRow[];
  if (urgent) {
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

  const top = candidates.slice(0, 10).map((s) => ({
    professional_id: s.proId,
    professional_name: s.proName,
    date: targetDate,
    time: s.time,
    score: scoreMap.get(s.proId) ?? 3,
  }));
  top.sort((a, b) => (b.score as number) - (a.score as number));

  return {
    available: top.slice(0, 5),
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

  // Validate professional_id is a real UUID before hitting DB
  if (!args.professional_id || !UUID_RE.test(args.professional_id)) {
    return { error: "ID de profesional inválido. Volvé a consultar disponibilidad." };
  }
  if (!args.date || !args.time) {
    return { error: "Fecha y hora son obligatorias." };
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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify pro exists & is car wash
  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id, rubro")
    .eq("user_id", args.professional_id)
    .maybeSingle();
  if (!pro || pro.rubro !== RUBRO) {
    return { error: "El profesional no está disponible." };
  }

  const { data: profile } = await admin
    .from("client_profiles")
    .select("full_name, phone, address")
    .eq("user_id", userId)
    .maybeSingle();

  // Insert request as ACEPTADA directly (MVP: no deposit step)
  const nowIso = new Date().toISOString();
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
      status: "aceptada",
      responded_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("create_request error", error);
    return { error: error?.message || "No se pudo crear la solicitud." };
  }

  // Block the slot as 'paid' so capacity counts even without real payment
  const { error: blockErr } = await admin
    .from("blocked_slots")
    .insert({
      professional_id: args.professional_id,
      service_request_id: inserted.id,
      slot_date: args.date,
      slot_time: args.time + ":00",
      slot_status: "paid",
    });
  if (blockErr) console.error("blocked_slots insert warning", blockErr);

  return {
    success: true,
    request_id: inserted.id,
    professional_id: args.professional_id,
    professional_name: args.professional_name,
    date: args.date,
    time: args.time,
  };
}

async function cancelRequest(
  args: { request_id: string },
  authHeader: string | null,
) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Necesitás iniciar sesión para cancelar." };
  }
  if (!args.request_id || !UUID_RE.test(args.request_id)) {
    return { error: "No encontré ningún pedido reciente para cancelar." };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return { error: "Sesión inválida." };
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await admin
    .from("service_requests")
    .select("id, client_user_id, status")
    .eq("id", args.request_id)
    .maybeSingle();

  if (!existing || existing.client_user_id !== userId) {
    return { error: "No encontré ese pedido." };
  }
  if (["finalizada", "rechazada_cliente", "rechazada_profesional"].includes(existing.status)) {
    return { error: "Ese pedido ya estaba cerrado." };
  }

  const { error: updErr } = await userClient
    .from("service_requests")
    .update({ status: "rechazada_cliente", updated_at: new Date().toISOString() })
    .eq("id", args.request_id);
  if (updErr) {
    console.error("cancel update error", updErr);
    return { error: "No pude cancelar el pedido." };
  }

  // Free the blocked slot
  await admin
    .from("blocked_slots")
    .delete()
    .eq("service_request_id", args.request_id);

  return { success: true, request_id: args.request_id };
}

// ------- Main handler -------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, active_request_id } = await req.json();
    const authHeader = req.headers.get("Authorization");

    // Inject context about the current active request (if any) so the AI
    // knows which ID to pass to cancel_request without asking the user.
    const contextMsg = active_request_id && UUID_RE.test(active_request_id)
      ? `\n\nCONTEXTO: El usuario tiene un pedido activo recién creado con request_id="${active_request_id}". Si pide cancelar, usá ESE id.`
      : "";

    let conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT + contextMsg },
      ...messages,
    ];

    let lastCreatedRequestId: string | null = null;

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

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({
            reply: msg.content || "",
            request_id: lastCreatedRequestId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      conversation.push(msg);
      for (const call of msg.tool_calls) {
        let result: any;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          if (call.function.name === "check_availability") {
            result = await checkAvailability(args);
          } else if (call.function.name === "create_request") {
            result = await createRequest(args, authHeader);
            if (result?.success && result.request_id) {
              lastCreatedRequestId = result.request_id;
            }
          } else if (call.function.name === "cancel_request") {
            // If the AI didn't pass an id, fall back to the active one
            if (!args.request_id && active_request_id) {
              args.request_id = active_request_id;
            }
            result = await cancelRequest(args, authHeader);
            if (result?.success) {
              lastCreatedRequestId = null;
            }
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
      JSON.stringify({
        reply: "Disculpá, no pude completar la consulta. Probá de nuevo.",
        request_id: lastCreatedRequestId,
      }),
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
