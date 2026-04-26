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

FLUJO OBLIGATORIO (en este orden):
1. ZONA: si todavía no sabés la zona/localidad del usuario, PEDILA primero ("¿De qué zona/localidad sos?"). No avances sin zona.
2. CUÁNDO: pedí día y hora ("¿qué día y horario te queda cómodo?"). Interpretá lenguaje natural.
3. DISPONIBILIDAD: llamá 'check_availability' con locality + date (+time). DEVOLVÉ HASTA 5 OPCIONES rankeadas por score.
4. ELECCIÓN: el usuario elige un número (1-5).
5. VEHÍCULO: una vez elegido el lavadero, COPIÁ Y PEGÁ EXACTAMENTE el campo 'vehicle_menu_text' de ESE lavadero. En este paso está PROHIBIDO mostrar servicios o precios. Solo pedí que elija vehículo.
6. SERVICIO: recién cuando el usuario elija vehículo, llamá 'get_services_for_vehicle' con professional_id + vehicle_type. COPIÁ Y PEGÁ EXACTAMENTE 'services_text'. No inventes, no reescribas. Pedí que elija lavado.
7. CONFIRMACIÓN + SEÑA: mostrá un resumen (lavadero, día, hora, auto, lavado, precio total, seña 10%) y pedí confirmación explícita.
8. RESERVA: llamá 'create_request' con todos los datos. Confirma turno + seña pagada (MVP: simulada).
9. CIERRE: avisá "Turno confirmado ✅ Seña $X registrada. Te esperamos el [fecha] a las [hora]."

PROCESAMIENTO DE FECHAS:
- Hoy es: ${new Date().toISOString().split("T")[0]}. Zona horaria Argentina (UTC-3).
- Interpretá "mañana", "el lunes", "pasado mañana", "hoy a la tarde" y CALCULÁ YYYY-MM-DD.
- "Urgente" o "ya" → urgent=true, primer hueco hoy.

BÚSQUEDA POR NOMBRE DE PROFESIONAL:
- Si el usuario pide un profesional específico, pasá 'professional_name' a 'check_availability'. Match parcial sin tildes.
- Si name_filtered=true: mostrá solo ese pro. Si not_found=true: avisá. Si no_slots_for_pro=true: ofrecé alternativas (volvé a llamar sin professional_name).

REGLAS IMPORTANTES (ANTI-ALUCINACIÓN):
- NUNCA inventes precios, lavaderos, horarios, vehículos ni servicios. TODO viene del JSON de las tools.
- Para listar vehículos, SIEMPRE pegás 'vehicle_menu_text' tal cual y NO mostrás servicios todavía.
- Para listar lavados/precios, SIEMPRE llamás primero 'get_services_for_vehicle' y pegás 'services_text' tal cual.
- Si el JSON dice vehicle_types: ["Sedán","SUV","Camioneta","Moto"], hay 4 opciones, ni más ni menos. Si dice services con nombres "lavado completo / lavado interior / lavado Exterior / Pulido", esos son los únicos lavados. Está PROHIBIDO mencionar "lavado de chasis", "lavado de motor", "encerado", o cualquier servicio que no esté en el JSON.
- NUNCA muestres IDs (UUIDs) al usuario.
- Si 'create_request' devuelve { needs_login: true }, pedile que se loguee/registre. NO reintentes.
- Si dice "cancelo" / "no" / "mejor no" después de reservar, usá 'cancel_request'.`;

const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Consulta los lavaderos disponibles para una fecha y hora. Devuelve hasta 5 lavaderos rankeados por score con sus servicios cargados (precios por tipo de vehículo). Filtra por 'locality' (zona del usuario) cuando está presente. Si no hay lavaderos en esa zona, devuelve fallback con los más cercanos del país. Si urgent=true, ignora la hora y usa el primer hueco hoy. Si professional_name está presente, filtra solo a ese pro.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha YYYY-MM-DD" },
          time: { type: "string", description: "Hora HH:MM (24h)" },
          locality: {
            type: "string",
            description: "Zona/localidad del usuario tal como la dijo. Ej: 'Palermo', 'Vicente Lopez', 'Caballito'.",
          },
          urgent: {
            type: "boolean",
            description: "Si true, ignora hora y devuelve primer hueco disponible hoy.",
          },
          professional_name: {
            type: "string",
            description: "Nombre (parcial) del profesional pedido específicamente.",
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
      name: "get_services_for_vehicle",
      description:
        "Devuelve únicamente los servicios y precios que el lavadero elegido tiene cargados para el tipo de vehículo elegido. Usar después de que el usuario elige vehículo y antes de pedir el tipo de lavado.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string", description: "UUID devuelto por check_availability" },
          vehicle_type: { type: "string", description: "Tipo de vehículo elegido por el usuario" },
        },
        required: ["professional_id", "vehicle_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_request",
      description:
        "Crea la reserva del turno con seña simulada (10% del precio total). El turno queda CONFIRMADO con la seña marcada como pagada. Solo llamar después de que el usuario confirme explícitamente lavadero, día, hora, tipo de vehículo y tipo de lavado.",
      parameters: {
        type: "object",
        properties: {
          professional_id: { type: "string", description: "UUID devuelto por check_availability" },
          professional_name: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM" },
          vehicle_type: {
            type: "string",
            description: "Tipo de vehículo elegido (ej: 'Sedán', 'SUV', 'Camioneta'). Debe estar en vehicle_types del lavadero.",
          },
          service_name: {
            type: "string",
            description: "Nombre del lavado elegido (ej: 'Lavado completo'). Debe estar en services del lavadero.",
          },
        },
        required: ["professional_id", "date", "time", "vehicle_type", "service_name"],
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

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkAvailability(args: {
  date: string;
  time?: string;
  locality?: string;
  urgent?: boolean;
  professional_name?: string;
}) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { date, time, locality, urgent, professional_name } = args;

  const targetDate = urgent ? new Date().toISOString().split("T")[0] : date;
  const dow = new Date(targetDate + "T12:00:00").getDay();

  const { data: prosAll } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, work_stations, available, locality, neighborhood, services, vehicle_types")
    .eq("rubro", RUBRO)
    .eq("available", true);

  if (!prosAll || prosAll.length === 0) {
    return { available: [], message: "No hay lavaderos activos por ahora." };
  }

  // Filter by name if user asked for a specific professional
  let pros = prosAll;
  let nameFiltered = false;
  if (professional_name && professional_name.trim()) {
    const needle = normalizeName(professional_name);
    const tokens = needle.split(" ").filter(Boolean);
    const matches = prosAll.filter((p) => {
      const hay = normalizeName(p.full_name);
      return tokens.every((tok) => hay.includes(tok));
    });
    if (matches.length === 0) {
      return {
        available: [],
        name_searched: professional_name,
        not_found: true,
        message: `No encontré ningún profesional llamado "${professional_name}".`,
      };
    }
    pros = matches;
    nameFiltered = true;
  }

  // Filter by locality (zona) if provided AND no name filter active
  let localityFiltered = false;
  let localityFallback = false;
  if (locality && locality.trim() && !nameFiltered) {
    const needle = normalizeName(locality);
    const inZone = pros.filter((p) => {
      const loc = normalizeName(p.locality || "");
      const nbh = normalizeName(p.neighborhood || "");
      return (loc && loc.includes(needle)) || (nbh && nbh.includes(needle)) ||
             (needle.length > 3 && (loc.includes(needle) || nbh.includes(needle)));
    });
    if (inZone.length > 0) {
      pros = inZone;
      localityFiltered = true;
    } else {
      // No hay en la zona pedida → fallback a todos, marcamos para que el bot lo aclare
      localityFallback = true;
    }
  }

  const proIds = pros.map((p) => p.user_id);

  const { data: avail } = await admin
    .from("professional_availability")
    .select("professional_id, start_time, end_time")
    .in("professional_id", proIds)
    .eq("day_of_week", dow)
    .eq("is_active", true);

  // Count any blocked slot (paid OR pending)
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
    if (nameFiltered) {
      return {
        available: [],
        name_searched: professional_name,
        no_slots_for_pro: true,
        message: `${pros[0].full_name} no tiene turnos disponibles el ${targetDate}.`,
      };
    }
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
  const proById = new Map(pros.map((p) => [p.user_id, p]));

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

  // Quedarse con el mejor slot por profesional para no repetir el mismo lavadero
  const seenPro = new Set<string>();
  const uniquePerPro: SlotRow[] = [];
  for (const s of candidates) {
    if (seenPro.has(s.proId)) continue;
    seenPro.add(s.proId);
    uniquePerPro.push(s);
  }

  const top = uniquePerPro.slice(0, 10).map((s) => {
    const pro = proById.get(s.proId);
    const services = Array.isArray(pro?.services) ? (pro!.services as any[]) : [];
    const vehicleTypes: string[] = Array.isArray(pro?.vehicle_types) ? pro!.vehicle_types : [];

    // Build deterministic vehicle text the LLM must paste verbatim.
    const vehiclesLine = vehicleTypes.length
      ? vehicleTypes.map((v, i) => `${i + 1}) ${v}`).join("  ")
      : "(este lavadero no tiene tipos de vehículo cargados)";
    const vehicle_menu_text = `🚗 Tipo de vehículo:\n${vehiclesLine}`;

    return {
      professional_id: s.proId,
      professional_name: s.proName,
      locality: pro?.locality || null,
      neighborhood: pro?.neighborhood || null,
      vehicle_types: vehicleTypes,
      services: services.map((sv: any) => ({
        name: sv.name,
        prices: sv.prices || {},
      })),
      vehicle_menu_text,
      date: targetDate,
      time: s.time,
      score: scoreMap.get(s.proId) ?? 3,
    };
  });
  top.sort((a, b) => (b.score as number) - (a.score as number));

  return {
    available: nameFiltered ? top : top.slice(0, 5),
    name_filtered: nameFiltered,
    name_searched: nameFiltered ? professional_name : null,
    locality_filtered: localityFiltered,
    locality_fallback: localityFallback,
    locality_searched: locality || null,
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
    vehicle_type: string;
    service_name: string;
  },
  authHeader: string | null,
) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { needs_login: true, message: "El usuario debe iniciar sesión para confirmar." };
  }

  if (!args.professional_id || !UUID_RE.test(args.professional_id)) {
    return { error: "ID de profesional inválido. Volvé a consultar disponibilidad." };
  }
  if (!args.date || !args.time) {
    return { error: "Fecha y hora son obligatorias." };
  }
  if (!args.vehicle_type || !args.service_name) {
    return { error: "Faltan tipo de vehículo y/o tipo de lavado." };
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

  // Verify pro exists & is car wash + get services/vehicle_types
  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id, rubro, services, vehicle_types")
    .eq("user_id", args.professional_id)
    .maybeSingle();
  if (!pro || pro.rubro !== RUBRO) {
    return { error: "El profesional no está disponible." };
  }

  // Validate vehicle_type belongs to pro
  const vehicleTypes: string[] = Array.isArray(pro.vehicle_types) ? pro.vehicle_types : [];
  const matchedVehicle = vehicleTypes.find(
    (v) => normalizeName(v) === normalizeName(args.vehicle_type),
  );
  if (!matchedVehicle) {
    return {
      error: `Este lavadero no atiende '${args.vehicle_type}'. Tipos disponibles: ${vehicleTypes.join(", ") || "ninguno"}.`,
    };
  }

  // Validate service exists and get price for that vehicle
  const services: any[] = Array.isArray(pro.services) ? (pro.services as any[]) : [];
  const matchedService = services.find(
    (s) => normalizeName(s.name || "") === normalizeName(args.service_name),
  );
  if (!matchedService) {
    return {
      error: `El lavado '${args.service_name}' no existe en este lavadero. Servicios: ${services.map((s) => s.name).join(", ") || "ninguno"}.`,
    };
  }
  const totalPrice = Number(
    matchedService.prices?.[matchedVehicle] ?? 0,
  );
  if (!totalPrice || totalPrice <= 0) {
    return {
      error: `Este lavadero no tiene precio cargado para ${matchedVehicle} en ${matchedService.name}. Elegí otro lavadero.`,
    };
  }
  const depositAmount = Math.round(totalPrice * 0.1);

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
    console.error("create_request error", error);
    return { error: error?.message || "No se pudo crear la solicitud." };
  }

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
    vehicle_type: matchedVehicle,
    service_name: matchedService.name,
    total_price: totalPrice,
    deposit_amount: depositAmount,
  };
}

async function getServicesForVehicle(args: { professional_id: string; vehicle_type: string }) {
  if (!args.professional_id || !UUID_RE.test(args.professional_id)) {
    return { error: "ID de profesional inválido. Volvé a elegir lavadero." };
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id, full_name, rubro, services, vehicle_types")
    .eq("user_id", args.professional_id)
    .maybeSingle();

  if (!pro || pro.rubro !== RUBRO) {
    return { error: "El profesional no está disponible." };
  }

  const vehicleTypes: string[] = Array.isArray(pro.vehicle_types) ? pro.vehicle_types : [];
  const matchedVehicle = vehicleTypes.find((v) => normalizeName(v) === normalizeName(args.vehicle_type));
  if (!matchedVehicle) {
    return {
      error: `Ese vehículo no está cargado para ${pro.full_name}. Opciones: ${vehicleTypes.join(", ") || "ninguna"}.`,
      vehicle_menu_text: `🚗 Tipo de vehículo:\n${vehicleTypes.map((v, i) => `${i + 1}) ${v}`).join("  ")}`,
    };
  }

  const services: any[] = Array.isArray(pro.services) ? (pro.services as any[]) : [];
  const availableServices = services
    .map((sv: any) => ({ name: sv.name, price: Number(sv.prices?.[matchedVehicle] ?? 0) }))
    .filter((sv) => sv.name && sv.price > 0);

  if (availableServices.length === 0) {
    return {
      professional_id: pro.user_id,
      professional_name: pro.full_name,
      vehicle_type: matchedVehicle,
      services: [],
      services_text: `🧼 Tipo de lavado para ${matchedVehicle}:\n(este lavadero no tiene servicios con precio cargado para ${matchedVehicle})`,
    };
  }

  return {
    professional_id: pro.user_id,
    professional_name: pro.full_name,
    vehicle_type: matchedVehicle,
    services: availableServices,
    services_text: `🧼 Tipo de lavado para ${matchedVehicle}:\n${availableServices
      .map((sv, i) => `${i + 1}) ${sv.name} — $${sv.price.toLocaleString("es-AR")}`)
      .join("\n")}`,
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
          } else if (call.function.name === "get_services_for_vehicle") {
            result = await getServicesForVehicle(args);
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
