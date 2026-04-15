import { useEffect, useState } from "react";
import { Clock, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ScheduledRequest {
  id: string;
  scheduled_time: string;
  scheduled_date: string;
  client_name: string;
  service_type: string;
  client_address: string;
  status: string;
}

const DayAgenda = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ScheduledRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const dayName = today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    if (!user) return;
    const fetchAppointments = async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("id, scheduled_time, scheduled_date, client_name, service_type, client_address, status")
        .eq("professional_id", user.id)
        .eq("scheduled_date", todayISO)
        .in("status", ["aceptada", "en_servicio"])
        .order("scheduled_time", { ascending: true });
      setAppointments(data || []);
      setLoading(false);
    };
    fetchAppointments();

    const channel = supabase
      .channel("agenda-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, todayISO]);

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
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No tenés turnos agendados para hoy</p>
          </div>
        ) : (
          appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
                {apt.scheduled_time?.slice(0, 5) || "--:--"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{apt.client_name}</p>
                <p className="text-xs text-muted-foreground">{apt.service_type}</p>
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
                {apt.status === "en_servicio" ? "En servicio" : "Agendado"}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default DayAgenda;
