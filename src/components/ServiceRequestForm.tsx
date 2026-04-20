import { useState, useEffect } from "react";
import { CalendarDays, Clock, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceRequestFormProps {
  professionalId: string;
  professionalName: string;
  rubro: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const FULL_DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ServiceRequestForm({
  professionalId,
  professionalName,
  rubro,
  open,
  onOpenChange,
}: ServiceRequestFormProps) {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<{ slot_date: string; slot_time: string; slot_status: string }[]>([]);
  const [workStations, setWorkStations] = useState(1);
  const [proServices, setProServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState<{ full_name: string; phone: string; address: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Fetch availability
    supabase
      .from("professional_availability")
      .select("day_of_week, start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("is_active", true)
      .then(({ data }) => setAvailability(data || []));

    // Fetch professional capacity (work_stations) + custom services
    supabase
      .from("professional_profiles")
      .select("work_stations, services")
      .eq("user_id", professionalId)
      .maybeSingle()
      .then(({ data }) => {
        setWorkStations((data as any)?.work_stations || 1);
        setProServices(((data as any)?.services as string[]) || []);
      });

    // Fetch blocked slots for next 30 days (including duration-based blocks)
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    supabase
      .from("blocked_slots")
      .select("slot_date, slot_time, slot_end_time, slot_status")
      .eq("professional_id", professionalId)
      .gte("slot_date", today)
      .lte("slot_date", future)
      .then(({ data }) => setBlockedSlots((data as any) || []));

    // Fetch client profile
    if (user) {
      supabase
        .from("client_profiles")
        .select("full_name, phone, address")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setClientProfile(data));
    }
  }, [open, professionalId, user]);

  // Generate next 14 days of available dates
  const availableDates = (() => {
    const dates: { date: string; label: string; dayOfWeek: number }[] = [];
    const availableDays = new Set(availability.map((a) => a.day_of_week));

    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (availableDays.has(dow)) {
        dates.push({
          date: d.toISOString().split("T")[0],
          label: `${DAYS[dow]} ${d.getDate()}/${d.getMonth() + 1}`,
          dayOfWeek: dow,
        });
      }
      if (dates.length >= 14) break;
    }
    return dates;
  })();

  // Generate time slots for selected date — count occupied stations per slot
  const timeSlots = (() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate + "T00:00:00");
    const dow = d.getDay();
    const dayAvailability = availability.filter((a) => a.day_of_week === dow);

    // Count slots with paid deposit per time (these consume a station)
    const occupiedCount = new Map<string, number>();
    blockedSlots
      .filter((b) => b.slot_date === selectedDate && b.slot_status === "paid")
      .forEach((b) => {
        const key = b.slot_time.slice(0, 5);
        occupiedCount.set(key, (occupiedCount.get(key) || 0) + 1);
      });

    const slots: string[] = [];
    dayAvailability.forEach((slot) => {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      let h = startH, m = startM;
      while (h < endH || (h === endH && m < endM)) {
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        // Slot is available if occupied count < total work stations
        if ((occupiedCount.get(timeStr) || 0) < workStations) {
          slots.push(timeStr);
        }
        m += 60; // 1 hour slots
        if (m >= 60) { h++; m = 0; }
      }
    });
    return slots;
  })();

  const handleSubmit = async () => {
    if (!user) { toast.error("Debés iniciar sesión"); return; }
    if (!selectedDate || !selectedTime) { toast.error("Seleccioná día y hora"); return; }
    if (!serviceType) { toast.error("Seleccioná un tipo de servicio"); return; }

    setLoading(true);
    const { error } = await supabase.from("service_requests").insert({
      professional_id: professionalId,
      client_user_id: user.id,
      client_name: clientProfile?.full_name || user.email?.split("@")[0] || "Cliente",
      client_phone: clientProfile?.phone || null,
      client_address: clientProfile?.address || null,
      service_type: serviceType,
      description: description.trim(),
      scheduled_date: selectedDate,
      scheduled_time: selectedTime + ":00",
      status: "nueva",
    });
    setLoading(false);

    if (error) {
      console.error(error);
      toast.error("Error al enviar la solicitud");
      return;
    }

    // Notification is handled automatically by DB trigger

    toast.success("¡Solicitud enviada! El profesional te responderá pronto.");
    onOpenChange(false);
    setDescription("");
    setSelectedDate("");
    setSelectedTime("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Solicitar Servicio
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Profesional: <span className="font-semibold text-foreground">{professionalName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tipo de servicio</label>
            <Select value={serviceType} onValueChange={setServiceType} disabled={proServices.length === 0}>
              <SelectTrigger className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Seleccioná un servicio..." />
              </SelectTrigger>
              <SelectContent>
                {proServices.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No hay servicios configurados
                  </SelectItem>
                ) : (
                  proServices.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar - Day selection */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              <CalendarDays className="inline h-3 w-3 mr-1" />
              Elegí un día
            </label>
            {availableDates.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3 text-center">
                Este profesional no tiene horarios configurados aún.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => { setSelectedDate(d.date); setSelectedTime(""); }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      selectedDate === d.date
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-card-foreground hover:border-primary/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time selection */}
          {selectedDate && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Elegí un horario
              </label>
              {timeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3 text-center">
                  No hay horarios disponibles para este día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        selectedTime === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-card-foreground hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Comentarios adicionales (Opcional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aclaraciones sobre el estado del vehículo, manchas específicas, etc."
              rows={4}
              maxLength={1000}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{description.length}/1000</p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedDate || !selectedTime || !serviceType}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitud de servicio
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            El profesional recibirá tu solicitud y te enviará un presupuesto. Estado inicial: "Pendiente de Aprobación".
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
