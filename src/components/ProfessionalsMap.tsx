import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { Star, MapPin } from "lucide-react";

// Fix default marker icons (Leaflet + bundlers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface MapPro {
  user_id: string;
  full_name: string;
  neighborhood: string;
  photo_url: string | null;
  score: number;
  lat: number;
  lng: number;
}

interface Props {
  pros: MapPro[];
}

const FitBounds = ({ pros }: { pros: MapPro[] }) => {
  const map = useMap();
  useEffect(() => {
    if (pros.length === 0) return;
    if (pros.length === 1) {
      map.setView([pros[0].lat, pros[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(pros.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pros, map]);
  return null;
};

const ProfessionalsMap = ({ pros }: Props) => {
  const navigate = useNavigate();
  // Default center: Mendoza, Argentina
  const defaultCenter: [number, number] = [-32.8895, -68.8458];

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-2xl border-2 border-border">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pros={pros} />
        {pros.map((p) => (
          <Marker key={p.user_id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-sm mb-1">{p.full_name}</p>
                {p.neighborhood && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3" />
                    {p.neighborhood}
                  </p>
                )}
                <p className="flex items-center gap-1 text-xs mb-2">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold">{p.score}</span>
                </p>
                <button
                  onClick={() => navigate(`/profesional/${p.user_id}`)}
                  className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  Ver perfil
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ProfessionalsMap;
