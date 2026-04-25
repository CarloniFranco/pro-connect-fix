import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench, Loader2, MapPin, Car, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface ServiceItem {
  name: string;
  prices: Record<string, number>; // vehicleType -> price
}

const DEFAULT_VEHICLES = ["Sedán", "SUV", "Camioneta"];

export default function MyServicesManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Location
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [locality, setLocality] = useState("");
  const [localityCustom, setLocalityCustom] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  // Vehicle types accepted
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(DEFAULT_VEHICLES);
  const [newVehicle, setNewVehicle] = useState("");

  // Services with prices
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newService, setNewService] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("address, neighborhood, google_maps_url, vehicle_types, services")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d) {
          setAddress(d.address || "");
          setNeighborhood(d.neighborhood || "");
          setMapsUrl(d.google_maps_url || "");
          setVehicleTypes(d.vehicle_types?.length ? d.vehicle_types : DEFAULT_VEHICLES);
          setServices(Array.isArray(d.services) ? (d.services as ServiceItem[]) : []);
        }
        setLoading(false);
      });
  }, [user]);

  const persist = async (patch: Record<string, any>) => {
    if (!user) return false;
    setSaving(true);
    const { error } = await supabase
      .from("professional_profiles")
      .update(patch as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
      return false;
    }
    return true;
  };

  const saveLocation = async () => {
    if (!neighborhood.trim()) {
      toast.error("El barrio / zona es obligatorio");
      return;
    }
    const url = mapsUrl.trim();
    let coordsPatch: { lat?: number | null; lng?: number | null } = { lat: null, lng: null };

    if (url) {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-google-maps", {
          body: { url },
        });
        if (!error && data?.coords) {
          coordsPatch = { lat: data.coords.lat, lng: data.coords.lng };
        } else {
          toast.warning(
            "No pudimos extraer las coordenadas del link. Tu perfil se guarda igual, pero no aparecerás en el mapa hasta que pegues un link válido de Google Maps.",
          );
        }
      } catch (e) {
        console.error("resolve-google-maps", e);
      }
    }

    const ok = await persist({
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      google_maps_url: url,
      ...coordsPatch,
    });
    if (ok) toast.success("Ubicación guardada");
  };

  const addVehicle = async () => {
    const v = newVehicle.trim();
    if (!v) return;
    if (vehicleTypes.some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.error("Ese tipo ya existe");
      return;
    }
    const next = [...vehicleTypes, v];
    setVehicleTypes(next);
    setNewVehicle("");
    await persist({ vehicle_types: next });
  };

  const removeVehicle = async (v: string) => {
    const next = vehicleTypes.filter((x) => x !== v);
    setVehicleTypes(next);
    // also strip price for that vehicle from each service
    const cleanedServices = services.map((s) => {
      const { [v]: _, ...rest } = s.prices;
      return { ...s, prices: rest };
    });
    setServices(cleanedServices);
    await persist({ vehicle_types: next, services: cleanedServices });
  };

  const addService = async () => {
    const n = newService.trim();
    if (!n) return;
    if (services.some((s) => s.name.toLowerCase() === n.toLowerCase())) {
      toast.error("Ese servicio ya existe");
      return;
    }
    const next: ServiceItem[] = [...services, { name: n, prices: {} }];
    setServices(next);
    setNewService("");
    await persist({ services: next });
  };

  const removeService = async (idx: number) => {
    const next = services.filter((_, i) => i !== idx);
    setServices(next);
    await persist({ services: next });
  };

  const updatePrice = (idx: number, vehicle: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    if (Number.isNaN(num)) return;
    const next = [...services];
    next[idx] = {
      ...next[idx],
      prices: { ...next[idx].prices, [vehicle]: num },
    };
    setServices(next);
  };

  const savePrices = async () => {
    const ok = await persist({ services });
    if (ok) toast.success("Precios guardados");
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
    <div className="space-y-4">
      {/* LOCATION */}
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
          <div>
            <Label htmlFor="neighborhood" className="text-xs">
              Barrio / Zona <span className="text-destructive">*</span>
            </Label>
            <Input
              id="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Guaymallén, Mendoza"
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

      {/* VEHICLE TYPES */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Tipos de vehículo que aceptás</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {vehicleTypes.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 py-1 px-2">
              {v}
              <button
                onClick={() => removeVehicle(v)}
                disabled={saving}
                className="ml-1 hover:text-destructive"
                aria-label={`Quitar ${v}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {vehicleTypes.length === 0 && (
            <p className="text-xs text-muted-foreground">Agregá al menos un tipo de vehículo.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newVehicle}
            onChange={(e) => setNewVehicle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVehicle())}
            placeholder="Ej: Moto, Pickup, Furgón"
            maxLength={30}
          />
          <Button onClick={addVehicle} disabled={saving || !newVehicle.trim()} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
      </section>

      {/* SERVICES + PRICE MATRIX */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">Mis Servicios y Precios</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Cargá un precio por cada combinación de servicio + tipo de vehículo. Los clientes verán el monto exacto al reservar.
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
            placeholder="Ej: Lavado Completo"
            maxLength={60}
          />
          <Button onClick={addService} disabled={saving || !newService.trim()} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Agregar servicio
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            Todavía no agregaste servicios.
          </p>
        ) : vehicleTypes.length === 0 ? (
          <p className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            Agregá tipos de vehículo arriba para poder cargar precios.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Servicio</th>
                    {vehicleTypes.map((v) => (
                      <th key={v} className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                        {v} ($)
                      </th>
                    ))}
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={`${s.name}-${i}`} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      {vehicleTypes.map((v) => (
                        <td key={v} className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={s.prices[v] ?? ""}
                            onChange={(e) => updatePrice(i, v, e.target.value)}
                            placeholder="0"
                            className="h-8 w-24"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeService(i)}
                          disabled={saving}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Eliminar servicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={savePrices} disabled={saving} size="sm" className="gap-1 mt-3">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar precios
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
