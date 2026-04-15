import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Slot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function AvailabilityManager() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_availability")
      .select("*")
      .eq("professional_id", user.id)
      .order("day_of_week")
      .order("start_time")
      .then(({ data }) => {
        setSlots(data || []);
        setLoading(false);
      });
  }, [user]);

  const addSlot = (dayOfWeek: number) => {
    setSlots((prev) => [
      ...prev,
      { day_of_week: dayOfWeek, start_time: "09:00", end_time: "18:00", is_active: true },
    ]);
  };

  const removeSlot = (index: number) => {
    const slot = slots[index];
    if (slot.id) {
      supabase.from("professional_availability").delete().eq("id", slot.id).then(({ error }) => {
        if (error) { toast.error("Error al eliminar"); return; }
        setSlots((prev) => prev.filter((_, i) => i !== index));
        toast.success("Horario eliminado");
      });
    } else {
      setSlots((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateSlot = (index: number, field: keyof Slot, value: any) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const saveAll = async () => {
    if (!user) return;
    setSaving(true);

    for (const slot of slots) {
      if (slot.id) {
        await supabase
          .from("professional_availability")
          .update({
            start_time: slot.start_time + ":00",
            end_time: slot.end_time + ":00",
            is_active: slot.is_active,
          })
          .eq("id", slot.id);
      } else {
        const { data, error } = await supabase
          .from("professional_availability")
          .insert({
            professional_id: user.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time + ":00",
            end_time: slot.end_time + ":00",
            is_active: slot.is_active,
          })
          .select()
          .single();
        if (data) slot.id = data.id;
        if (error) console.error(error);
      }
    }

    setSaving(false);
    toast.success("Disponibilidad guardada");
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

  // Group by day
  const grouped = DAYS.map((name, i) => ({
    name,
    dayOfWeek: i,
    slots: slots.map((s, idx) => ({ ...s, _idx: idx })).filter((s) => s.day_of_week === i),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <CalendarDays className="h-5 w-5 text-primary" />
          Disponibilidad Semanal
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configurá tus horarios de atención. Los clientes verán estos horarios al solicitar un turno.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.map((day) => (
          <div key={day.dayOfWeek} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{day.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addSlot(day.dayOfWeek)}
                className="h-7 gap-1 text-xs text-primary"
              >
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </div>
            {day.slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin horarios</p>
            ) : (
              <div className="space-y-2">
                {day.slots.map((slot) => (
                  <div key={slot._idx} className="flex items-center gap-2">
                    <Switch
                      checked={slot.is_active}
                      onCheckedChange={(v) => updateSlot(slot._idx, "is_active", v)}
                    />
                    <input
                      type="time"
                      value={slot.start_time.slice(0, 5)}
                      onChange={(e) => updateSlot(slot._idx, "start_time", e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">a</span>
                    <input
                      type="time"
                      value={slot.end_time.slice(0, 5)}
                      onChange={(e) => updateSlot(slot._idx, "end_time", e.target.value)}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    />
                    <button onClick={() => removeSlot(slot._idx)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <Button onClick={saveAll} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          Guardar Disponibilidad
        </Button>
      </CardContent>
    </Card>
  );
}
