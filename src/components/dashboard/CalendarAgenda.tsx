import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  MapPin,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type ViewMode = "dia" | "semana" | "mes";

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  client_name: string;
  service_type: string;
  client_address: string | null;
  status: string;
  estimated_duration: number | null;
  kind: "confirmed" | "pending";
}

const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

const CalendarAgenda = () => {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("dia");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch range based on current view
  const range = useMemo(() => {
    if (view === "dia") {
      return { start: cursor, end: cursor };
    }
    if (view === "semana") {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    };
  }, [view, cursor]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      const startISO = toISODate(range.start);
      const endISO = toISODate(range.end);

      // Confirmed appointments
      const { data: appts } = await supabase
        .from("service_requests")
        .select(
          "id, scheduled_date, scheduled_time, client_name, service_type, client_address, status, estimated_duration"
        )
        .eq("professional_id", user.id)
        .gte("scheduled_date", startISO)
        .lte("scheduled_date", endISO)
        .in("status", ["aceptada", "en_servicio"])
        .not("scheduled_date", "is", null);

      // Pending blocked slots
      const { data: blocks } = await supabase
        .from("blocked_slots")
        .select("id, slot_date, slot_time, slot_status, service_request_id")
        .eq("professional_id", user.id)
        .eq("slot_status", "pending")
        .gte("slot_date", startISO)
        .lte("slot_date", endISO);

      let pending: Appointment[] = [];
      if (blocks && blocks.length > 0) {
        const srIds = [
          ...new Set(
            (blocks as any[]).filter((b) => b.service_request_id).map((b) => b.service_request_id)
          ),
        ];
        let srMap: Record<string, { client_name: string; service_type: string }> = {};
        if (srIds.length > 0) {
          const { data: srs } = await supabase
            .from("service_requests")
            .select("id, client_name, service_type")
            .in("id", srIds);
          if (srs) (srs as any[]).forEach((sr) => (srMap[sr.id] = sr));
        }

        // Group by service_request_id + slot_date, take min slot_time
        const grouped = new Map<string, any>();
        (blocks as any[]).forEach((b) => {
          const key = `${b.service_request_id || b.id}-${b.slot_date}`;
          const existing = grouped.get(key);
          if (!existing || b.slot_time < existing.slot_time) {
            grouped.set(key, b);
          }
        });

        pending = Array.from(grouped.values()).map((b: any) => {
          const sr = b.service_request_id ? srMap[b.service_request_id] : undefined;
          return {
            id: b.id,
            scheduled_date: b.slot_date,
            scheduled_time: b.slot_time,
            client_name: sr?.client_name || "Cliente",
            service_type: sr?.service_type || "Pendiente de cotizar",
            client_address: null,
            status: "pendiente",
            estimated_duration: null,
            kind: "pending" as const,
          };
        });
      }

      const confirmed: Appointment[] = ((appts as any[]) || []).map((a) => ({
        ...a,
        kind: "confirmed" as const,
      }));

      if (!cancelled) {
        const all = [...confirmed, ...pending].sort((a, b) => {
          if (a.scheduled_date !== b.scheduled_date)
            return a.scheduled_date.localeCompare(b.scheduled_date);
          return (a.scheduled_time || "").localeCompare(b.scheduled_time || "");
        });
        setAppointments(all);
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel("calendar-agenda")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_slots", filter: `professional_id=eq.${user.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, range.start.getTime(), range.end.getTime()]);

  const goPrev = () => {
    if (view === "dia") setCursor((d) => addDays(d, -1));
    else if (view === "semana") setCursor((d) => subWeeks(d, 1));
    else setCursor((d) => subMonths(d, 1));
  };
  const goNext = () => {
    if (view === "dia") setCursor((d) => addDays(d, 1));
    else if (view === "semana") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addMonths(d, 1));
  };
  const goToday = () => setCursor(new Date());

  const headerLabel = useMemo(() => {
    if (view === "dia") {
      return format(cursor, "EEEE d 'de' MMMM yyyy", { locale: es });
    }
    if (view === "semana") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      const sameMonth = isSameMonth(s, e);
      return sameMonth
        ? `${format(s, "d", { locale: es })} – ${format(e, "d 'de' MMMM yyyy", { locale: es })}`
        : `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM yyyy", { locale: es })}`;
    }
    return format(cursor, "MMMM yyyy", { locale: es });
  }, [view, cursor]);

  const apptsByDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const arr = m.get(a.scheduled_date) || [];
      arr.push(a);
      m.set(a.scheduled_date, arr);
    });
    return m;
  }, [appointments]);

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Mi Agenda
          </CardTitle>

          {/* View switcher */}
          <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
            {(["dia", "semana", "mes"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm font-semibold capitalize text-foreground truncate">{headerLabel}</p>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : view === "dia" ? (
          <DayView date={cursor} appointments={apptsByDate.get(toISODate(cursor)) || []} />
        ) : view === "semana" ? (
          <WeekView start={range.start} apptsByDate={apptsByDate} onPickDay={(d) => { setCursor(d); setView("dia"); }} />
        ) : (
          <MonthView
            cursor={cursor}
            start={range.start}
            end={range.end}
            apptsByDate={apptsByDate}
            onPickDay={(d) => { setCursor(d); setView("dia"); }}
          />
        )}
      </CardContent>
    </Card>
  );
};

/* ---------- Day view ---------- */
const DayView = ({ date, appointments }: { date: Date; appointments: Appointment[] }) => {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {isToday(date) ? "No tenés turnos para hoy" : "No hay turnos para este día"}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {appointments.map((a) => (
        <AppointmentRow key={`${a.kind}-${a.id}`} a={a} />
      ))}
    </div>
  );
};

const AppointmentRow = ({ a }: { a: Appointment }) => {
  const isPending = a.kind === "pending";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        isPending ? "border-dashed border-accent/60 bg-accent/5" : "border-border bg-muted/30"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md font-display text-sm font-bold",
          isPending ? "bg-accent/20 text-accent-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {a.scheduled_time?.slice(0, 5) || "--:--"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{a.client_name}</p>
        <p className="text-xs text-muted-foreground">
          {a.service_type}
          {a.estimated_duration ? ` · ${a.estimated_duration}h` : ""}
        </p>
        {a.client_address && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{a.client_address}</span>
          </div>
        )}
      </div>
      <span
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          isPending
            ? "bg-accent/15 text-accent-foreground"
            : a.status === "en_servicio"
              ? "bg-primary/20 text-primary"
              : "bg-secondary/20 text-secondary-foreground"
        )}
      >
        {isPending && <Lock className="h-3 w-3" />}
        {isPending ? "Pendiente" : a.status === "en_servicio" ? "En servicio" : "Confirmado"}
      </span>
    </div>
  );
};

/* ---------- Week view ---------- */
const WeekView = ({
  start,
  apptsByDate,
  onPickDay,
}: {
  start: Date;
  apptsByDate: Map<string, Appointment[]>;
  onPickDay: (d: Date) => void;
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const items = apptsByDate.get(toISODate(d)) || [];
        const today = isToday(d);
        return (
          <button
            key={d.toISOString()}
            onClick={() => onPickDay(d)}
            className={cn(
              "flex flex-col rounded-lg border p-2 text-left transition-colors hover:border-primary/60",
              today ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className={cn("text-[10px] font-semibold uppercase", today ? "text-primary" : "text-muted-foreground")}>
                {format(d, "EEE", { locale: es })}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold",
                  today ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {format(d, "d")}
              </span>
            </div>
            <div className="min-h-[60px] space-y-1">
              {items.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60">—</p>
              ) : (
                items.slice(0, 3).map((a) => (
                  <div
                    key={`${a.kind}-${a.id}`}
                    className={cn(
                      "rounded px-1.5 py-1 text-[10px] leading-tight",
                      a.kind === "pending"
                        ? "border border-dashed border-accent/50 bg-accent/10 text-accent-foreground"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    <p className="font-bold">{a.scheduled_time?.slice(0, 5)}</p>
                    <p className="truncate font-semibold">{a.client_name}</p>
                    <p className="truncate opacity-80">{a.service_type}</p>
                  </div>
                ))
              )}
              {items.length > 3 && (
                <p className="text-[10px] font-semibold text-muted-foreground">+{items.length - 3} más</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

/* ---------- Month view ---------- */
const MonthView = ({
  cursor,
  start,
  end,
  apptsByDate,
  onPickDay,
}: {
  cursor: Date;
  start: Date;
  end: Date;
  apptsByDate: Map<string, Appointment[]>;
  onPickDay: (d: Date) => void;
}) => {
  const days: Date[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  const weekDayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekDayLabels.map((w) => (
          <div key={w} className="text-center text-[10px] font-bold uppercase text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const items = apptsByDate.get(toISODate(day)) || [];
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          const confirmedCount = items.filter((a) => a.kind === "confirmed").length;
          const pendingCount = items.filter((a) => a.kind === "pending").length;
          const total = items.length;
          const hasItems = total > 0;

          // Heat intensity for background
          const heat =
            total === 0 ? "" : total === 1 ? "bg-primary/15" : total === 2 ? "bg-primary/25" : "bg-primary/40";

          return (
            <button
              key={day.toISOString()}
              onClick={() => onPickDay(day)}
              className={cn(
                "relative flex aspect-square min-h-[60px] flex-col items-center justify-between rounded-md border p-1 text-center transition-all hover:border-primary hover:scale-[1.03] hover:shadow-md",
                today
                  ? "border-primary border-2"
                  : hasItems
                    ? "border-primary/40"
                    : "border-border",
                hasItems ? heat : "bg-card",
                !inMonth && "opacity-40"
              )}
            >
              {/* Top: day number + count badge */}
              <div className="flex w-full items-start justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-bold",
                    today
                      ? "bg-primary text-primary-foreground"
                      : hasItems
                        ? "text-primary"
                        : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasItems && (
                  <span
                    className={cn(
                      "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-display text-[10px] font-bold leading-none shadow-sm",
                      confirmedCount > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    )}
                  >
                    {total}
                  </span>
                )}
              </div>

              {/* Bottom: status dots/label */}
              {hasItems && (
                <div className="flex w-full flex-col items-center gap-0.5">
                  <div className="flex items-center gap-0.5">
                    {confirmedCount > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                    {pendingCount > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-[9px] font-semibold leading-none sm:block",
                      confirmedCount > 0 ? "text-primary" : "text-accent-foreground"
                    )}
                  >
                    {total === 1 ? "1 pedido" : `${total} pedidos`}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Confirmados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>Pendientes</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarAgenda;
