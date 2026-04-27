import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Minus, Plus, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface WorkStationsManagerProps {
  onSaved?: () => void;
}

export default function WorkStationsManager({ onSaved }: WorkStationsManagerProps = {}) {
  const { user } = useAuth();
  const [stations, setStations] = useState<number>(1);
  const [initialStations, setInitialStations] = useState<number>(1);
  const [parking, setParking] = useState<number>(0);
  const [initialParking, setInitialParking] = useState<number>(0);
  const [rubro, setRubro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("work_stations, parking_spots, rubro")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        const ws = d?.work_stations || 1;
        const ps = d?.parking_spots ?? 0;
        setStations(ws);
        setInitialStations(ws);
        setParking(ps);
        setInitialParking(ps);
        setRubro((d?.rubro || "").toLowerCase());
        setLoading(false);
      });
  }, [user]);

  const isLavadero = rubro.includes("lavadero") || rubro.includes("lavader");

  const save = async () => {
    if (!user) return;
    const ws = Math.max(1, Math.min(20, stations));
    const ps = Math.max(0, Math.min(50, parking));
    setSaving(true);
    const payload: any = { work_stations: ws };
    if (isLavadero) payload.parking_spots = ps;
    const { error } = await supabase
      .from("professional_profiles")
      .update(payload)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
    } else {
      setInitialStations(ws);
      setStations(ws);
      setInitialParking(ps);
      setParking(ps);
      toast.success("Configuración actualizada");
      onSaved?.();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const dirty = stations !== initialStations || (isLavadero && parking !== initialParking);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Users className="h-5 w-5 text-primary" />
          {isLavadero ? "Estaciones y estacionamiento" : "Estaciones de trabajo"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cantidad de clientes que podés atender en paralelo en el mismo horario (boxes, lugares o puestos de trabajo).
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="stations">Cantidad de estaciones</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setStations((s) => Math.max(1, s - 1))}
              disabled={stations <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="stations"
              type="number"
              min={1}
              max={20}
              value={stations}
              onChange={(e) => setStations(Number(e.target.value) || 1)}
              className="w-20 text-center text-lg font-bold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setStations((s) => Math.min(20, s + 1))}
              disabled={stations >= 20}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              {stations === 1
                ? "Atención individual"
                : `Hasta ${stations} en simultáneo`}
            </span>
          </div>
        </div>

        {isLavadero && (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="parking" className="flex items-center gap-1.5">
              <Car className="h-4 w-4 text-secondary" />
              Lugares de estacionamiento
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Cantidad de autos que pueden quedar estacionados esperando o esperando ser retirados (modalidad "dejá y retirá"). Es independiente de las estaciones de lavado.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParking((s) => Math.max(0, s - 1))}
                disabled={parking <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="parking"
                type="number"
                min={0}
                max={50}
                value={parking}
                onChange={(e) => setParking(Number(e.target.value) || 0)}
                className="w-20 text-center text-lg font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParking((s) => Math.min(50, s + 1))}
                disabled={parking >= 50}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {parking === 0
                  ? "Sin estacionamiento"
                  : `${parking} ${parking === 1 ? "lugar" : "lugares"}`}
              </span>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving || !dirty} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}
