import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Coords {
  lat: number;
  lng: number;
}

function extractCoords(url: string): Coords | null {
  if (!url) return null;
  // @lat,lng
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  // ?q=lat,lng
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  // !3dlat!4dlng
  const place = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };
  // /place/.../data=...
  const data = url.match(/3d(-?\d+\.\d+)[!\?&]4d(-?\d+\.\d+)/);
  if (data) return { lat: parseFloat(data[1]), lng: parseFloat(data[2]) };
  return null;
}

async function expandShortUrl(url: string): Promise<string> {
  console.log(`[expand] start url=${url}`);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    console.log(`[expand] final url=${res.url} status=${res.status}`);
    if (extractCoords(res.url)) return res.url;

    // Intentar extraer del body
    const body = await res.text();
    console.log(`[expand] body length=${body.length}`);
    const m =
      body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      body.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
      body.match(/"(-?\d+\.\d+),(-?\d+\.\d+)"/);
    if (m) return `https://maps.google.com/?q=${m[1]},${m[2]}`;
    return res.url;
  } catch (e) {
    console.error("[expand] error", e);
    return url;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL requerida" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Primer intento directo
    let coords = extractCoords(url);

    // Si es un link corto, expandirlo
    if (!coords && (url.includes("goo.gl") || url.includes("maps.app.goo.gl"))) {
      const expanded = await expandShortUrl(url);
      coords = extractCoords(expanded);
    }

    if (!coords) {
      return new Response(
        JSON.stringify({ error: "No se pudieron extraer coordenadas", coords: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ coords }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("resolve-google-maps error:", e);
    return new Response(
      JSON.stringify({ error: String(e), coords: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
