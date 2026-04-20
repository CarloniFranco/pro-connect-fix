import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serviceType, description, professionalName, rubro } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sos un asistente para profesionales de servicios en Argentina.
El profesional se llama "${professionalName || 'Profesional'}" y trabaja en el rubro "${rubro || 'servicios'}".

TU ÚNICA TAREA: Redactar una descripción profesional, clara y breve (máximo 3 oraciones) del trabajo solicitado por el cliente, en español argentino.

REGLAS ESTRICTAS:
- NO inventes ni estimes precios, montos ni costos.
- NO inventes ni estimes tiempos de trabajo o duraciones.
- NO menciones materiales específicos con marcas o cantidades exactas.
- NO uses markdown ni listas, solo texto plano corrido.
- Enfocate en describir QUÉ trabajo se va a realizar de forma profesional.
- Tono: claro, técnico y cordial. Tratá al cliente de "usted".

Ejemplo de salida válida: "Se realizará el lavado completo exterior e interior del vehículo, incluyendo aspirado, limpieza de tableros y abrillantado de neumáticos. El trabajo se ejecutará en nuestro local con productos profesionales."`;

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
            content: `Redactá la descripción profesional del trabajo para:\n\nTipo de servicio: ${serviceType}\nLo que pidió el cliente: ${description || "(sin comentarios adicionales)"}`,
          },
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
    const description_ai = data.choices?.[0]?.message?.content?.trim() || "No se pudo generar la descripción";

    return new Response(JSON.stringify({ description: description_ai }), {
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
