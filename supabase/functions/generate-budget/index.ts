import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceType, description, professionalName, rubro } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Sos un asistente de presupuestos para profesionales de servicios en Argentina. 
Generás presupuestos técnicos claros y profesionales en español argentino.
El profesional se llama "${professionalName || 'Profesional'}" y trabaja en el rubro "${rubro || 'servicios'}".
Respondé SOLO con el presupuesto en formato texto plano, sin markdown. Incluí:
- Detalle de materiales estimados con precios en ARS
- Mano de obra
- Total estimado
- Tiempo estimado de trabajo
- Condiciones (garantía, etc.)
Sé realista con los precios del mercado argentino actual (2026).`
          },
          {
            role: "user",
            content: `Generá un presupuesto para el siguiente servicio:\n\nTipo: ${serviceType}\nDescripción del cliente: ${description}`
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

    return new Response(JSON.stringify({ budget }), {
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
