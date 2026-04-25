import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function WorkStationsManager() {
  const { user } = useAuth();
  const [stations, setStations] = useState<number>(1);
  const [initial, setInitial] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("work_stations")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as any)?.work_stations || 1;
        setStations(v);
        setInitial(v);
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const value = Math.max(1, Math.min(20, stations));
    setSaving(true);
    const { error } = await supabase
      .from("professional_profiles")
      .update({ work_stations: value } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
    } else {
      setInitial(value);
      setStations(value);
      toast.success("Estaciones de trabajo actualizadas");
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

  const dirty = stations !== initial;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Users className="h-5 w-5 text-primary" />
          Estaciones de trabajo
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cantidad de clientes que podés atender en paralelo en el mismo horario (boxes, lugares o puestos de trabajo).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
                ? "Atención individual (1 cliente por horario)"
                : `Hasta ${stations} clientes en simultáneo`}
            </span>
          </div>
        </div>

        <Button onClick={save} disabled={saving || !dirty} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}
