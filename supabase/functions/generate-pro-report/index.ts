import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { period } = await req.json(); // 'week' | 'month' | 'year'
    const validPeriods = ["week", "month", "year"];
    if (!validPeriods.includes(period)) {
      return new Response(JSON.stringify({ error: "Período inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let since: Date;
    let periodLabel: string;
    if (period === "week") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = "última semana";
    } else if (period === "month") {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = "este mes";
    } else {
      since = new Date(now.getFullYear(), 0, 1);
      periodLabel = "este año";
    }
    const sinceISO = since.toISOString();

    // Profile
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("full_name, rubro, locality, plan, work_stations")
      .eq("user_id", userId)
      .maybeSingle();

    // All requests in period
    const { data: requests } = await supabase
      .from("service_requests")
      .select("status, service_type, quoted_amount, created_at, completed_at, scheduled_date, scheduled_time, schedule_met, responded_at, deposit_paid, client_name")
      .eq("professional_id", userId)
      .gte("created_at", sinceISO);

    const reqs = requests || [];
    const finalizadas = reqs.filter((r) => r.status === "finalizada");
    const aceptadas = reqs.filter((r) => ["aceptada", "en_servicio"].includes(r.status as string));
    const rechazadas = reqs.filter((r) => r.status === "rechazada_profesional");
    const canceladas = reqs.filter((r) => r.status === "rechazada_cliente");
    const nuevas = reqs.filter((r) => r.status === "nueva");

    const ingresosFinalizados = finalizadas.reduce((s, r) => s + (Number(r.quoted_amount) || 0), 0);
    const ingresosConfirmados = aceptadas.reduce((s, r) => s + (Number(r.quoted_amount) || 0), 0);
    const ingresosTotales = ingresosFinalizados + ingresosConfirmados;

    // Service types breakdown
    const serviceCount: Record<string, number> = {};
    const serviceRevenue: Record<string, number> = {};
    finalizadas.forEach((r) => {
      const t = r.service_type || "Sin especificar";
      serviceCount[t] = (serviceCount[t] || 0) + 1;
      serviceRevenue[t] = (serviceRevenue[t] || 0) + (Number(r.quoted_amount) || 0);
    });
    const topServices = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, revenue: serviceRevenue[name] || 0 }));

    // Recurring clients
    const clientCount: Record<string, number> = {};
    finalizadas.forEach((r) => {
      const n = r.client_name || "Anónimo";
      clientCount[n] = (clientCount[n] || 0) + 1;
    });
    const recurrentes = Object.values(clientCount).filter((c) => c > 1).length;

    // Peak hours
    const hourCount: Record<number, number> = {};
    finalizadas.forEach((r) => {
      if (r.scheduled_time) {
        const h = parseInt((r.scheduled_time as string).split(":")[0]);
        if (!isNaN(h)) hourCount[h] = (hourCount[h] || 0) + 1;
      }
    });
    const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Response time
    const respondedReqs = reqs.filter((r) => r.responded_at);
    const avgResponseMin =
      respondedReqs.length > 0
        ? Math.round(
            respondedReqs.reduce((s, r) => {
              const ms = new Date(r.responded_at as string).getTime() - new Date(r.created_at).getTime();
              return s + ms / 60000;
            }, 0) / respondedReqs.length
          )
        : null;

    // Schedule met
    const scheduleMetReqs = reqs.filter((r) => r.schedule_met !== null);
    const scheduleMetPct =
      scheduleMetReqs.length > 0
        ? Math.round((scheduleMetReqs.filter((r) => r.schedule_met === true).length / scheduleMetReqs.length) * 100)
        : null;

    // Score
    const { data: scoreData } = await supabase.rpc("get_professional_score", { p_professional_id: userId });

    // Reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating, comment, created_at")
      .eq("professional_id", userId)
      .gte("created_at", sinceISO);

    const avgRating =
      reviews && reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const dataSummary = {
      profesional: profile?.full_name,
      rubro: profile?.rubro,
      localidad: profile?.locality,
      plan: profile?.plan,
      periodo: periodLabel,
      desde: sinceISO,
      hasta: now.toISOString(),
      totalSolicitudes: reqs.length,
      nuevas: nuevas.length,
      aceptadasOEnServicio: aceptadas.length,
      finalizadas: finalizadas.length,
      rechazadasPorVos: rechazadas.length,
      canceladasPorCliente: canceladas.length,
      ingresosFinalizados,
      ingresosConfirmados,
      ingresosTotales,
      ticketPromedio: finalizadas.length > 0 ? Math.round(ingresosFinalizados / finalizadas.length) : 0,
      topServicios: topServices,
      clientesRecurrentes: recurrentes,
      horarioPico: peakHour ? `${peakHour}:00 hs` : null,
      tiempoRespuestaPromedioMin: avgResponseMin,
      cumplimientoHorariosPct: scheduleMetPct,
      scoreMeritocracia: scoreData,
      cantidadReseñas: reviews?.length || 0,
      ratingPromedio: avgRating,
      ultimasReseñas: (reviews || []).slice(0, 3).map((r) => ({ rating: r.rating, comment: r.comment })),
    };

    const systemPrompt = `Sos un analista de negocios experto en servicios profesionales en Argentina. Generás reportes claros, accionables y motivadores en español argentino (usá "vos", no "tú"). 

Estructura el reporte así (usá markdown):
1. **📊 Resumen ejecutivo** (2-3 líneas con lo más importante)
2. **💰 Performance económica** (ingresos, ticket promedio, comparación)
3. **⚡ Operación y eficiencia** (tiempo respuesta, cumplimiento, score)
4. **🏆 Servicios estrella** (los que más facturan/piden)
5. **👥 Clientes** (recurrentes, satisfacción)
6. **🎯 Recomendaciones accionables** (3-4 acciones concretas para mejorar el próximo período)

Sé específico con los números. Felicitá los logros y señalá oportunidades sin ser duro. Si hay pocos datos, decilo y sugerí cómo conseguir más trabajo.`;

    const userPrompt = `Generá el reporte de ${periodLabel} con estos datos:\n\n${JSON.stringify(dataSummary, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Probá de nuevo en un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos de IA. Contactá al soporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Error generando el reporte" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const report = aiJson.choices?.[0]?.message?.content || "No se pudo generar el reporte.";

    return new Response(JSON.stringify({ report, data: dataSummary, period: periodLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pro-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
