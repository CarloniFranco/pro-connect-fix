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

// Pin custom con estilo de marca (color primary)
const createPinIcon = (score: number) =>
  L.divIcon({
    className: "fix-map-pin",
    html: `
      <div style="position: relative; transform: translate(-50%, -100%);">
        <div style="
          background: hsl(var(--primary, 213 75% 30%));
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          <span style="
            transform: rotate(45deg);
            font-weight: 800;
            font-size: 13px;
            font-family: system-ui, -apple-system, sans-serif;
          ">${score.toFixed(1)}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
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
      map.setView([pros[0].lat, pros[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pros.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [pros, map]);
  return null;
};

const ProfessionalsMap = ({ pros }: Props) => {
  const navigate = useNavigate();
  // Default center: Mendoza, Argentina
  const defaultCenter: [number, number] = [-32.8895, -68.8458];

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-2xl border-2 border-border shadow-md">
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
          <Marker
            key={p.user_id}
            position={[p.lat, p.lng]}
            icon={createPinIcon(p.score)}
          >
            <Popup>
              <div className="min-w-[220px] p-1">
                <div className="flex items-center gap-3 mb-2">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.full_name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-primary"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border-2 border-primary">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight" style={{ margin: 0 }}>
                      {p.full_name}
                    </p>
                    <p
                      className="flex items-center gap-1 text-xs mt-0.5"
                      style={{ margin: 0 }}
                    >
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold">{p.score.toFixed(1)}</span>
                      <span className="text-muted-foreground">/ 5</span>
                    </p>
                  </div>
                </div>
                {p.neighborhood && (
                  <p
                    className="flex items-center gap-1 text-xs text-muted-foreground mb-2"
                    style={{ margin: "0 0 8px 0" }}
                  >
                    <MapPin className="h-3 w-3" />
                    {p.neighborhood}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/profesional/${p.user_id}`)}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Ver perfil completo
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
