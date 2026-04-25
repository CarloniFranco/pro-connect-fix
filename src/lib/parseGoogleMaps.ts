/**
 * Extrae coordenadas (lat, lng) de un URL de Google Maps.
 * Soporta formatos comunes:
 *  - https://www.google.com/maps/@-32.8895,-68.8458,15z
 *  - https://www.google.com/maps/place/.../@-32.8895,-68.8458,17z
 *  - https://maps.google.com/?q=-32.8895,-68.8458
 *  - https://www.google.com/maps?q=-32.8895,-68.8458
 *  - https://goo.gl/maps/... (no soportado, requiere expandir)
 */
export function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    // Formato @lat,lng
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }
    // Formato ?q=lat,lng o &q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    // Formato !3dlat!4dlng (lugares)
    const placeMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }
    return null;
  } catch {
    return null;
  }
}
