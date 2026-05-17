import { useEffect, useState } from "react";
import { Loader2, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PROVINCES, getLocalities } from "@/lib/argentinaLocations";

export default function LocationManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [locality, setLocality] = useState("");
  const [localityCustom, setLocalityCustom] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("address, neighborhood, province, locality, google_maps_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d) {
          setAddress(d.address || "");
          setNeighborhood(d.neighborhood || "");
          setProvince(d.province || "");
          const loc = d.locality || "";
          if (loc && d.province && getLocalities(d.province).includes(loc)) {
            setLocality(loc);
            setLocalityCustom("");
          } else if (loc) {
            setLocality("Otra");
            setLocalityCustom(loc);
          }
          setMapsUrl(d.google_maps_url || "");
        }
        setLoading(false);
      });
  }, [user]);

  const saveLocation = async () => {
    if (!user) return;
    if (!province) {
      toast.error("Elegí una provincia");
      return;
    }
    const finalLocality = locality === "Otra" ? localityCustom.trim() : locality;
    if (!finalLocality) {
      toast.error("Elegí una localidad");
      return;
    }
    if (!neighborhood.trim()) {
      toast.error("El barrio / zona es obligatorio");
      return;
    }
    setSaving(true);
    const url = mapsUrl.trim();
    let coordsPatch: { lat?: number | null; lng?: number | null } = { lat: null, lng: null };

    if (address.trim() || url) {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-google-maps", {
          body: {
            url,
            address: address.trim(),
            locality: finalLocality,
            province,
          },
        });
        if (!error && data?.coords) {
          coordsPatch = { lat: data.coords.lat, lng: data.coords.lng };
        } else {
          toast.warning(
            "No pudimos ubicar tu dirección con precisión. Verificá que la calle, altura y localidad sean correctas; mientras tanto aparecerás en el centro de tu localidad.",
          );
        }
      } catch (e) {
        console.error("resolve-google-maps", e);
      }
    }

    const { error } = await supabase
      .from("professional_profiles")
      .update({
        address: address.trim(),
        province,
        locality: finalLocality,
        neighborhood: neighborhood.trim(),
        google_maps_url: url,
        ...coordsPatch,
      } as any)
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Ubicación guardada");
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Ubicación</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Tus clientes verán esta dirección y un mini-mapa antes de reservar.
      </p>
      <div className="space-y-3">
        <div>
          <Label htmlFor="address" className="text-xs">Dirección exacta</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Av. San Martín 1234"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">
              Provincia <span className="text-destructive">*</span>
            </Label>
            <Select
              value={province}
              onValueChange={(v) => {
                setProvince(v);
                setLocality("");
                setLocalityCustom("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí una provincia" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">
              Localidad <span className="text-destructive">*</span>
            </Label>
            <Select
              value={locality}
              onValueChange={setLocality}
              disabled={!province}
            >
              <SelectTrigger>
                <SelectValue placeholder={province ? "Elegí localidad" : "Primero la provincia"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {getLocalities(province).map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locality === "Otra" && (
              <Input
                className="mt-2"
                value={localityCustom}
                onChange={(e) => setLocalityCustom(e.target.value)}
                placeholder="Escribí tu localidad"
                maxLength={60}
              />
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="neighborhood" className="text-xs">
            Barrio / Zona <span className="text-destructive">*</span>
          </Label>
          <Input
            id="neighborhood"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Ej: Dorrego, Cuarta sección"
            required
          />
        </div>
        <div>
          <Label htmlFor="maps" className="text-xs">Link de Google Maps (opcional)</Label>
          <Input
            id="maps"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Si lo dejás vacío, generamos el mapa con la dirección.
          </p>
        </div>
        <Button onClick={saveLocation} disabled={saving} size="sm" className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar ubicación
        </Button>
      </div>
    </section>
  );
}
