import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

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

const createPhotoIcon = (pro: MapPro) => {
  const initial = (pro.full_name || "?").charAt(0).toUpperCase();
  const inner = pro.photo_url
    ? `<img src="${pro.photo_url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:hsl(213,75%,30%);color:#fff;font-weight:800;font-size:18px;\\'>${initial}</div>';" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:hsl(213,75%,30%);color:#fff;font-weight:800;font-size:18px;">${initial}</div>`;

  return L.divIcon({
    className: "fix-photo-pin",
    html: `
      <div style="position:relative;width:48px;height:48px;transform:translate(-50%,-100%);">
        <div style="
          width:48px;height:48px;border-radius:50%;
          overflow:hidden;border:3px solid #fff;
          box-shadow:0 3px 10px rgba(0,0,0,0.35);
          background:hsl(213,75%,30%);
        ">${inner}</div>
        <div style="
          position:absolute;bottom:-4px;right:-4px;
          background:hsl(45,95%,55%);color:#1a1a1a;
          font-weight:800;font-size:11px;
          padding:2px 5px;border-radius:8px;
          border:2px solid #fff;
          font-family:system-ui,-apple-system,sans-serif;
          line-height:1;
        ">★ ${pro.score.toFixed(1)}</div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

const renderStarsHtml = (score: number) => {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  let html = "";
  for (let i = 0; i < 5; i++) {
    const filled = i < full ? "#f5b400" : i === full && half ? "#f5b400aa" : "#d1d5db";
    html += `<span style="color:${filled};font-size:14px;line-height:1;">★</span>`;
  }
  return html;
};

const ProfessionalsMap = ({ pros }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-32.8895, -68.8458], // Mendoza
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Update markers when pros change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (pros.length === 0) return;

    pros.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: createPhotoIcon(p) });
      const popupHtml = `
        <div style="min-width:220px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            ${
              p.photo_url
                ? `<img src="${p.photo_url}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid hsl(213,75%,30%);" />`
                : `<div style="width:44px;height:44px;border-radius:50%;background:hsl(213,75%,30%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;border:2px solid hsl(213,75%,30%);">${(p.full_name || "?").charAt(0).toUpperCase()}</div>`
            }
            <div style="flex:1;min-width:0;">
              <p style="margin:0;font-weight:800;font-size:14px;line-height:1.2;color:#111;">${p.full_name}</p>
              <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
                ${renderStarsHtml(p.score)}
                <span style="font-size:12px;font-weight:600;color:#374151;margin-left:4px;">${p.score.toFixed(1)}</span>
              </div>
            </div>
          </div>
          ${
            p.neighborhood
              ? `<p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:4px;">📍 ${p.neighborhood}</p>`
              : ""
          }
          <button
            data-pro-id="${p.user_id}"
            class="fix-map-select-btn"
            style="width:100%;padding:8px 12px;border:none;border-radius:8px;background:hsl(213,75%,30%);color:#fff;font-weight:700;font-size:12px;cursor:pointer;"
          >
            Seleccionar servicio
          </button>
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.on("popupopen", (e) => {
        const node = (e.popup.getElement() as HTMLElement | null)?.querySelector(
          `button[data-pro-id="${p.user_id}"]`,
        );
        if (node) {
          (node as HTMLButtonElement).onclick = () => navigate(`/profesional/${p.user_id}`);
        }
      });
      marker.addTo(layer);
    });

    if (pros.length === 1) {
      map.setView([pros[0].lat, pros[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(pros.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [pros, navigate]);

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-2xl border-2 border-border shadow-md">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
};

export default ProfessionalsMap;
