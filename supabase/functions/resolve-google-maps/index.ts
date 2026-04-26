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
  let current = url;

  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(current, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "curl/8.0.0", "Accept": "*/*" },
      });
      console.log(`[expand] iter=${i} status=${res.status} url=${current}`);

      let location: string | null = null;
      for (const [k, v] of res.headers) {
        if (k.toLowerCase() === "location") {
          location = v;
          break;
        }
      }

      if (!location) {
        const r2 = await fetch(current, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": "curl/8.0.0" },
        });
        const body = await r2.text();
        const m =
          body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
          body.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
          body.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
        if (m) return `https://maps.google.com/?q=${m[1]},${m[2]}`;
        return current;
      }

      current = location.startsWith("http")
        ? location
        : new URL(location, current).toString();
      if (extractCoords(current)) return current;
    } catch (e) {
      console.error(`[expand] iter=${i} error`, e);
      return current;
    }
  }
  return current;
}

/**
 * Geocodifica una dirección textual usando Nominatim (OpenStreetMap).
 * Mucho más confiable que extraer coords de un link corto de Google Maps,
 * que muchas veces apunta al lugar genérico de un comercio mal etiquetado.
 */
async function geocodeAddress(
  address: string,
  locality: string,
  province: string,
): Promise<Coords | null> {
  if (!address) return null;

  // Intento 1: dirección completa estructurada
  const tryQuery = async (params: Record<string, string>): Promise<Coords | null> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ar");

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "fix-marketplace/1.0 (geocoding)" },
      });
      if (!res.ok) return null;
      const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (arr.length === 0) return null;
      return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
    } catch (e) {
      console.error("[geocode] error", e);
      return null;
    }
  };

  // Estructurado: street + city + state
  let coords = await tryQuery({
    street: address,
    city: locality || "",
    state: province || "",
  });
  if (coords) {
    console.log(`[geocode] structured hit: ${coords.lat},${coords.lng}`);
    return coords;
  }

  // Free-text: "address, locality, province, Argentina"
  const q = [address, locality, province, "Argentina"].filter(Boolean).join(", ");
  coords = await tryQuery({ q });
  if (coords) {
    console.log(`[geocode] freetext hit: ${coords.lat},${coords.lng}`);
    return coords;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const url: string = typeof body?.url === "string" ? body.url : "";
    const address: string = typeof body?.address === "string" ? body.address : "";
    const locality: string = typeof body?.locality === "string" ? body.locality : "";
    const province: string = typeof body?.province === "string" ? body.province : "";

    if (!url && !address) {
      return new Response(
        JSON.stringify({ error: "URL o dirección requerida", coords: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    let coords: Coords | null = null;
    let source = "none";

    // 1) PRIORIDAD: geocoding por dirección textual (más preciso a nivel calle)
    if (address) {
      coords = await geocodeAddress(address, locality, province);
      if (coords) source = "geocoded_address";
    }

    // 2) Fallback: extraer del link de Google Maps
    if (!coords && url) {
      coords = extractCoords(url);
      if (coords) source = "url_direct";
      if (!coords && (url.includes("goo.gl") || url.includes("maps.app.goo.gl"))) {
        const expanded = await expandShortUrl(url);
        coords = extractCoords(expanded);
        if (coords) source = "url_expanded";
      }
    }

    if (!coords) {
      return new Response(
        JSON.stringify({ error: "No se pudieron resolver coordenadas", coords: null, source }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    console.log(`[resolve] OK source=${source} coords=${coords.lat},${coords.lng}`);
    return new Response(
      JSON.stringify({ coords, source }),
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
