import { useState, useEffect, useMemo } from "react";
import { Clock, Plus, Trash2, Loader2, CalendarDays, ChevronLeft, ChevronRight, Power, Car, Lock, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface Slot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BlockedSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  slot_status: string;
  service_request_id: string | null;
}

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};

export default function AvailabilityManager() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [stations, setStations] = useState(1);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // Cargar disponibilidad semanal y estaciones
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", user.id)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("professional_profiles")
        .select("work_stations")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([availRes, profRes]) => {
      const normalized = (availRes.data || []).map((s: any) => ({
        ...s,
        start_time: String(s.start_time).slice(0, 5),
        end_time: String(s.end_time).slice(0, 5),
      }));
      setSlots(normalized);
      setStations((profRes.data as any)?.work_stations || 1);
      setLoading(false);
    });
  }, [user]);

  // Cargar slots bloqueados de la semana visible + realtime
  useEffect(() => {
    if (!user) return;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const from = toISODate(weekStart);
    const to = toISODate(weekEnd);

    const load = () => {
      supabase
        .from("blocked_slots")
        .select("id, slot_date, slot_time, slot_status, service_request_id")
        .eq("professional_id", user.id)
        .gte("slot_date", from)
        .lte("slot_date", to)
        .then(({ data }) => setBlocked((data as any) || []));
    };
    load();

    const channel = supabase
      .channel(`avail-blocked-${user.id}-${from}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_slots", filter: `professional_id=eq.${user.id}` },
        load,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, weekStart]);

  const toDbTime = (t: string) => `${String(t).slice(0, 5)}:00`;

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
    let hadError = false;
    const updated = [...slots];
    for (let i = 0; i < updated.length; i++) {
      const slot = updated[i];
      if (slot.id) {
        const { error } = await supabase
          .from("professional_availability")
          .update({
            start_time: toDbTime(slot.start_time),
            end_time: toDbTime(slot.end_time),
            is_active: slot.is_active,
          })
          .eq("id", slot.id);
        if (error) hadError = true;
      } else {
        const { data, error } = await supabase
          .from("professional_availability")
          .insert({
            professional_id: user.id,
            day_of_week: slot.day_of_week,
            start_time: toDbTime(slot.start_time),
            end_time: toDbTime(slot.end_time),
            is_active: slot.is_active,
          })
          .select()
          .single();
        if (error) hadError = true;
        if (data) updated[i] = { ...slot, id: data.id };
      }
    }
    setSlots(updated);
    setSaving(false);
    toast[hadError ? "error" : "success"](hadError ? "Algunos horarios no se guardaron" : "Horario base guardado");
  };

  // Mapa: "YYYY-MM-DD|HH:MM" -> { manual: BlockedSlot[], reservas: BlockedSlot[] }
  const occupancyMap = useMemo(() => {
    const map = new Map<string, { manual: BlockedSlot[]; reservas: BlockedSlot[] }>();
    blocked.forEach((b) => {
      const k = `${b.slot_date}|${String(b.slot_time).slice(0, 5)}`;
      const cur = map.get(k) || { manual: [], reservas: [] };
      if (b.slot_status === "manual_block") cur.manual.push(b);
      else if (b.slot_status === "paid" || b.slot_status === "pending") cur.reservas.push(b);
      map.set(k, cur);
    });
    return map;
  }, [blocked]);

  // Días de la semana visible
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Generar slots horarios por día según horario base
  const slotsForDay = (date: Date): string[] => {
    const dow = date.getDay();
    const dayAvail = slots.filter((s) => s.day_of_week === dow && s.is_active);
    const out: string[] = [];
    dayAvail.forEach((a) => {
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      let h = sh, m = sm;
      while (h < eh || (h === eh && m < em)) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        m += 60;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return out;
  };

  const isPast = (date: Date, time: string) => {
    const now = new Date();
    const [h, m] = time.split(":").map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);
    return slotDate.getTime() <= now.getTime();
  };

  // Toggle de una estación específica en un slot
  const toggleStation = async (date: Date, time: string, stationIdx: number) => {
    if (!user) return;
    const dateISO = toISODate(date);
    const key = `${dateISO}|${time}`;
    const cur = occupancyMap.get(key) || { manual: [], reservas: [] };
    const reservasCount = cur.reservas.length;
    const manualCount = cur.manual.length;

    // Las primeras `reservasCount` estaciones representan reservas (no se tocan)
    if (stationIdx < reservasCount) {
      toast.info("Esta estación está reservada por un cliente");
      return;
    }

    const busyId = `${key}-${stationIdx}`;
    setBusyKey(busyId);

    // Si dentro del rango "manual" => desbloquear (eliminar uno)
    if (stationIdx < reservasCount + manualCount) {
      const target = cur.manual[stationIdx - reservasCount];
      const { error } = await supabase.from("blocked_slots").delete().eq("id", target.id);
      setBusyKey(null);
      if (error) { toast.error("No se pudo desbloquear"); return; }
      // optimista
      setBlocked((prev) => prev.filter((b) => b.id !== target.id));
    } else {
      // Bloquear: insertar manual_block
      const { data, error } = await supabase
        .from("blocked_slots")
        .insert({
          professional_id: user.id,
          slot_date: dateISO,
          slot_time: `${time}:00`,
          slot_status: "manual_block",
          service_request_id: null,
        } as any)
        .select("id, slot_date, slot_time, slot_status, service_request_id")
        .single();
      setBusyKey(null);
      if (error || !data) { toast.error("No se pudo bloquear"); return; }
      setBlocked((prev) => [...prev, data as any]);
    }
  };

  // Bloqueo rápido: cierra todas las horas restantes de hoy
  const closeToday = async () => {
    if (!user) return;
    const now = new Date();
    const today = toISODate(now);
    const todaySlots = slotsForDay(now).filter((t) => !isPast(now, t));
    if (todaySlots.length === 0) {
      toast.info("No quedan horas disponibles hoy");
      return;
    }

    setSaving(true);
    const inserts: any[] = [];
    for (const time of todaySlots) {
      const key = `${today}|${time}`;
      const cur = occupancyMap.get(key) || { manual: [], reservas: [] };
      const taken = cur.manual.length + cur.reservas.length;
      const free = stations - taken;
      for (let i = 0; i < free; i++) {
        inserts.push({
          professional_id: user.id,
          slot_date: today,
          slot_time: `${time}:00`,
          slot_status: "manual_block",
          service_request_id: null,
        });
      }
    }
    if (inserts.length === 0) { setSaving(false); toast.info("La agenda de hoy ya está completa"); return; }

    const { data, error } = await supabase.from("blocked_slots").insert(inserts).select("id, slot_date, slot_time, slot_status, service_request_id");
    setSaving(false);
    if (error) { toast.error("No se pudo cerrar la agenda"); return; }
    if (data) setBlocked((prev) => [...prev, ...(data as any)]);
    toast.success(`Agenda de hoy cerrada (${inserts.length} estaciones bloqueadas)`);
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

  const grouped = DAYS_LONG.map((name, i) => ({
    name,
    dayOfWeek: i,
    slots: slots.map((s, idx) => ({ ...s, _idx: idx })).filter((s) => s.day_of_week === i),
  }));

  const weekLabel = `${weekDays[0].getDate()}/${weekDays[0].getMonth() + 1} - ${weekDays[6].getDate()}/${weekDays[6].getMonth() + 1}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <CalendarDays className="h-5 w-5 text-primary" />
          Calendario de Disponibilidad
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tocá una estación para bloquearla manualmente (venta directa fuera de la app). Tu capacidad: <span className="font-semibold text-foreground">{stations} {stations === 1 ? "estación" : "estaciones"}</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botón de cierre rápido + navegación semana */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={closeToday} disabled={saving} variant="destructive" size="sm" className="gap-1.5">
            <Power className="h-3.5 w-3.5" />
            Cerrar agenda de hoy
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-semibold text-foreground">{weekLabel}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Hoy
            </Button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/40 p-2 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-border bg-background" /> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-accent" /> Bloqueado (vos)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-primary" /> Reservado por cliente
          </span>
        </div>

        {/* Calendario semanal — horas en columna, estaciones en fila */}
        <div className="space-y-1.5">
          {weekDays.map((date) => {
            const dateISO = toISODate(date);
            const daySlotTimes = slotsForDay(date);
            const isHoy = toISODate(new Date()) === dateISO;
            return (
              <div
                key={dateISO}
                className={cn(
                  "rounded-md border",
                  isHoy ? "border-primary/40 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
                  <span className="text-[11px] font-semibold text-foreground">
                    {DAYS_SHORT[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}
                    {isHoy && <span className="ml-1 text-[10px] text-primary">· hoy</span>}
                  </span>
                  {daySlotTimes.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">Sin horario</span>
                  )}
                </div>

                {daySlotTimes.length > 0 && (
                  <div className="divide-y divide-border/40">
                    {daySlotTimes.map((time) => {
                      const key = `${dateISO}|${time}`;
                      const cur = occupancyMap.get(key) || { manual: [], reservas: [] };
                      const reservasCount = cur.reservas.length;
                      const manualCount = cur.manual.length;
                      const free = Math.max(0, stations - reservasCount - manualCount);
                      const past = isPast(date, time);
                      return (
                        <div
                          key={time}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1",
                            past ? "opacity-40" : "hover:bg-muted/30",
                          )}
                        >
                          <span className="w-10 shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                            {time}
                          </span>
                          <div className="flex flex-1 items-center gap-1">
                            {Array.from({ length: stations }).map((_, sIdx) => {
                              const isReserva = sIdx < reservasCount;
                              const isManual = !isReserva && sIdx < reservasCount + manualCount;
                              const isFree = !isReserva && !isManual;
                              const busy = busyKey === `${key}-${sIdx}`;
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  disabled={past || busy || isReserva}
                                  onClick={() => toggleStation(date, time, sIdx)}
                                  title={
                                    isReserva
                                      ? "Reservado por cliente"
                                      : isManual
                                        ? "Bloqueado por vos · tocá para liberar"
                                        : "Libre · tocá para bloquear"
                                  }
                                  className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-all",
                                    isReserva &&
                                      "border-primary bg-primary text-primary-foreground cursor-not-allowed",
                                    isManual &&
                                      "border-accent bg-accent text-accent-foreground hover:bg-accent/90",
                                    isFree &&
                                      "border-border bg-background text-muted-foreground hover:border-accent hover:bg-accent/10",
                                    past && "cursor-not-allowed",
                                  )}
                                >
                                  {busy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isManual ? (
                                    <Lock className="h-3 w-3" />
                                  ) : (
                                    <Car className="h-3 w-3" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              free === 0
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {free}/{stations}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Configuración del horario base (colapsable) */}
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Horario semanal base
            </span>
            <span className="text-xs text-muted-foreground">{showSchedule ? "Ocultar" : "Configurar"}</span>
          </button>
          {showSchedule && (
            <div className="space-y-3 border-t border-border p-3">
              <p className="text-xs text-muted-foreground">
                Definí los rangos horarios en los que atendés cada día. Estos slots aparecerán en el calendario de arriba para que puedas bloquearlos individualmente.
              </p>
              {grouped.map((day) => (
                <div key={day.dayOfWeek} className="rounded-md border border-border p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{day.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSlot(day.dayOfWeek)}
                      className="h-6 gap-1 text-[11px] text-primary"
                    >
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                  {day.slots.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Sin horarios</p>
                  ) : (
                    <div className="space-y-1.5">
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
              <Button onClick={saveAll} disabled={saving} className="w-full gap-2" size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                Guardar horario base
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
