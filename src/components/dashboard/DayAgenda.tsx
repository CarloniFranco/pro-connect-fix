import { useEffect, useState } from "react";
import { Clock, MapPin, CalendarDays, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduledRequest {
  id: string;
  scheduled_time: string;
  scheduled_date: string;
  client_name: string;
  service_type: string;
  client_address: string;
  status: string;
  estimated_duration: number | null;
}

interface BlockedSlot {
  id: string;
  slot_time: string;
  slot_end_time: string | null;
  slot_status: string;
  service_request_id: string | null;
}

interface BlockedSlotWithDetails extends BlockedSlot {
  client_name?: string;
  service_type?: string;
}

const DayAgenda = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ScheduledRequest[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const dayName = today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch confirmed appointments
      const { data: appts } = await supabase
        .from("service_requests")
        .select("id, scheduled_time, scheduled_date, client_name, service_type, client_address, status, estimated_duration")
        .eq("professional_id", user.id)
        .eq("scheduled_date", todayISO)
        .in("status", ["aceptada", "en_servicio"])
        .order("scheduled_time", { ascending: true });
      setAppointments((appts as any) || []);

      // Fetch blocked slots for today (pending quotes)
      const { data: blocks } = await supabase
        .from("blocked_slots")
        .select("id, slot_time, slot_end_time, slot_status, service_request_id")
        .eq("professional_id", user.id)
        .eq("slot_date", todayISO);

      // Enrich blocked slots with service request info
      const enrichedBlocks: BlockedSlotWithDetails[] = [];
      if (blocks && blocks.length > 0) {
        // Get unique service request IDs
        const srIds = [...new Set((blocks as any[]).filter(b => b.service_request_id).map(b => b.service_request_id))];
        let srMap: Record<string, { client_name: string; service_type: string }> = {};
        if (srIds.length > 0) {
          const { data: srs } = await supabase
            .from("service_requests")
            .select("id, client_name, service_type")
            .in("id", srIds);
          if (srs) {
            srs.forEach((sr: any) => { srMap[sr.id] = sr; });
          }
        }
        (blocks as any[]).forEach(b => {
          const sr = b.service_request_id ? srMap[b.service_request_id] : undefined;
          enrichedBlocks.push({
            ...b,
            client_name: sr?.client_name,
            service_type: sr?.service_type,
          });
        });
      }
      setBlockedSlots(enrichedBlocks);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("agenda-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_slots", filter: `professional_id=eq.${user.id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, todayISO]);

  // Deduplicate: group blocked slots by service_request_id to show one bar per job
  const groupedBlocks = blockedSlots
    .filter(b => b.slot_status === "pending")
    .reduce((acc, slot) => {
      const key = slot.service_request_id || slot.id;
      if (!acc[key]) {
        acc[key] = { ...slot, slots: [slot] };
      } else {
        acc[key].slots.push(slot);
      }
      return acc;
    }, {} as Record<string, BlockedSlotWithDetails & { slots: BlockedSlotWithDetails[] }>);

  const pendingBlocks = Object.values(groupedBlocks).map(group => {
    const times = group.slots.map(s => s.slot_time).sort();
    const endTimes = group.slots.map(s => s.slot_end_time || s.slot_time).sort();
    const startTime = times[0]?.slice(0, 5) || "--:--";
    const endTime = endTimes[endTimes.length - 1]?.slice(0, 5) || "--:--";
    const durationSlots = group.slots.length;
    return {
      ...group,
      startTime,
      endTime,
      durationLabel: `${durationSlots}h`,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <CalendarDays className="h-5 w-5 text-primary" />
          Agenda del Día
        </CardTitle>
        <p className="text-sm capitalize text-muted-foreground">{dayName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 && pendingBlocks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No tenés turnos agendados para hoy</p>
          </div>
        ) : (
          <>
            {/* Confirmed appointments */}
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
                  {apt.scheduled_time?.slice(0, 5) || "--:--"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{apt.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {apt.service_type}
                    {apt.estimated_duration && ` · ${apt.estimated_duration}h`}
                  </p>
                  {apt.client_address && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{apt.client_address}</span>
                    </div>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  apt.status === "en_servicio"
                    ? "bg-primary/20 text-primary"
                    : "bg-accent/20 text-accent-foreground"
                }`}>
                  {apt.status === "en_servicio" ? "En servicio" : "Confirmado"}
                </span>
              </div>
            ))}

            {/* Pending blocked slots */}
            {pendingBlocks.map((block) => (
              <div
                key={block.service_request_id || block.id}
                className="flex items-start gap-3 rounded-lg border border-dashed border-accent/60 bg-accent/5 p-3"
              >
                <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-accent/20 font-display text-sm font-bold text-accent-foreground">
                  {block.startTime}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {block.client_name || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {block.service_type || "Servicio"} · {block.durationLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {block.startTime} — {block.endTime}
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  <Lock className="h-3 w-3" />
                  Pendiente
                </span>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DayAgenda;
