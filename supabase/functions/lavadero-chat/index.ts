// Fix Bot — chat para reservar turnos de Lavadero (MVP simple).
// Flujo: zona → elegir profesional (con sus vehículos y servicios reales) → confirmar → reserva con seña simulada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const RUBRO = "Lavadero de Auto";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `Sos "Fix Bot", asistente argentino para reservar turnos de Lavadero de Auto en FIX. Tono breve, directo, "vos".

REGLAS CRÍTICAS (ANTI-ALUCINACIÓN):
- NUNCA inventes profesionales, vehículos, servicios, precios u horarios. TODO sale del JSON de las tools.
- Para mostrar la lista de lavaderos, copiá EXACTO el campo 'list_text' que devuelve 'list_professionals'. Sin reescribir, sin agregar.
- Para mostrar vehículos de un profesional, copiá EXACTO 'vehicles_text' de la tool.
- Para mostrar servicios+precios de un profesional para un vehículo, llamá 'get_services_for_vehicle' y copiá EXACTO 'services_text'. PROHIBIDO armar esa lista por tu cuenta.
- Está PROHIBIDO sugerir "lavado de chasis", "lavado de motor", "encerado", "SUV" si no aparecen literalmente en el JSON.
- NUNCA muestres UUIDs al usuario.
- NUNCA digas "no está disponible ese día/hora" sin haber llamado 'check_slot'. Si check_slot devuelve available=true, NO digas que no está disponible.

FLUJO (en orden):
1. ZONA: si todavía no la sabés, pedila ("¿De qué zona/localidad sos?"). No avances sin zona.
2. LISTA: llamá 'list_professionals' con la zona. Pegá el 'list_text' tal cual y pedí que elija un número.
3. VEHÍCULO: cuando elija profesional, pegá 'vehicles_text' tal cual de ese profesional. Pedí que elija vehículo. Prohibido mostrar servicios todavía.
4. SERVICIO: cuando elija vehículo, llamá 'get_services_for_vehicle' con professional_id + vehicle_type. Pegá 'services_text' tal cual y pedí que elija. PROHIBIDO escribir tu propia versión de la lista.
5. DÍA Y HORA: pedí día y hora ("¿qué día y horario te queda cómodo?").
6. CHEQUEO: ANTES de pedir confirmación, llamá 'check_slot' con professional_id + date + time. Si available=false, mostrá los 'suggestions' (horarios reales libres) y pedí que elija otro. Si available=true, seguí.
7. CONFIRMACIÓN: mostrá resumen (lavadero, día, hora, vehículo, servicio, precio total, seña 10%) y pedí "sí" explícito.
8. RESERVA: cuando confirme con "sí", llamá 'book_slot' DIRECTAMENTE. NO vuelvas a chequear disponibilidad por tu cuenta. Si book_slot devuelve success=true, confirmá: "Turno confirmado ✅ Seña $X registrada. Te esperamos el [día] a las [hora]. Mirá tu pedido: [Ver pedido](/mis-pedidos)".
9. CANCELAR: si pide cancelar después de reservar, llamá 'cancel_booking'.

Hoy: ${new Date().toISOString().split("T")[0]}. Zona horaria Argentina (UTC-3).
Si pide otro rubro (plomero, mascota, etc.), avisá que solo Lavadero de Auto está habilitado.
Si 'book_slot' devuelve { needs_login: true }, pedile que se loguee. NO reintentes.`;

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const tools = [
  {
    type: "function",
    function: {
      name: "list_professionals",
      description:
        "Lista lavaderos disponibles cerca de la zona del usuario. Devuelve hasta 5 profesionales rankeados por score, con sus vehículos y servicios cargados.",
      parameters: {
        type: "object",
        properties: {
          locality: { type: "string", description: "Zona/localidad del usuario tal como la dijo" },
        },
        required: ["locality"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_services_for_vehicle",
      description:
        "Devuelve los servicios y precios reales que el lavadero tiene cargados para el tipo de vehículo elegido. Usar después de que el usuario elija vehículo y antes de pedir el día/hora.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string" },
          vehicle_type: { type: "string" },
        },
        required: ["professional_id", "vehicle_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_slot",
      description:
        "Verifica si el profesional atiende ese día y hora y si tiene cupo libre. Devuelve available=true/false y, si está ocupado, una lista de horarios libres reales para ese día.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM (24h)" },
        },
        required: ["professional_id", "date", "time"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_slot",
      description:
        "Crea la reserva con seña simulada (10%). Solo llamar después de confirmación explícita del usuario. Devuelve el id del pedido.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string", description: "UUID del profesional (de list_professionals)" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM (24h)" },
          vehicle_type: { type: "string", description: "Tipo de vehículo elegido (debe estar en vehicle_types del pro)" },
          service_name: { type: "string", description: "Nombre del lavado elegido (debe estar en services del pro)" },
        },
        required: ["professional_id", "date", "time", "vehicle_type", "service_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancela un turno previamente reservado en esta conversación.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "UUID del pedido a cancelar" },
        },
        required: ["request_id"],
        additionalProperties: false,
      },
    },
  },
];

async function listProfessionals(args: { locality: string }) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: prosAll } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, locality, neighborhood, vehicle_types, services")
    .eq("rubro", RUBRO)
    .eq("available", true);

  if (!prosAll || prosAll.length === 0) {
    return { professionals: [], list_text: "Por ahora no hay lavaderos activos en FIX." };
  }

  let pros = prosAll;
  let usedFallback = false;
  if (args.locality?.trim()) {
    const needle = normalize(args.locality);
    const inZone = prosAll.filter((p) => {
      const loc = normalize(p.locality || "");
      const nbh = normalize(p.neighborhood || "");
      return (loc && loc.includes(needle)) || (nbh && nbh.includes(needle));
    });
    if (inZone.length > 0) pros = inZone;
    else usedFallback = true;
  }

  const scored = await Promise.all(
    pros.map(async (p) => {
      const { data: score } = await admin.rpc("get_professional_score", {
        p_professional_id: p.user_id,
      });
      return { pro: p, score: (score as any)?.total_score ?? 3 };
    }),
  );
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  const professionals = top.map((s, idx) => {
    const p = s.pro;
    const vehicleTypes: string[] = Array.isArray(p.vehicle_types) ? p.vehicle_types : [];
    const services = Array.isArray(p.services) ? (p.services as any[]) : [];

    const vehicles_text = vehicleTypes.length
      ? `🚗 Vehículos que atiende ${p.full_name}:\n${vehicleTypes.map((v, i) => `${i + 1}) ${v}`).join("\n")}`
      : `${p.full_name} no tiene vehículos cargados todavía.`;

    const servicesByVehicle: Record<string, string> = {};
    for (const v of vehicleTypes) {
      const lines = services
        .map((sv: any) => {
          const price = Number(sv.prices?.[v] ?? 0);
          return price > 0 ? `${sv.name} — $${price.toLocaleString("es-AR")}` : null;
        })
        .filter(Boolean) as string[];
      servicesByVehicle[v] = lines.length
        ? `🧼 Lavados disponibles para ${v} en ${p.full_name}:\n${lines.map((l, i) => `${i + 1}) ${l}`).join("\n")}`
        : `${p.full_name} no tiene precios cargados para ${v}.`;
    }

    return {
      number: idx + 1,
      professional_id: p.user_id,
      professional_name: p.full_name,
      zone: [p.locality, p.neighborhood].filter(Boolean).join(" · "),
      score: s.score,
      vehicle_types: vehicleTypes,
      services: services.map((sv: any) => ({ name: sv.name, prices: sv.prices || {} })),
      vehicles_text,
      services_text_by_vehicle: servicesByVehicle,
    };
  });

  const list_text = professionals
    .map(
      (p) =>
        `${p.number}) *${p.professional_name}* — ${p.zone || "zona no especificada"} · ⭐ ${p.score}`,
    )
    .join("\n");

  const header = usedFallback
    ? `No encontré lavaderos exactamente en "${args.locality}", pero estos son los mejores cerca:`
    : `Lavaderos en *${args.locality}*:`;

  return {
    used_fallback: usedFallback,
    professionals,
    list_text: `${header}\n${list_text}\n\nDecime el número del que quieras.`,
  };
}

async function computeSlotAvailability(professional_id: string, date: string, time: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, work_stations, rubro")
    .eq("user_id", professional_id)
    .maybeSingle();
  if (!pro || pro.rubro !== RUBRO) {
    return { ok: false as const, reason: "El profesional no está disponible." };
  }

  const dow = new Date(date + "T12:00:00").getDay();
  const { data: avail } = await admin
    .from("professional_availability")
    .select("start_time, end_time")
    .eq("professional_id", professional_id)
    .eq("day_of_week", dow)
    .eq("is_active", true);

  if (!avail || avail.length === 0) {
    return {
      ok: true as const,
      available: false,
      reason: `${pro.full_name} no atiende ese día.`,
      suggestions: [] as string[],
      pro_name: pro.full_name,
    };
  }

  // Build all hourly slots from availability windows
  const allSlots: string[] = [];
  for (const a of avail) {
    const [sh, sm] = a.start_time.split(":").map(Number);
    const [eh, em] = a.end_time.split(":").map(Number);
    let h = sh, m = sm;
    while (h < eh || (h === eh && m < em)) {
      allSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      m += 60;
      if (m >= 60) { h++; m = 0; }
    }
  }

  // Count occupancy
  const { data: blocked } = await admin
    .from("blocked_slots")
    .select("slot_time, slot_status")
    .eq("professional_id", professional_id)
    .eq("slot_date", date)
    .in("slot_status", ["paid", "pending"]);

  const occMap = new Map<string, number>();
  blocked?.forEach((b) => {
    const k = b.slot_time.slice(0, 5);
    occMap.set(k, (occMap.get(k) || 0) + 1);
  });

  const stations = pro.work_stations || 1;
  const freeSlots = allSlots.filter((t) => (occMap.get(t) || 0) < stations);

  const requested = time.length >= 5 ? time.slice(0, 5) : time;
  const isInWindow = allSlots.includes(requested);
  const free = isInWindow && (occMap.get(requested) || 0) < stations;

  if (free) {
    return { ok: true as const, available: true, pro_name: pro.full_name };
  }

  return {
    ok: true as const,
    available: false,
    reason: !isInWindow
      ? `${pro.full_name} no atiende a las ${requested} ese día.`
      : `${pro.full_name} ya tiene tomado ese horario.`,
    suggestions: freeSlots.slice(0, 6),
    pro_name: pro.full_name,
  };
}

async function checkSlot(args: { professional_id: string; date: string; time: string }) {
  if (!UUID_RE.test(args.professional_id)) {
    return { error: "ID de profesional inválido." };
  }
  const r = await computeSlotAvailability(args.professional_id, args.date, args.time);
  if (!r.ok) return { error: r.reason };
  if (r.available) {
    return {
      available: true,
      professional_name: r.pro_name,
      date: args.date,
      time: args.time,
    };
  }
  return {
    available: false,
    reason: r.reason,
    suggestions: r.suggestions ?? [],
    suggestions_text: (r.suggestions ?? []).length
      ? `${r.reason} Horarios libres ese día: ${(r.suggestions ?? []).join(", ")}.`
      : `${r.reason} No quedan horarios libres ese día.`,
    professional_name: r.pro_name,
    date: args.date,
  };
}

async function bookSlot(
  args: {
    professional_id: string;
    date: string;
    time: string;
    vehicle_type: string;
    service_name: string;
  },
  authHeader: string | null,
) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { needs_login: true, message: "Necesitás iniciar sesión para reservar." };
  }
  if (!UUID_RE.test(args.professional_id)) {
    return { error: "ID de profesional inválido. Volvé a elegir." };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return { needs_login: true, message: "Sesión inválida. Volvé a iniciar sesión." };
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, rubro, vehicle_types, services")
    .eq("user_id", args.professional_id)
    .maybeSingle();

  if (!pro || pro.rubro !== RUBRO) return { error: "El profesional no está disponible." };

  const vehicleTypes: string[] = Array.isArray(pro.vehicle_types) ? pro.vehicle_types : [];
  const matchedVehicle = vehicleTypes.find((v) => normalize(v) === normalize(args.vehicle_type));
  if (!matchedVehicle) {
    return { error: `Ese vehículo no está cargado. Opciones: ${vehicleTypes.join(", ") || "ninguna"}.` };
  }

  const services: any[] = Array.isArray(pro.services) ? (pro.services as any[]) : [];
  const matchedService = services.find((s) => normalize(s.name || "") === normalize(args.service_name));
  if (!matchedService) {
    return { error: `Ese servicio no existe. Opciones: ${services.map((s) => s.name).join(", ") || "ninguno"}.` };
  }
  const totalPrice = Number(matchedService.prices?.[matchedVehicle] ?? 0);
  if (!totalPrice || totalPrice <= 0) {
    return { error: `No hay precio cargado para ${matchedVehicle} en ${matchedService.name}.` };
  }
  const depositAmount = Math.round(totalPrice * 0.1);

  // Re-check availability server-side before inserting
  const avCheck = await computeSlotAvailability(args.professional_id, args.date, args.time);
  if (avCheck.ok && !avCheck.available) {
    const sugg = avCheck.suggestions ?? [];
    return {
      error: avCheck.reason,
      suggestions: sugg,
      suggestions_text: sugg.length
        ? `${avCheck.reason} Horarios libres: ${sugg.join(", ")}.`
        : `${avCheck.reason} No quedan horarios libres ese día.`,
    };
  }

  const { data: profile } = await admin
    .from("client_profiles")
    .select("full_name, phone, address")
    .eq("user_id", userId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { data: inserted, error } = await userClient
    .from("service_requests")
    .insert({
      professional_id: args.professional_id,
      client_user_id: userId,
      client_name: profile?.full_name || (claimsData.claims.email as string)?.split("@")[0] || "Cliente",
      client_phone: profile?.phone || null,
      client_address: profile?.address || null,
      service_type: `${matchedService.name} (${matchedVehicle})`,
      description: `${matchedService.name} - ${matchedVehicle}`,
      scheduled_date: args.date,
      scheduled_time: args.time + ":00",
      quoted_amount: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: true,
      status: "aceptada",
      responded_at: nowIso,
    } as any)
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("book_slot error", error);
    return { error: error?.message || "No pude crear el turno." };
  }

  await admin.from("blocked_slots").insert({
    professional_id: args.professional_id,
    service_request_id: inserted.id,
    slot_date: args.date,
    slot_time: args.time + ":00",
    slot_status: "paid",
  });

  return {
    success: true,
    request_id: inserted.id,
    total_price: totalPrice,
    deposit_amount: depositAmount,
    vehicle_type: matchedVehicle,
    service_name: matchedService.name,
  };
}

async function cancelBooking(args: { request_id: string }, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return { error: "Necesitás iniciar sesión." };
  if (!UUID_RE.test(args.request_id)) return { error: "No encontré ese pedido." };

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await userClient.auth.getClaims(token);
  if (!claimsData?.claims) return { error: "Sesión inválida." };
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await admin
    .from("service_requests")
    .select("id, client_user_id, status")
    .eq("id", args.request_id)
    .maybeSingle();
  if (!existing || existing.client_user_id !== userId) return { error: "No encontré ese pedido." };
  if (["finalizada", "rechazada_cliente", "rechazada_profesional"].includes(existing.status)) {
    return { error: "Ese pedido ya estaba cerrado." };
  }

  await userClient
    .from("service_requests")
    .update({ status: "rechazada_cliente", updated_at: new Date().toISOString() })
    .eq("id", args.request_id);

  await admin.from("blocked_slots").delete().eq("service_request_id", args.request_id);

  return { success: true, request_id: args.request_id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, active_request_id } = await req.json();
    const authHeader = req.headers.get("Authorization");

    const contextMsg = active_request_id && UUID_RE.test(active_request_id)
      ? `\n\nCONTEXTO: Pedido activo recién creado con request_id="${active_request_id}". Si pide cancelar, usá ESE id.`
      : "";

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT + contextMsg },
      ...messages,
    ];

    let lastCreatedRequestId: string | null = null;
    let cancelledThisTurn = false;

    for (let i = 0; i < 5; i++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Demasiadas consultas, esperá un momento." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA agotados. Avisale al admin." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
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
            request_id: cancelledThisTurn ? null : lastCreatedRequestId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      conversation.push(msg);
      for (const call of msg.tool_calls) {
        let result: any;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          if (call.function.name === "list_professionals") {
            result = await listProfessionals(args);
          } else if (call.function.name === "check_slot") {
            result = await checkSlot(args);
          } else if (call.function.name === "book_slot") {
            result = await bookSlot(args, authHeader);
            if (result?.success) lastCreatedRequestId = result.request_id;
          } else if (call.function.name === "cancel_booking") {
            if (!args.request_id && active_request_id) args.request_id = active_request_id;
            result = await cancelBooking(args, authHeader);
            if (result?.success) {
              cancelledThisTurn = true;
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
        request_id: cancelledThisTurn ? null : lastCreatedRequestId,
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