import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const VISITA_TECNICA_RUBROS = ["gas", "electricidad", "plomería", "plomeria", "calefacción", "calefaccion", "refrigeración", "refrigeracion"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceType, description, professionalName, rubro } = await req.json();

    const isVisitaTecnica = rubro
      ? VISITA_TECNICA_RUBROS.includes(rubro.toLowerCase())
      : false;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = isVisitaTecnica
      ? `Sos un asistente para profesionales de servicios técnicos en Argentina.
El profesional se llama "${professionalName || 'Profesional'}" y trabaja en el rubro "${rubro || 'servicios'}".
Este rubro requiere una VISITA TÉCNICA DE DIAGNÓSTICO antes de presupuestar.
Respondé SOLO con el presupuesto de visita en formato texto plano, sin markdown. Incluí:
- Concepto: Relevamiento técnico y determinación de falla
- Costo sugerido de visita técnica (en ARS, acorde al mercado argentino 2026)
- Duración: 1 hora
- Aclaración legal: "Este monto corresponde únicamente a la visita técnica y diagnóstico. El presupuesto de reparación final se entregará tras el relevamiento en el domicilio."
NO incluyas estimación de materiales ni mano de obra final. Solo el costo de la visita.`
      : `Sos un asistente de presupuestos para profesionales de servicios en Argentina. 
Generás presupuestos técnicos claros y profesionales en español argentino.
El profesional se llama "${professionalName || 'Profesional'}" y trabaja en el rubro "${rubro || 'servicios'}".
Respondé SOLO con el presupuesto en formato texto plano, sin markdown. Incluí:
- Detalle de materiales estimados con precios en ARS
- Mano de obra
- Total estimado
- Tiempo estimado de trabajo
- Condiciones (garantía, etc.)
Sé realista con los precios del mercado argentino actual (2026).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: isVisitaTecnica
              ? `Generá un presupuesto de visita técnica para:\n\nTipo: ${serviceType}\nDescripción del cliente: ${description}`
              : `Generá un presupuesto para el siguiente servicio:\n\nTipo: ${serviceType}\nDescripción del cliente: ${description}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá en unos segundos" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const budget = data.choices?.[0]?.message?.content || "No se pudo generar el presupuesto";

    return new Response(JSON.stringify({ budget, isVisitaTecnica }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Budget generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
